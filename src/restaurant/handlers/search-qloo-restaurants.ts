/**
 * Lambda function for searching restaurants in Qloo database
 * Implements the Qloo search API call with proper URL format
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import axios from "axios";
import { SSM } from "aws-sdk";
import { QlooSearchResult } from "../../models/database";

/**
 * Request body interface for Qloo restaurant search
 */
interface SearchQlooRestaurantsRequest {
  restaurantName: string;
  city: string;
  state: string;
}

/**
 * Response interface for Qloo restaurant search
 */
interface SearchQlooRestaurantsResponse {
  success: boolean;
  restaurants?: QlooSearchResult[];
  message?: string;
  totalResults?: number;
}

/**
 * Qloo API response interface
 */
interface QlooApiResponse {
  data: QlooSearchResult[];
  meta?: {
    total: number;
    page: number;
    per_page: number;
  };
}

/**
 * Lambda handler for searching Qloo restaurants
 * @param event API Gateway event
 * @returns API Gateway response
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log(
    "Search Qloo restaurants request:",
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

    const requestBody: SearchQlooRestaurantsRequest = JSON.parse(event.body);

    // Validate required fields
    if (
      !requestBody.restaurantName ||
      !requestBody.city ||
      !requestBody.state
    ) {
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
          message: "Restaurant name, city, and state are required",
        }),
      };
    }

    // Get Qloo API key from Parameter Store
    const apiKey = await getQlooApiKey();

    // Construct Qloo API URL with proper format
    const qlooBaseUrl =
      process.env.QLOO_API_URL || "https://hackathon.api.qloo.com";
    const location = `${requestBody.city}, ${requestBody.state}`;

    const searchUrl = `${qlooBaseUrl}/search`;
    const searchParams = new URLSearchParams({
      query: requestBody.restaurantName,
      "filter.radius": "10",
      "operator.filter.tags": "union",
      page: "1",
      sort_by: "match",
      "filter.location": location,
    });

    const fullUrl = `${searchUrl}?${searchParams.toString()}`;

    console.log("Making Qloo API request to:", fullUrl);

    // Make request to Qloo API
    const response = await axios.get<QlooApiResponse>(fullUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 30000, // 30 seconds timeout
    });

    console.log("Qloo API response:", JSON.stringify(response.data, null, 2));

    // Extract and format results (limit to 10 as per requirements)
    const restaurants = response.data.data?.slice(0, 10) || [];

    const formattedRestaurants: QlooSearchResult[] = restaurants.map(
      (restaurant: any) => ({
        name: restaurant.name || "",
        entity_id: restaurant.entity_id || restaurant.id || "",
        address: restaurant.address || restaurant.location?.address || "",
        price_level: restaurant.price_level || 0,
        tags: restaurant.tags || [],
      })
    );

    const searchResponse: SearchQlooRestaurantsResponse = {
      success: true,
      restaurants: formattedRestaurants,
      totalResults: response.data.meta?.total || formattedRestaurants.length,
      message: `Found ${formattedRestaurants.length} restaurants matching "${requestBody.restaurantName}" in ${location}`,
    };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
      },
      body: JSON.stringify(searchResponse),
    };
  } catch (error: any) {
    console.error("Error searching Qloo restaurants:", error);

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
 * Get Qloo API key from AWS Parameter Store
 * @returns Qloo API key
 */
async function getQlooApiKey(): Promise<string> {
  try {
    const ssm = new SSM({
      region: process.env.REGION || "us-east-1",
    });

    const stage = process.env.STAGE || "dev";
    const paramName = `${stage}/qloo/api-key`;

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
