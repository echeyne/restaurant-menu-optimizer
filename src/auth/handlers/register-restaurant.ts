import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { AuthService } from "../services/auth-service";
import { RestaurantRegistration } from "../../models/auth";
import { createResponse, createErrorResponse } from "../../models/api";

/**
 * Lambda handler for registering a new restaurant
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log("Register restaurant event:", JSON.stringify(event, null, 2));

  // Handle OPTIONS request for CORS
  if (event.httpMethod === "OPTIONS") {
    return createResponse(200, {});
  }

  try {
    // Parse the request body
    if (!event.body) {
      return createErrorResponse(400, "Missing request body");
    }

    const registrationData: RestaurantRegistration = JSON.parse(event.body);

    // Validate required fields
    const requiredFields = [
      "email",
      "password",
      "name",
      "restaurantName",
      "cuisineType",
      "location",
    ];
    for (const field of requiredFields) {
      if (!registrationData[field as keyof RestaurantRegistration]) {
        return createErrorResponse(400, `Missing required field: ${field}`);
      }
    }

    // Register the restaurant
    const authService = new AuthService();
    const result = await authService.registerRestaurant(registrationData);

    return createResponse(201, result);
  } catch (error: any) {
    console.error("Error registering restaurant:", error);

    // Handle specific Cognito errors
    if (error.code === "UsernameExistsException") {
      return createErrorResponse(409, "Email already registered", error.code);
    }

    if (error.code === "InvalidPasswordException") {
      return createErrorResponse(
        400,
        "Password does not meet requirements",
        error.code
      );
    }

    return createErrorResponse(
      500,
      "Error registering restaurant",
      error.code,
      process.env.STAGE === "dev" ? error.message : undefined
    );
  }
};
