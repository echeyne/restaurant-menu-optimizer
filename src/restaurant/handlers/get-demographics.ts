/**
 * Lambda function for getting demographics data
 * Implements Qloo demographics API call and stores demographics data in database
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import axios from "axios";
import { SSM } from "aws-sdk";
import { DemographicsDataRepository } from "../../repositories/demographics-data-repository";
import { RestaurantRepository } from "../../repositories/restaurant-repository";
import {
  DemographicsData,
  AgeGroupData,
  DiningPattern,
} from "../../models/database";
import { createResponse } from "../../models/api";

/**
 * Request body interface for demographics data collection
 */
interface GetDemographicsRequest {
  entityId: string;
}

/**
 * Response interface for demographics data collection
 */
interface GetDemographicsResponse {
  success: boolean;
  data?: DemographicsData;
  message?: string;
}

/**
 * Qloo demographics API response interface
 */
interface QlooDemographicsResponse {
  success: boolean;
  results: {
    demographics: QlooDemographicData[];
  };
  duration: number;
}

/**
 * Qloo demographic data interface
 */
interface QlooDemographicData {
  entity_id: string;
  query: {
    age?: {
      [key: string]: number;
    };
    gender?: {
      [key: string]: number;
    };
    [key: string]: any;
  };
}

/**
 * Lambda handler for getting demographics data
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

  console.log("Get demographics request:", JSON.stringify(event, null, 2));

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

    const requestBody: GetDemographicsRequest = JSON.parse(event.body);

    // Get restaurantId from path parameters
    const restaurantId = event.pathParameters?.restaurantId;
    if (!restaurantId) {
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
          message: "Restaurant ID is required in path",
        }),
      };
    }

    // Validate required fields
    if (!requestBody.entityId) {
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
          message: "Entity ID is required",
        }),
      };
    }

    // Initialize repositories
    const demographicsRepository = new DemographicsDataRepository();
    const restaurantRepository = new RestaurantRepository();

    // Verify restaurant exists
    const restaurant = await restaurantRepository.getById(restaurantId);
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

    // Get demographics data from Qloo API
    const demographicsData = await getDemographicsFromQloo(
      requestBody.entityId,
      apiKey
    );

    // Process and format demographics data
    const formattedDemographics = formatDemographicsData(
      restaurantId,
      requestBody.entityId,
      demographicsData
    );

    // Store demographics data
    const savedData = await demographicsRepository.createOrUpdate(
      formattedDemographics
    );

    console.log("Demographics data saved:", savedData);

    const response: GetDemographicsResponse = {
      success: true,
      data: savedData,
      message: `Demographics data retrieved and stored successfully`,
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
    console.error("Error getting demographics data:", error);

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
 * Get demographics data from Qloo API
 * @param entityId Qloo entity ID
 * @param apiKey Qloo API key
 * @returns Demographics data from Qloo
 */
async function getDemographicsFromQloo(
  entityId: string,
  apiKey: string
): Promise<QlooDemographicsResponse> {
  const qlooBaseUrl =
    process.env.QLOO_API_URL || "https://hackathon.api.qloo.com";

  // Construct demographics API URL as specified in requirements
  const demographicsUrl = `${qlooBaseUrl}/v2/insights`;
  const searchParams = new URLSearchParams({
    "filter.type": "urn:demographics",
    "signal.interests.entities": entityId,
  });

  const fullUrl = `${demographicsUrl}?${searchParams.toString()}`;

  console.log("Making Qloo demographics API request to:", fullUrl);

  const response = await axios.get<QlooDemographicsResponse>(fullUrl, {
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    timeout: 30000, // 30 seconds timeout
  });

  console.log(
    "Qloo demographics API response:",
    JSON.stringify(response.data, null, 2)
  );

  return response.data;
}

/**
 * Format demographics data for storage
 * @param restaurantId Restaurant ID
 * @param qlooEntityId Qloo entity ID
 * @param demographicsData Raw demographics data from Qloo
 * @returns Formatted demographics data
 */
function formatDemographicsData(
  restaurantId: string,
  qlooEntityId: string,
  demographicsData: QlooDemographicsResponse
): DemographicsData {
  const ageGroups: AgeGroupData[] = [];
  const interests: string[] = [];
  const diningPatterns: DiningPattern[] = [];

  // Process demographics data from the API response
  if (demographicsData.results?.demographics) {
    for (const demographic of demographicsData.results.demographics) {
      // Process age groups
      if (demographic.query.age) {
        for (const [ageRange, percentage] of Object.entries(
          demographic.query.age
        )) {
          ageGroups.push({
            ageRange: ageRange.replace(/_/g, " "), // Convert "24_and_younger" to "24 and younger"
            percentage: Math.abs(percentage), // Convert to positive percentage
            preferences: [], // No preferences data in current API response
          });
        }
      }

      // Process gender data (could be treated as interests or separate category)
      if (demographic.query.gender) {
        for (const [gender, percentage] of Object.entries(
          demographic.query.gender
        )) {
          if (percentage > 0) {
            interests.push(
              `${gender} preference: ${(percentage * 100).toFixed(1)}%`
            );
          }
        }
      }

      // Process any other demographic categories as interests
      for (const [category, data] of Object.entries(demographic.query)) {
        if (
          category !== "age" &&
          category !== "gender" &&
          typeof data === "object"
        ) {
          for (const [key, value] of Object.entries(
            data as Record<string, number>
          )) {
            if (value > 0) {
              interests.push(`${category}: ${key.replace(/_/g, " ")}`);
            }
          }
        }
      }
    }
  }

  return {
    restaurantId,
    qlooEntityId,
    ageGroups,
    interests,
    diningPatterns, // Empty for now as the API response doesn't include dining patterns
    retrievedAt: new Date().toISOString(),
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
