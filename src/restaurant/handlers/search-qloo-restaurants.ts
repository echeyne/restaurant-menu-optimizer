/**
 * Lambda function for searching restaurants in Qloo database
 * Implements the Qloo search API call with proper URL format
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import axios from "axios";
import { SSM } from "aws-sdk";
import { QlooSearchResult, QlooTag } from "../../models/database";

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
  results: {}[];
}

/**
 * Geocoding API response interface
 */
interface GeocodeResult {
  lat: number;
  lng: number;
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

    // Geocode the city and state to get latitude,longitude
    const geocodeResult = await geocodeLocation(
      requestBody.city,
      requestBody.state
    );

    // Construct Qloo API URL with proper format
    const qlooBaseUrl =
      process.env.QLOO_API_URL || "https://hackathon.api.qloo.com";

    const searchUrl = `${qlooBaseUrl}/search`;
    const searchParams = new URLSearchParams({
      query: requestBody.restaurantName,
      "filter.radius": "10",
      "operator.filter.tags": "union",
      page: "1",
      sort_by: "match",
    });

    // Add location filter only if geocoding was successful
    if (geocodeResult) {
      searchParams.set(
        "filter.location",
        `${geocodeResult.lat},${geocodeResult.lng}`
      );
    }

    const fullUrl = `${searchUrl}?${searchParams.toString()}`;

    console.log("Making Qloo API request to:", fullUrl);

    // Make request to Qloo API
    const response = await axios.get<QlooApiResponse>(fullUrl, {
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      timeout: 30000, // 30 seconds timeout
    });

    console.log("Qloo API response:", JSON.stringify(response.data, null, 2));

    // Extract and format results (limit to 10 as per requirements)
    const restaurants = response.data.results?.slice(0, 10) || [];

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

    const locationText = geocodeResult
      ? `${requestBody.city}, ${requestBody.state} (${geocodeResult.lat},${geocodeResult.lng})`
      : `${requestBody.city}, ${requestBody.state}`;

    const searchResponse: SearchQlooRestaurantsResponse = {
      success: true,
      restaurants: formattedRestaurants,
      totalResults: formattedRestaurants.length,
      message: `Found ${formattedRestaurants.length} restaurants matching "${requestBody.restaurantName}" in ${locationText} (there may have been more than 10 results...we only pull the top 10)`,
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
 * Geocode a city and state to latitude,longitude coordinates
 * Uses OpenStreetMap Nominatim API (free, no API key required)
 * @param city City name
 * @param state State name
 * @returns GeocodeResult with lat/lng or null if geocoding fails
 */
async function geocodeLocation(
  city: string,
  state: string
): Promise<GeocodeResult | null> {
  try {
    const query = encodeURIComponent(`${city}, ${state}, USA`);
    const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1&countrycodes=us`;

    console.log(`Geocoding location: ${city}, ${state}`);

    const response = await axios.get(geocodeUrl, {
      headers: {
        "User-Agent": "RestaurantMenuOptimizer/1.0",
      },
      timeout: 10000, // 10 seconds timeout
    });

    if (response.data && response.data.length > 0) {
      const result = response.data[0];
      const geocodeResult: GeocodeResult = {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
      };

      console.log(
        `Geocoded ${city}, ${state} to ${geocodeResult.lat},${geocodeResult.lng}`
      );
      return geocodeResult;
    } else {
      console.log(`No geocoding results found for ${city}, ${state}`);
      return null;
    }
  } catch (error: any) {
    console.error(`Geocoding failed for ${city}, ${state}:`, error.message);
    return null;
  }
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
 * Get Qloo API key from AWS Parameter Store
 * @returns Qloo API key
 */
async function getQlooApiKey(): Promise<string> {
  if (process.env.STAGE == "local" && process.env.QLOO_API_KEY) {
    return process.env.QLOO_API_KEY;
  }
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
