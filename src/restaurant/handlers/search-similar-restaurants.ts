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
} from "../../models/database";

/**
 * Request body interface for similar restaurant search
 */
interface SearchSimilarRestaurantsRequest {
  restaurantId: string;
  qlooEntityId: string;
  minRating?: number;
}

/**
 * Response interface for similar restaurant search
 */
interface SearchSimilarRestaurantsResponse {
  success: boolean;
  data?: SimilarRestaurantData;
  message?: string;
}

/**
 * Qloo similar restaurants API response interface
 */
interface QlooSimilarRestaurantsResponse {
  data: QlooSimilarRestaurant[];
  meta?: {
    total: number;
    page: number;
    per_page: number;
  };
}

/**
 * Qloo similar restaurant interface
 */
interface QlooSimilarRestaurant {
  name: string;
  entity_id: string;
  address?: string;
  business_rating?: number;
  price_level?: number;
  tags?: QlooTag[];
  keywords?: QlooKeyword[];
}

/**
 * Qloo tag interface
 */
interface QlooTag {
  name: string;
  tag_id: string;
  type: string;
  value?: string;
}

/**
 * Qloo keyword interface
 */
interface QlooKeyword {
  name: string;
  count: number;
}

/**
 * Lambda handler for searching similar restaurants
 * @param event API Gateway event
 * @returns API Gateway response
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log(
    "Search similar restaurants request:",
    JSON.stringify(event, null, 2)
  );

  try {
    // Parse request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type,Authorization",
          "Access-Control-Allow-Methods": "POST,OPTIONS",
        },
        body: JSON.stringify({
          success: false,
          message: "Request body is required",
        }),
      };
    }

    const requestBody: SearchSimilarRestaurantsRequest = JSON.parse(event.body);

    // Validate required fields
    if (!requestBody.restaurantId || !requestBody.qlooEntityId) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type,Authorization",
          "Access-Control-Allow-Methods": "POST,OPTIONS",
        },
        body: JSON.stringify({
          success: false,
          message: "Restaurant ID and Qloo entity ID are required",
        }),
      };
    }

    // Initialize repositories
    const similarRestaurantRepository = new SimilarRestaurantDataRepository();
    const restaurantRepository = new RestaurantRepository();

    // Verify restaurant exists
    const restaurant = await restaurantRepository.getById(
      requestBody.restaurantId
    );
    if (!restaurant) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type,Authorization",
          "Access-Control-Allow-Methods": "POST,OPTIONS",
        },
        body: JSON.stringify({
          success: false,
          message: "Restaurant not found",
        }),
      };
    }

    // Get Qloo API key
    const apiKey = await getQlooApiKey();

    // Search for similar restaurants using Qloo API
    const similarRestaurants = await searchSimilarRestaurantsFromQloo(
      requestBody.qlooEntityId,
      apiKey,
      requestBody.minRating || 3.0
    );

    // Extract specialty dishes from similar restaurants
    const specialtyDishes = extractSpecialtyDishes(similarRestaurants);

    // Create similar restaurant data object
    const similarRestaurantData: SimilarRestaurantData = {
      restaurantId: requestBody.restaurantId,
      qlooEntityId: requestBody.qlooEntityId,
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
      data: savedData,
      message: `Found ${similarRestaurants.length} similar restaurants with ${specialtyDishes.length} specialty dishes`,
    };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
      },
      body: JSON.stringify(response),
    };
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

    return {
      statusCode,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
      },
      body: JSON.stringify({
        success: false,
        message,
        error: error.message,
      }),
    };
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
  minRating: number
): Promise<QlooSimilarRestaurant[]> {
  const qlooBaseUrl = process.env.QLOO_API_URL || "https://api.qloo.com/v1";

  // Construct similar restaurants search URL
  const searchUrl = `${qlooBaseUrl}/similar`;
  const searchParams = new URLSearchParams({
    entity_id: entityId,
    "filter.business_rating": minRating.toString(),
    limit: "20", // Get up to 20 similar restaurants
    include_tags: "true",
    include_keywords: "true",
  });

  const fullUrl = `${searchUrl}?${searchParams.toString()}`;

  console.log("Making Qloo similar restaurants API request to:", fullUrl);

  const response = await axios.get<QlooSimilarRestaurantsResponse>(fullUrl, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    timeout: 30000, // 30 seconds timeout
  });

  console.log(
    "Qloo similar restaurants API response:",
    JSON.stringify(response.data, null, 2)
  );

  return response.data.data || [];
}

/**
 * Extract specialty dish tags from similar restaurants
 * @param similarRestaurants Array of similar restaurants
 * @returns Array of specialty dishes
 */
function extractSpecialtyDishes(
  similarRestaurants: QlooSimilarRestaurant[]
): SpecialtyDish[] {
  const specialtyDishMap = new Map<string, SpecialtyDish>();

  similarRestaurants.forEach((restaurant) => {
    if (restaurant.tags) {
      restaurant.tags
        .filter((tag) => tag.tag_id.startsWith("urn:tag:specialty_dish:place:"))
        .forEach((tag) => {
          const dishName = tag.name;
          const tagId = tag.tag_id;

          if (specialtyDishMap.has(tagId)) {
            // Increment count for existing dish
            const existingDish = specialtyDishMap.get(tagId)!;
            existingDish.restaurantCount += 1;
            existingDish.popularity += 1;
          } else {
            // Add new specialty dish
            specialtyDishMap.set(tagId, {
              dishName,
              tagId,
              restaurantCount: 1,
              popularity: 1,
            });
          }
        });
    }
  });

  // Convert map to array and sort by popularity
  return Array.from(specialtyDishMap.values()).sort(
    (a, b) => b.popularity - a.popularity
  );
}

/**
 * Format similar restaurant data for storage
 * @param restaurant Qloo similar restaurant
 * @returns Formatted similar restaurant
 */
function formatSimilarRestaurant(
  restaurant: QlooSimilarRestaurant
): SimilarRestaurant {
  // Extract specialty dish names from tags
  const specialtyDishes =
    restaurant.tags
      ?.filter((tag) => tag.tag_id.startsWith("urn:tag:specialty_dish:place:"))
      .map((tag) => tag.name) || [];

  // Format keywords
  const keywords: KeywordData[] =
    restaurant.keywords?.map((keyword) => ({
      name: keyword.name,
      count: keyword.count,
    })) || [];

  return {
    name: restaurant.name,
    entityId: restaurant.entity_id,
    address: restaurant.address || "",
    businessRating: restaurant.business_rating || 0,
    priceLevel: restaurant.price_level || 0,
    specialtyDishes,
    keywords,
  };
}

/**
 * Get Qloo API key from AWS Parameter Store
 * @returns Qloo API key
 */
async function getQlooApiKey(): Promise<string> {
  try {
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
