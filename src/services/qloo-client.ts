/**
 * Qloo API Client for interacting with Qloo's Taste AI API
 * Provides methods for taste profile analysis and recommendations
 */

import axios, { AxiosInstance } from "axios";
import { SSM } from "aws-sdk";
import { MenuItem } from "../models/database";

/**
 * Qloo API client configuration
 */
export interface QlooClientConfig {
  apiKey?: string;
  baseUrl?: string;
  maxRetries?: number;
  timeout?: number;
  rateLimitPerSecond?: number;
}

/**
 * Taste profile request parameters
 */
export interface TasteProfileRequest {
  menuItem: MenuItem;
  includeIngredients?: boolean;
  includeDietaryTags?: boolean;
  mappedData?: any; // Mapped menu item data in Qloo-friendly format
}

/**
 * Taste profile response
 */
export interface TasteProfile {
  itemId: string;
  restaurantId: string;
  tasteAttributes: {
    [key: string]: number; // e.g., "savory": 0.85, "spicy": 0.4
  };
  dietaryCompatibility?: {
    [key: string]: number; // e.g., "vegan": 1.0, "glutenFree": 0.0
  };
  appealFactors?: {
    [key: string]: number; // e.g., "novelty": 0.7, "comfort": 0.9
  };
  demographicAppeal?: {
    [key: string]: number; // e.g., "youngAdults": 0.8, "families": 0.5
  };
  pairings?: string[];
  analysisDate: string;
}

/**
 * Trending items request parameters
 */
export interface TrendingItemsRequest {
  cuisine: string;
  location?: string;
  limit?: number;
}

/**
 * Trending item response
 */
export interface TrendingItem {
  name: string;
  cuisine: string;
  popularity: number;
  tasteProfile: {
    [key: string]: number;
  };
  dietaryTags: string[];
  ingredients?: string[];
}

/**
 * Restaurant search request parameters
 */
export interface RestaurantSearchRequest {
  query: string;
  city: string;
  state: string;
  radius?: number;
  page?: number;
  limit?: number;
}

/**
 * Restaurant search result
 */
export interface QlooSearchResult {
  name: string;
  entity_id: string;
  address: string;
  price_level: number;
  tags: QlooTag[];
}

export interface QlooTag {
  name: string;
  tag_id: string;
  type: string;
  value: string;
}

/**
 * Similar restaurant search request parameters
 */
export interface SimilarRestaurantSearchRequest {
  entityId: string;
  minRating?: number;
  radius?: number;
  limit?: number;
}

/**
 * Similar restaurant data
 */
export interface SimilarRestaurant {
  name: string;
  entityId: string;
  address: string;
  businessRating: number;
  priceLevel: number;
  specialtyDishes: string[];
  keywords: KeywordData[];
}

export interface SpecialtyDish {
  dishName: string;
  tagId: string; // urn:tag:specialty_dish:place:*
  restaurantCount: number;
  popularity: number;
}

export interface KeywordData {
  name: string;
  count: number;
}

/**
 * Demographics request parameters
 */
export interface DemographicsRequest {
  entityId: string;
}

/**
 * Demographics data response
 */
export interface DemographicsData {
  ageGroups: AgeGroupData[];
  interests: string[];
  diningPatterns: DiningPattern[];
  retrievedAt: string;
}

export interface AgeGroupData {
  ageRange: string;
  percentage: number;
  preferences: string[];
}

export interface DiningPattern {
  pattern: string;
  frequency: number;
  timeOfDay: string[];
}

/**
 * Qloo API Client for interacting with Qloo's Taste AI API
 */
export class QlooClient {
  private config: QlooClientConfig;
  private client: AxiosInstance;
  private retryCount: number = 0;
  private ssm: SSM;
  private apiKey: string | null = null;
  private lastRequestTime: number = 0;
  private requestQueue: Array<() => Promise<any>> = [];
  private processingQueue: boolean = false;

  /**
   * Create a new Qloo API client
   * @param config Client configuration
   */
  constructor(config: QlooClientConfig = {}) {
    // Set default configuration values
    this.config = {
      baseUrl: "https://hackathon.api.qloo.com",
      maxRetries: 3,
      timeout: 30000, // 30 seconds
      rateLimitPerSecond: 5, // Maximum 5 requests per second
      ...config,
    };

    // Initialize SSM client for retrieving API key
    this.ssm = new SSM({
      region: process.env.REGION || "us-east-1",
    });

    // Create axios client
    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
    });

    // Add request interceptor to handle authentication
    this.client.interceptors.request.use(async (config) => {
      // Ensure we have an API key
      if (!this.apiKey && !this.config.apiKey) {
        await this.loadApiKey();
      }

      // Set authentication header
      config.headers["Authorization"] = `Bearer ${
        this.apiKey || this.config.apiKey
      }`;
      config.headers["Content-Type"] = "application/json";

      return config;
    });
  }

  /**
   * Load API key from AWS Parameter Store
   * @returns API key
   */
  private async loadApiKey(): Promise<string> {
    try {
      const stage = process.env.STAGE || "dev";
      const paramName = `${stage}/qloo/api-key`;

      const response = await this.ssm
        .getParameter({
          Name: paramName,
          WithDecryption: true,
        })
        .promise();

      if (response.Parameter?.Value) {
        this.apiKey = response.Parameter.Value;
        return this.apiKey;
      } else {
        throw new Error("API key not found in Parameter Store");
      }
    } catch (error: any) {
      console.error("Failed to load Qloo API key:", error.message);
      throw new Error("Failed to load Qloo API key");
    }
  }

  /**
   * Queue a request to respect rate limits
   * @param requestFn Function that makes the actual request
   * @returns Promise that resolves with the request result
   */
  private async queueRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      // Add request to queue
      this.requestQueue.push(async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      // Process queue if not already processing
      if (!this.processingQueue) {
        this.processQueue();
      }
    });
  }

  /**
   * Process the request queue with rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.requestQueue.length === 0) {
      this.processingQueue = false;
      return;
    }

    this.processingQueue = true;

    // Calculate time to wait for rate limiting
    const now = Date.now();
    const timeToWait = Math.max(
      0,
      1000 / (this.config.rateLimitPerSecond || 5) -
        (now - this.lastRequestTime)
    );

    // Wait if needed
    if (timeToWait > 0) {
      await new Promise((resolve) => setTimeout(resolve, timeToWait));
    }

    // Execute next request
    const nextRequest = this.requestQueue.shift();
    if (nextRequest) {
      this.lastRequestTime = Date.now();
      try {
        await nextRequest();
      } catch (error) {
        console.error("Error processing queued request:", error);
      }
    }

    // Continue processing queue
    setImmediate(() => this.processQueue());
  }

  /**
   * Analyze taste profile for a menu item
   * @param request Taste profile request
   * @returns Taste profile
   */
  async analyzeTasteProfile(
    request: TasteProfileRequest
  ): Promise<TasteProfile> {
    return this.queueRequest(async () => {
      try {
        // Use mappedData if provided, otherwise format the request data
        const requestData = request.mappedData || {
          name: request.menuItem.name,
          description: request.menuItem.description,
          ingredients: request.includeIngredients
            ? request.menuItem.ingredients
            : undefined,
          dietaryTags: request.includeDietaryTags
            ? request.menuItem.dietaryTags
            : undefined,
          category: request.menuItem.category,
          price: request.menuItem.price,
        };

        // Make API request
        const response = await this.makeRequest<TasteProfile>(
          "/taste-profiles/analyze",
          requestData
        );

        // Format response
        return {
          itemId: request.menuItem.itemId,
          restaurantId: request.menuItem.restaurantId,
          tasteAttributes: response.tasteAttributes || {},
          dietaryCompatibility: response.dietaryCompatibility,
          appealFactors: response.appealFactors,
          demographicAppeal: response.demographicAppeal,
          pairings: response.pairings,
          analysisDate: new Date().toISOString(),
        };
      } catch (error: any) {
        console.error(
          "Taste profile analysis error:",
          error.response?.data || error.message
        );
        throw new Error(`Taste profile analysis failed: ${error.message}`);
      }
    });
  }

  /**
   * Get trending items based on cuisine and location
   * @param request Trending items request
   * @returns Array of trending items
   */
  async getTrendingItems(
    request: TrendingItemsRequest
  ): Promise<TrendingItem[]> {
    return this.queueRequest(async () => {
      try {
        // Make API request
        const response = await this.makeRequest<TrendingItem[]>(
          "/trends/items",
          request
        );
        return response;
      } catch (error: any) {
        console.error(
          "Trending items error:",
          error.response?.data || error.message
        );
        throw new Error(`Failed to get trending items: ${error.message}`);
      }
    });
  }

  /**
   * Predict popularity of a menu item
   * @param menuItem Menu item
   * @param location Location for context
   * @returns Popularity score (0-1)
   */
  async predictPopularity(
    menuItem: MenuItem,
    location?: string
  ): Promise<number> {
    return this.queueRequest(async () => {
      try {
        // Format request data
        const requestData = {
          name: menuItem.name,
          description: menuItem.description,
          ingredients: menuItem.ingredients,
          dietaryTags: menuItem.dietaryTags,
          category: menuItem.category,
          price: menuItem.price,
          location,
        };

        // Make API request
        const response = await this.makeRequest<{ score: number }>(
          "/predictions/popularity",
          requestData
        );
        return response.score;
      } catch (error: any) {
        console.error(
          "Popularity prediction error:",
          error.response?.data || error.message
        );
        throw new Error(`Failed to predict popularity: ${error.message}`);
      }
    });
  }

  /**
   * Search for restaurants using Qloo API
   * @param request Restaurant search request
   * @returns Array of restaurant search results
   */
  async searchRestaurants(
    request: RestaurantSearchRequest
  ): Promise<QlooSearchResult[]> {
    return this.queueRequest(async () => {
      try {
        // Build query parameters according to requirements format:
        // {{qloo-url}}/search?query={{restaurantName}}&filter.radius=10&operator.filter.tags=union&page=1&sort_by=match&filter.location={{restaurant city, restaurant state}}
        const params = new URLSearchParams({
          query: request.query,
          "filter.radius": (request.radius || 10).toString(),
          "operator.filter.tags": "union",
          page: (request.page || 1).toString(),
          sort_by: "match",
          "filter.location": `${request.city}, ${request.state}`,
        });

        // Make GET request with query parameters
        const response = await this.client.get<{ results: QlooSearchResult[] }>(
          `/search?${params.toString()}`
        );

        // Return up to 10 results as per requirements
        const results = response.data.results || [];
        return results.slice(0, request.limit || 10);
      } catch (error: any) {
        console.error(
          "Restaurant search error:",
          error.response?.data || error.message
        );
        throw new Error(`Restaurant search failed: ${error.message}`);
      }
    });
  }

  /**
   * Search for similar restaurants based on entity ID
   * @param request Similar restaurant search request
   * @returns Similar restaurant data with specialty dishes
   */
  async searchSimilarRestaurants(
    request: SimilarRestaurantSearchRequest
  ): Promise<{
    restaurants: SimilarRestaurant[];
    specialtyDishes: SpecialtyDish[];
  }> {
    return this.queueRequest(async () => {
      try {
        // Build query parameters for similar restaurant search
        const params = new URLSearchParams({
          "signal.interests.entities": request.entityId,
          "filter.radius": (request.radius || 10).toString(),
          limit: (request.limit || 20).toString(),
        });

        // Add minimum rating filter if provided
        if (request.minRating) {
          params.append(
            "filter.business_rating.min",
            request.minRating.toString()
          );
        }

        // Make GET request to find similar restaurants
        const response = await this.client.get<{
          results: any[];
          specialty_dishes?: any[];
        }>(`/similar?${params.toString()}`);

        const results = response.data.results || [];
        const specialtyDishesData = response.data.specialty_dishes || [];

        // Process similar restaurants
        const restaurants: SimilarRestaurant[] = results.map((result: any) => ({
          name: result.name || "",
          entityId: result.entity_id || "",
          address: result.address || "",
          businessRating: result.business_rating || 0,
          priceLevel: result.price_level || 0,
          specialtyDishes: this.extractSpecialtyDishTags(result.tags || []),
          keywords: result.keywords || [],
        }));

        // Process specialty dishes from API response
        const specialtyDishes: SpecialtyDish[] = specialtyDishesData
          .filter(
            (dish: any) =>
              dish.tag_id &&
              dish.tag_id.includes("urn:tag:specialty_dish:place")
          )
          .map((dish: any) => ({
            dishName: dish.name || "",
            tagId: dish.tag_id || "",
            restaurantCount: dish.restaurant_count || 0,
            popularity: dish.popularity || 0,
          }));

        return {
          restaurants,
          specialtyDishes,
        };
      } catch (error: any) {
        console.error(
          "Similar restaurant search error:",
          error.response?.data || error.message
        );
        throw new Error(`Similar restaurant search failed: ${error.message}`);
      }
    });
  }

  /**
   * Get demographics data for a restaurant entity
   * @param request Demographics request
   * @returns Demographics data
   */
  async getDemographics(
    request: DemographicsRequest
  ): Promise<DemographicsData> {
    return this.queueRequest(async () => {
      try {
        // Build query parameters according to requirements format:
        // {{qloo-url}}/v2/insights?filter.type=urn:demographics&signal.interests.entities={{entityId}}
        const params = new URLSearchParams({
          "filter.type": "urn:demographics",
          "signal.interests.entities": request.entityId,
        });

        // Make GET request to v2/insights endpoint
        const response = await this.client.get<{
          demographics?: {
            age_groups?: any[];
            interests?: string[];
            dining_patterns?: any[];
          };
        }>(`/v2/insights?${params.toString()}`);

        const demographicsData = response.data.demographics || {};

        // Process age groups
        const ageGroups: AgeGroupData[] = (
          demographicsData.age_groups || []
        ).map((group: any) => ({
          ageRange: group.age_range || "",
          percentage: group.percentage || 0,
          preferences: group.preferences || [],
        }));

        // Process dining patterns
        const diningPatterns: DiningPattern[] = (
          demographicsData.dining_patterns || []
        ).map((pattern: any) => ({
          pattern: pattern.pattern || "",
          frequency: pattern.frequency || 0,
          timeOfDay: pattern.time_of_day || [],
        }));

        return {
          ageGroups,
          interests: demographicsData.interests || [],
          diningPatterns,
          retrievedAt: new Date().toISOString(),
        };
      } catch (error: any) {
        console.error(
          "Demographics data error:",
          error.response?.data || error.message
        );
        throw new Error(`Demographics data retrieval failed: ${error.message}`);
      }
    });
  }

  /**
   * Extract specialty dish tags from restaurant tags
   * @param tags Array of tags from restaurant data
   * @returns Array of specialty dish tag IDs
   */
  private extractSpecialtyDishTags(tags: QlooTag[]): string[] {
    return tags
      .filter(
        (tag) =>
          tag.tag_id && tag.tag_id.includes("urn:tag:specialty_dish:place")
      )
      .map((tag) => tag.tag_id);
  }

  /**
   * Make a request to the Qloo API with retry logic
   * @param endpoint API endpoint
   * @param data Request data (optional for GET requests)
   * @returns Response data
   */
  private async makeRequest<T>(endpoint: string, data?: any): Promise<T> {
    try {
      const response = data
        ? await this.client.post<T>(endpoint, data)
        : await this.client.get<T>(endpoint);

      // Reset retry count on success
      this.retryCount = 0;
      return response.data;
    } catch (error: any) {
      console.error("Qloo API error:", error.response?.data || error.message);

      // Retry on rate limit or server errors
      if (
        this.retryCount < (this.config.maxRetries || 3) &&
        (error.response?.status === 429 || error.response?.status >= 500)
      ) {
        this.retryCount++;
        const delay = Math.pow(2, this.retryCount) * 1000; // Exponential backoff
        console.log(
          `Retrying Qloo API request in ${delay}ms (attempt ${this.retryCount})`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.makeRequest<T>(endpoint, data);
      }

      // Reset retry count
      this.retryCount = 0;
      throw error;
    }
  }
}
