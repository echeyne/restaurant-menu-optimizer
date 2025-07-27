/**
 * Get dashboard data handler
 * Returns analytics dashboard data for a restaurant
 */

import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { createResponse } from "../../models/api";
import { AnalyticsService } from "../../services/analytics-service";

const analyticsService = new AnalyticsService();

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // Handle OPTIONS request for CORS
  if (event.httpMethod === "OPTIONS") {
    return createResponse(200, {});
  }

  console.log("Get dashboard data request:", {
    requestId: context.awsRequestId,
    queryStringParameters: event.queryStringParameters,
  });

  try {
    // Extract parameters
    const restaurantId = event.queryStringParameters?.restaurantId;
    const timeframe = event.queryStringParameters?.timeframe;
    const page = event.queryStringParameters?.page
      ? parseInt(event.queryStringParameters.page)
      : 1;
    const limit = event.queryStringParameters?.limit
      ? parseInt(event.queryStringParameters.limit)
      : 50;

    // Validate required parameters
    if (!restaurantId) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers":
            "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
          "Access-Control-Allow-Methods": "GET,OPTIONS",
        },
        body: JSON.stringify({
          error: "Missing required parameter: restaurantId",
        }),
      };
    }

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers":
            "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
          "Access-Control-Allow-Methods": "GET,OPTIONS",
        },
        body: JSON.stringify({
          error:
            "Invalid pagination parameters. Page must be >= 1, limit must be between 1 and 100",
        }),
      };
    }

    // Get dashboard data
    const dashboardData = await analyticsService.getDashboardData(
      restaurantId,
      timeframe
    );

    // Apply pagination to top and low performing items
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedData = {
      ...dashboardData,
      topPerformingItems: dashboardData.topPerformingItems.slice(
        startIndex,
        endIndex
      ),
      lowPerformingItems: dashboardData.lowPerformingItems.slice(
        startIndex,
        endIndex
      ),
      pagination: {
        page,
        limit,
        totalTopItems: dashboardData.topPerformingItems.length,
        totalLowItems: dashboardData.lowPerformingItems.length,
        hasNextPage:
          endIndex <
          Math.max(
            dashboardData.topPerformingItems.length,
            dashboardData.lowPerformingItems.length
          ),
        hasPreviousPage: page > 1,
      },
    };

    console.log("Dashboard data retrieved successfully:", {
      restaurantId,
      timeframe,
      totalMenuItems: dashboardData.totalMenuItems,
      topItemsCount: dashboardData.topPerformingItems.length,
      lowItemsCount: dashboardData.lowPerformingItems.length,
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
      },
      body: JSON.stringify(paginatedData),
    };
  } catch (error) {
    console.error("Failed to get dashboard data:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
      },
      body: JSON.stringify({
        error: "Internal server error",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      }),
    };
  }
};
