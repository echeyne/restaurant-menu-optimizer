import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { AuthService } from "../services/auth-service";
import { TokenRefreshRequest } from "../../models/auth";
import { createResponse, createErrorResponse } from "../../models/api";

/**
 * Lambda handler for refreshing authentication tokens
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log("Refresh token event:", JSON.stringify(event, null, 2));

  // Handle OPTIONS request for CORS
  if (event.httpMethod === "OPTIONS") {
    return createResponse(200, {});
  }

  try {
    // Parse the request body
    if (!event.body) {
      return createErrorResponse(400, "Missing request body");
    }

    const refreshData: TokenRefreshRequest = JSON.parse(event.body);

    // Validate required fields
    if (!refreshData.refreshToken) {
      return createErrorResponse(400, "Refresh token is required");
    }

    // Refresh the token
    const authService = new AuthService();
    const result = await authService.refreshToken(refreshData);

    return createResponse(200, result);
  } catch (error: any) {
    console.error("Error refreshing token:", error);

    // Handle specific Cognito errors
    if (error.code === "NotAuthorizedException") {
      return createErrorResponse(401, "Invalid refresh token", error.code);
    }

    return createErrorResponse(
      500,
      "Error refreshing token",
      error.code,
      process.env.STAGE === "dev" ? error.message : undefined
    );
  }
};
