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
      baseUrl: "https://api.qloo.com/v1",
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
      const paramName = `/${stage}/qloo/api-key`;

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
   * Make a request to the Qloo API with retry logic
   * @param endpoint API endpoint
   * @param data Request data
   * @returns Response data
   */
  private async makeRequest<T>(endpoint: string, data: any): Promise<T> {
    try {
      const response = await this.client.post<T>(endpoint, data);
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
