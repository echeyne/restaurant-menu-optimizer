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

/**
 * Request body interface for demographics data collection
 */
interface GetDemographicsRequest {
  restaurantId: string;
  qlooEntityId: string;
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
  data: {
    demographics: QlooDemographicData[];
    insights: QlooInsight[];
  };
  meta?: {
    entity_id: string;
    analysis_date: string;
  };
}

/**
 * Qloo demographic data interface
 */
interface QlooDemographicData {
  type: string;
  category: string;
  value: string;
  percentage: number;
  confidence: number;
  preferences?: string[];
}

/**
 * Qloo insight interface
 */
interface QlooInsight {
  type: string;
  category: string;
  value: string;
  frequency: number;
  time_of_day?: string[];
}

/**
 * Lambda handler for getting demographics data
 * @param event API Gateway event
 * @returns API Gateway response
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
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
    const demographicsRepository = new DemographicsDataRepository();
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

    // Get demographics data from Qloo API
    const demographicsData = await getDemographicsFromQloo(
      requestBody.qlooEntityId,
      apiKey
    );

    // Process and format demographics data
    const formattedDemographics = formatDemographicsData(
      requestBody.restaurantId,
      requestBody.qlooEntityId,
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
      Authorization: `Bearer ${apiKey}`,
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
  // Process age groups
  const ageGroups: AgeGroupData[] = demographicsData.data.demographics
    .filter((item) => item.type === "age_group" || item.category === "age")
    .map((item) => ({
      ageRange: item.value,
      percentage: item.percentage,
      preferences: item.preferences || [],
    }));

  // Process interests
  const interests: string[] = demographicsData.data.demographics
    .filter((item) => item.type === "interest" || item.category === "interests")
    .map((item) => item.value);

  // Process dining patterns from insights
  const diningPatterns: DiningPattern[] = demographicsData.data.insights
    .filter(
      (insight) =>
        insight.type === "dining_pattern" || insight.category === "dining"
    )
    .map((insight) => ({
      pattern: insight.value,
      frequency: insight.frequency,
      timeOfDay: insight.time_of_day || [],
    }));

  return {
    restaurantId,
    qlooEntityId,
    ageGroups,
    interests,
    diningPatterns,
    retrievedAt: new Date().toISOString(),
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
