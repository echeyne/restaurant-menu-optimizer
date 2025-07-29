import { APIGatewayProxyEvent } from "aws-lambda";
import { AuthService } from "../auth/services/auth-service";

/**
 * Extract user ID from the Authorization header in an API Gateway event
 * @param event The API Gateway proxy event
 * @returns The user ID if valid, null otherwise
 */
export async function getUserIdFromToken(
  event: APIGatewayProxyEvent
): Promise<string | null> {
  try {
    const authorizationHeader =
      event.headers.Authorization || event.headers.authorization;

    if (!authorizationHeader) {
      return null;
    }

    const authService = new AuthService();
    return await authService.getCurrentUserId(authorizationHeader);
  } catch (error) {
    console.error("Error extracting user ID from token:", error);
    return null;
  }
}
