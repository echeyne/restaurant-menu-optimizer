import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { AuthService } from "../services/auth-service";
import { createResponse, createErrorResponse } from "../../models/api";

/**
 * Lambda handler for confirming user registration
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log("Confirm registration event:", JSON.stringify(event, null, 2));

  // Handle OPTIONS request for CORS
  if (event.httpMethod === "OPTIONS") {
    return createResponse(200, {});
  }

  try {
    // Parse the request body
    if (!event.body) {
      return createErrorResponse(400, "Missing request body");
    }

    const { email, confirmationCode } = JSON.parse(event.body);

    if (!email || !confirmationCode) {
      return createErrorResponse(
        400,
        "Email and confirmation code are required"
      );
    }

    const authService = new AuthService();
    const result = await authService.confirmRegistration(
      email,
      confirmationCode
    );

    if (result.success) {
      return createResponse(200, result);
    } else {
      return createErrorResponse(400, result.message);
    }
  } catch (error: any) {
    console.error("Error confirming registration:", error);
    return createErrorResponse(
      500,
      "Error confirming registration",
      error.code,
      process.env.STAGE === "dev" ? error.message : undefined
    );
  }
};
