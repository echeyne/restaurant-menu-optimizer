import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { AuthService } from "../services/auth-service";
import { RestaurantRegistration } from "../../models/auth";
import { createResponse, createErrorResponse } from "../../models/api";

/**
 * Lambda handler for registering a new user (email/password only)
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log("Register user event:", JSON.stringify(event, null, 2));

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
    const requiredFields = ["email", "password"];
    for (const field of requiredFields) {
      if (!registrationData[field as keyof RestaurantRegistration]) {
        return createErrorResponse(400, `Missing required field: ${field}`);
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registrationData.email)) {
      return createErrorResponse(400, "Invalid email format");
    }

    // Validate password strength
    if (registrationData.password.length < 8) {
      return createErrorResponse(
        400,
        "Password must be at least 8 characters long"
      );
    }

    // Register the user
    const authService = new AuthService();
    const result = await authService.registerUser(registrationData);

    return createResponse(201, result);
  } catch (error: any) {
    console.error("Error registering user:", error);

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
      "Error registering user",
      error.code,
      process.env.STAGE === "dev" ? error.message : undefined
    );
  }
};
