import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { AuthService } from "../services/auth-service";
import { LoginCredentials } from "../../models/auth";
import { createResponse, createErrorResponse } from "../../models/api";

/**
 * Lambda handler for user login
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log("Login event:", JSON.stringify(event, null, 2));

  // Handle OPTIONS request for CORS
  if (event.httpMethod === "OPTIONS") {
    return createResponse(200, {});
  }

  try {
    // Parse the request body
    if (!event.body) {
      return createErrorResponse(400, "Missing request body");
    }

    const loginData: LoginCredentials = JSON.parse(event.body);

    // Validate required fields
    if (!loginData.email || !loginData.password) {
      return createErrorResponse(400, "Email and password are required");
    }

    // Authenticate the user
    const authService = new AuthService();
    const result = await authService.login(loginData);

    return createResponse(200, result);
  } catch (error: any) {
    console.error("Error logging in:", error);

    // Handle specific Cognito errors
    if (error.code === "NotAuthorizedException") {
      return createErrorResponse(401, "Invalid email or password", error.code);
    }

    if (error.code === "UserNotConfirmedException") {
      return createErrorResponse(403, "User is not confirmed", error.code);
    }

    return createErrorResponse(
      500,
      "Error logging in",
      error.code,
      process.env.STAGE === "dev" ? error.message : undefined
    );
  }
};
