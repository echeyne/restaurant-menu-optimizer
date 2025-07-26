/**
 * Lambda function for retrieving a restaurant by ID
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { RestaurantRepository } from "../../repositories/restaurant-repository";
import { AuthService } from "../../auth/services/auth-service";

/**
 * Handler for get restaurant requests
 * @param event API Gateway event
 * @returns API Gateway response
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Get restaurant ID from path parameters
    const restaurantId = event.pathParameters?.restaurantId;

    // Validate restaurant ID
    if (!restaurantId) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          message: "Missing required parameter: restaurantId",
        }),
      };
    }

    // Get user ID from the JWT token for authorization
    const authService = new AuthService();
    const userId = await authService.getCurrentUserId(
      event.headers.Authorization || ""
    );

    if (!userId) {
      return {
        statusCode: 401,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          message: "Unauthorized: Invalid or missing token",
        }),
      };
    }

    // Get restaurant from repository
    const restaurantRepository = new RestaurantRepository();
    const restaurant = await restaurantRepository.getById(restaurantId);

    // Check if restaurant exists
    if (!restaurant) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          message: `Restaurant with ID ${restaurantId} not found`,
        }),
      };
    }

    // Check if the user is authorized to access this restaurant
    if (restaurant.ownerId !== userId) {
      return {
        statusCode: 403,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          message: "Forbidden: You can only access your own restaurants",
        }),
      };
    }

    // Return restaurant
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        restaurant,
      }),
    };
  } catch (error: any) {
    console.error("Error getting restaurant:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Error getting restaurant",
        error: error.message || String(error),
      }),
    };
  }
};
