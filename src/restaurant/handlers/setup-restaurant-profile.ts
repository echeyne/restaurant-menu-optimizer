/**
 * Lambda function for setting up restaurant profile
 * Handles the initial restaurant profile creation with basic information
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { RestaurantRepository } from "../../repositories/restaurant-repository";
import { Restaurant } from "../../models/database";
import { createResponse } from "../../models/api";
import { AuthService } from "../../auth/services/auth-service";

/**
 * Request body interface for restaurant profile setup
 */
interface SetupRestaurantProfileRequest {
  name: string;
  city: string;
  state: string;
}

/**
 * Response interface for restaurant profile setup
 */
interface SetupRestaurantProfileResponse {
  success: boolean;
  restaurant?: Restaurant;
  message?: string;
}

/**
 * Lambda handler for setting up restaurant profile
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
    "Setup restaurant profile request:",
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

    const requestBody: SetupRestaurantProfileRequest = JSON.parse(event.body);

    // Validate required fields
    if (!requestBody.name || !requestBody.city || !requestBody.state) {
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
          message: "Name, city, and state are required",
        }),
      };
    }

    // Extract user ID from JWT token
    const authService = new AuthService();
    const authorizationHeader =
      event.headers.Authorization || event.headers.authorization || "";
    const ownerId = await authService.getCurrentUserId(authorizationHeader);

    if (!ownerId) {
      return {
        statusCode: 401,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type,Authorization",
          "Access-Control-Allow-Methods": "POST,OPTIONS",
        },
        body: JSON.stringify({
          success: false,
          message: "Authentication required",
        }),
      };
    }

    // Initialize repository
    const restaurantRepository = new RestaurantRepository();

    // Check if restaurant already exists for this owner
    const existingRestaurant = await restaurantRepository.getByOwnerId(ownerId);
    if (existingRestaurant) {
      return {
        statusCode: 409,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type,Authorization",
          "Access-Control-Allow-Methods": "POST,OPTIONS",
        },
        body: JSON.stringify({
          success: false,
          message: "Restaurant profile already exists for this owner",
          restaurant: existingRestaurant,
        }),
      };
    }

    // Create new restaurant profile
    const restaurant = await restaurantRepository.create({
      ownerId: ownerId,
      name: requestBody.name,
      city: requestBody.city,
      state: requestBody.state,
      profileSetupComplete: false,
      entityId: "", // Will be set when Qloo data is selected
      cuisine: "", // Will be set when Qloo data is selected
      popularity: 0, // Will be set when Qloo data is selected
      description: "", // Will be set when Qloo data is selected
      specialtyDishes: [], // Will be set when Qloo data is selected
      businessRating: 0, // Will be set when Qloo data is selected
    });

    console.log("Restaurant profile created:", restaurant);

    const response: SetupRestaurantProfileResponse = {
      success: true,
      restaurant,
      message: "Restaurant profile created successfully",
    };

    return {
      statusCode: 201,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
      },
      body: JSON.stringify(response),
    };
  } catch (error: any) {
    console.error("Error setting up restaurant profile:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
      },
      body: JSON.stringify({
        success: false,
        message: "Internal server error",
        error: error.message,
      }),
    };
  }
};
