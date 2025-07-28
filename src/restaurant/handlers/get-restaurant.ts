/**
 * Lambda function for retrieving a restaurant by ID
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { RestaurantRepository } from "../../repositories/restaurant-repository";
import { createResponse, createErrorResponse } from "../../models/api";

/**
 * Handler for get restaurant requests
 * @param event API Gateway event
 * @returns API Gateway response
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log("Get restaurant event:", JSON.stringify(event, null, 2));

  // Handle OPTIONS request for CORS
  if (event.httpMethod === "OPTIONS") {
    return createResponse(200, {});
  }

  try {
    // Get restaurant ID from path parameters
    const restaurantId = event.pathParameters?.restaurantId;

    // Validate restaurant ID
    if (!restaurantId) {
      return createErrorResponse(
        400,
        "Missing required parameter: restaurantId"
      );
    }

    // Extract user ID from Cognito authorizer context
    const userId = event.requestContext?.authorizer?.claims?.sub;

    if (!userId) {
      return createErrorResponse(401, "Authentication required");
    }

    // Get restaurant from repository
    const restaurantRepository = new RestaurantRepository();
    const restaurant = await restaurantRepository.getById(restaurantId);

    // Check if restaurant exists
    if (!restaurant) {
      return createErrorResponse(
        404,
        `Restaurant with ID ${restaurantId} not found`
      );
    }

    // Check if the user is authorized to access this restaurant
    if (restaurant.ownerId !== userId) {
      return createErrorResponse(
        403,
        "Forbidden: You can only access your own restaurants"
      );
    }

    // Return restaurant
    return createResponse(200, { restaurant });
  } catch (error: any) {
    console.error("Error getting restaurant:", error);

    return createErrorResponse(
      500,
      "Error getting restaurant",
      undefined,
      process.env.STAGE === "dev" ? error.message : undefined
    );
  }
};
