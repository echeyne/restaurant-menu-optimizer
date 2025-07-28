/**
 * Lambda function for retrieving the current user's restaurant
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { RestaurantRepository } from "../../repositories/restaurant-repository";
import { AuthService } from "../../auth/services/auth-service";
import { createResponse, createErrorResponse } from "../../models/api";

/**
 * Handler for get current restaurant requests
 * @param event API Gateway event
 * @returns API Gateway response
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log("Get current restaurant event:", JSON.stringify(event, null, 2));

  // Handle OPTIONS request for CORS
  if (event.httpMethod === "OPTIONS") {
    return createResponse(200, {});
  }

  try {
    // Get user ID from the JWT token
    const authService = new AuthService();
    const userId = await authService.getCurrentUserId(
      event.headers.Authorization || ""
    );

    if (!userId) {
      return createErrorResponse(401, "Unauthorized: Invalid or missing token");
    }

    // Get restaurant from repository by owner ID
    const restaurantRepository = new RestaurantRepository();
    const restaurant = await restaurantRepository.getByOwnerId(userId);

    // Check if restaurant exists
    if (!restaurant) {
      return createErrorResponse(
        404,
        "No restaurant found for the current user"
      );
    }

    // Return restaurant
    return createResponse(200, { restaurant });
  } catch (error: any) {
    console.error("Error getting current restaurant:", error);

    return createErrorResponse(
      500,
      "Error getting current restaurant",
      undefined,
      process.env.STAGE === "dev" ? error.message : undefined
    );
  }
};
