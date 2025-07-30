/**
 * Lambda function for searching similar restaurants
 * Extracts specialty dish tags from API response and stores similar restaurant data
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import axios from "axios";
import { SSM } from "aws-sdk";
import { SimilarRestaurantDataRepository } from "../../repositories/similar-restaurant-data-repository";
import { RestaurantRepository } from "../../repositories/restaurant-repository";
import {
  SimilarRestaurantData,
  SimilarRestaurant,
  SpecialtyDish,
  KeywordData,
  QlooSearchResult,
} from "../../models/database";
import { createResponse } from "../../models/api";

/**
 * Request body interface for similar restaurant search
 */
interface SearchSimilarRestaurantsRequest {
  entityId: string;
  minRating?: number;
}

/**
 * Qloo API response interface
 */
interface QlooApiResponse {
  results: {
    entities: [];
  };
}

/**
 * Response interface for similar restaurant search
 */
interface SearchSimilarRestaurantsResponse {
  success: boolean;
  restaurants?: QlooSearchResult[];
  message?: string;
  totalResults?: number;
}

/**
 * Lambda handler for searching similar restaurants
 * @param event API Gateway event
 * @returns API Gateway response
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  // Handle OPTIONS request for CORS
  if (event.httpMethod === "OPTIONS") {
    return createResponse(200, {});
  }

  console.log(
    "Search similar restaurants request:",
    JSON.stringify(event, null, 2)
  );

  try {
    // Parse request body
    if (!event.body) {
      return createResponse(400, {
        success: false,
        message: "Request body is required",
      });
    }

    const requestBody: SearchSimilarRestaurantsRequest = JSON.parse(event.body);

    // Get restaurantId from path parameters
    const restaurantId = event.pathParameters?.restaurantId;
    if (!restaurantId) {
      return createResponse(400, {
        success: false,
        message: "Restaurant ID is required in path",
      });
    }

    // Validate required fields
    if (!requestBody.entityId) {
      return createResponse(400, {
        success: false,
        message: "Entity ID is required",
      });
    }

    // Initialize repositories
    const similarRestaurantRepository = new SimilarRestaurantDataRepository();
    const restaurantRepository = new RestaurantRepository();

    // Verify restaurant exists
    const restaurant = await restaurantRepository.getById(restaurantId);
    if (!restaurant) {
      return createResponse(404, {
        success: false,
        message: "Restaurant not found",
      });
    }

    console.log(`resturant ${restaurant}`);

    // Get Qloo API key
    const apiKey = await getQlooApiKey();

    // Search for similar restaurants using Qloo API
    const similarRestaurants = await searchSimilarRestaurantsFromQloo(
      requestBody.entityId,
      apiKey,
      requestBody.minRating || 3.0,
      restaurant.cuisine,
      `${restaurant.city}, ${restaurant.state}`
    );

    // Extract specialty dishes from similar restaurants
    const specialtyDishes = extractSpecialtyDishes(similarRestaurants);

    // Create similar restaurant data object
    const similarRestaurantData: SimilarRestaurantData = {
      restaurantId: restaurantId,
      qlooEntityId: requestBody.entityId,
      similarRestaurants: similarRestaurants.map(formatSimilarRestaurant),
      specialtyDishes,
      minRatingFilter: requestBody.minRating || 3.0,
      retrievedAt: new Date().toISOString(),
    };

    // Store similar restaurant data
    const savedData = await similarRestaurantRepository.createOrUpdate(
      similarRestaurantData
    );

    console.log("Similar restaurant data saved:", savedData);

    const response: SearchSimilarRestaurantsResponse = {
      success: true,
      restaurants: similarRestaurants,
      totalResults: similarRestaurants.length,
      message: `Found ${similarRestaurants.length} similar restaurants with ${specialtyDishes.length} specialty dishes`,
    };
    return createResponse(200, response);
  } catch (error: any) {
    console.error("Error searching similar restaurants:", error);

    // Handle specific error types
    let statusCode = 500;
    let message = "Internal server error";

    if (error.response) {
      // Qloo API error
      statusCode = error.response.status;
      message = `Qloo API error: ${
        error.response.data?.message || error.response.statusText
      }`;
      console.error("Qloo API error response:", error.response.data);
    } else if (error.code === "ECONNABORTED") {
      // Timeout error
      statusCode = 408;
      message = "Request timeout - Qloo API did not respond in time";
    } else if (error.message.includes("API key")) {
      // API key error
      statusCode = 401;
      message = "Failed to authenticate with Qloo API";
    }

    return createResponse(statusCode, {
      success: false,
      message,
      error: error.message,
    });
  }
};

/**
 * Search for similar restaurants using Qloo API
 * @param entityId Qloo entity ID of the restaurant
 * @param apiKey Qloo API key
 * @param minRating Minimum TripAdvisor rating filter
 * @returns Array of similar restaurants
 */
async function searchSimilarRestaurantsFromQloo(
  entityId: string,
  apiKey: string,
  minRating: number,
  cuisine: string,
  location: string
): Promise<QlooSearchResult[]> {
  const qlooBaseUrl =
    process.env.QLOO_API_URL || "https://hackathon.api.qloo.com";

  // Construct similar restaurants search URL
  const searchUrl = `${qlooBaseUrl}/v2/insights`;
  const searchParams = new URLSearchParams({
    "filter.type": "urn:entity:place",
    "filter.location.query": location,
    "filter.tags": `urn:tag:genre:place:restaurant:${cuisine}`,
    "signal.interests.entities": entityId,
    count: "10",
    "filter.external.tripadvisor.rating.min": minRating.toString(),
  });

  const fullUrl = `${searchUrl}?${searchParams.toString()}`;

  console.log("Making Qloo similar restaurants API request to:", fullUrl);

  const response = await axios.get<QlooApiResponse>(fullUrl, {
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    timeout: 30000, // 30 seconds timeout
  });

  console.log(
    "Qloo similar restaurants API response:",
    JSON.stringify(response.data, null, 2)
  );

  const restaurants = response.data.results.entities || [];

  const formattedRestaurants: QlooSearchResult[] = restaurants.map(
    (restaurant: any) => ({
      name: restaurant.name || "",
      entityId: restaurant.entity_id || restaurant.id || "",
      description: restaurant.properties.description,
      address: restaurant.properties?.address || "",
      priceLevel: restaurant.properties?.price_level || 0,
      cuisine: extractCuisineFromTags(restaurant.tags || []),
      popularity: restaurant.popularity,
      specialtyDishes: restaurant.properties?.specialty_dishes || [],
      businessRating: restaurant.properties?.business_rating || 0,
    })
  );

  return formattedRestaurants;
}

/**
 * Extract cuisine name from Qloo tags array
 * Looks for tags with type "urn:tag:genre" and tag_id starting with "urn:tag:genre:restaurant:"
 * @param tags Array of Qloo tags
 * @returns Cuisine name or empty string if not found
 */
function extractCuisineFromTags(tags: any[]): string {
  if (!tags || !Array.isArray(tags)) {
    return "";
  }

  const cuisineTag = tags.find(
    (tag) =>
      tag.type === "urn:tag:genre" &&
      tag.tag_id &&
      tag.tag_id.startsWith("urn:tag:genre:restaurant:")
  );

  return cuisineTag?.name || "";
}

/**
 * Extract specialty dish tags from similar restaurants
 * @param similarRestaurants Array of similar restaurants
 * @returns Array of specialty dishes
 */
function extractSpecialtyDishes(
  similarRestaurants: QlooSearchResult[]
): SpecialtyDish[] {
  const specialtyDishMap = new Map<string, SpecialtyDish>();

  similarRestaurants.forEach((restaurant) => {
    if (
      restaurant.specialtyDishes &&
      Array.isArray(restaurant.specialtyDishes)
    ) {
      restaurant.specialtyDishes.forEach((dishTag) => {
        // Use the actual tag_id from the API response if available, otherwise create one
        const tagId =
          dishTag.tag_id ||
          `urn:tag:specialty_dish:place:${dishTag.name
            .toLowerCase()
            .replace(/\s+/g, "_")}`;

        // Get the weight from the API response, handle NaN values properly
        let weight = dishTag.weight;
        if (weight === undefined || weight === null || isNaN(weight)) {
          weight = 1; // Default to 1 if weight is missing or NaN
        }

        if (specialtyDishMap.has(tagId)) {
          // Increment count and add weight for existing dish
          const existingDish = specialtyDishMap.get(tagId)!;
          existingDish.restaurantCount += 1;
          existingDish.popularity += 1;
          existingDish.totalWeight = (existingDish.totalWeight || 0) + weight;
          // Recalculate average weight
          existingDish.weight =
            existingDish.totalWeight / existingDish.restaurantCount;
        } else {
          // Add new specialty dish
          specialtyDishMap.set(tagId, {
            dishName: dishTag.name,
            tagId,
            restaurantCount: 1,
            popularity: 1,
            weight: weight,
            totalWeight: weight,
          });
        }
      });
    }
  });

  // Convert map to array and sort by popularity and weight
  return Array.from(specialtyDishMap.values()).sort((a, b) => {
    // Primary sort by popularity, secondary sort by weight
    if (b.popularity !== a.popularity) {
      return b.popularity - a.popularity;
    }
    return (b.weight || 0) - (a.weight || 0);
  });
}

/**
 * Format similar restaurant data for storage
 * @param restaurant Qloo search result
 * @returns Formatted similar restaurant
 */
function formatSimilarRestaurant(
  restaurant: QlooSearchResult
): SimilarRestaurant {
  // Create empty keywords array since QlooSearchResult doesn't have keywords
  const keywords: KeywordData[] = [];

  return {
    name: restaurant.name,
    entityId: restaurant.entityId,
    address: restaurant.address || "",
    businessRating: restaurant.businessRating || 0,
    priceLevel: restaurant.priceLevel || 0,
    specialtyDishes: extractSpecialtyDishes([restaurant]),
    keywords,
    popularity: restaurant.popularity,
  };
}

/**
 * Get Qloo API key from AWS Parameter Store
 * @returns Qloo API key
 */
async function getQlooApiKey(): Promise<string> {
  try {
    if (process.env.STAGE == "local" && process.env.QLOO_API_KEY) {
      return process.env.QLOO_API_KEY;
    }

    const ssm = new SSM({
      region: process.env.REGION || "us-east-1",
    });

    const stage = process.env.STAGE || "dev";
    const paramName = `/${stage}/qloo/api-key`;

    const response = await ssm
      .getParameter({
        Name: paramName,
        WithDecryption: true,
      })
      .promise();

    if (response.Parameter?.Value) {
      return response.Parameter.Value;
    } else {
      throw new Error("Qloo API key not found in Parameter Store");
    }
  } catch (error: any) {
    console.error("Failed to load Qloo API key:", error.message);
    throw new Error("Failed to load Qloo API key");
  }
}
