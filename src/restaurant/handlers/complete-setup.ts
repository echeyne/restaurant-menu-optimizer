import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { RestaurantRepository } from "../../repositories/restaurant-repository";
import { getUserIdFromToken } from "../../utils/auth-utils";
import { createResponse, createErrorResponse } from "../../models/api";

const restaurantRepository = new RestaurantRepository();

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log("Complete setup event:", JSON.stringify(event, null, 2));

  // Handle OPTIONS request for CORS
  if (event.httpMethod === "OPTIONS") {
    return createResponse(200, {});
  }

  try {
    // Get user ID from token
    const userId = await getUserIdFromToken(event);
    if (!userId) {
      return createErrorResponse(401, "Unauthorized");
    }

    // Get the restaurant for this user
    const restaurant = await restaurantRepository.getByOwnerId(userId);
    if (!restaurant) {
      return createErrorResponse(404, "Restaurant not found");
    }

    // Mark profile setup as complete
    const updatedRestaurant =
      await restaurantRepository.markProfileSetupComplete(
        restaurant.restaurantId
      );

    return createResponse(200, {
      message: "Profile setup completed successfully",
      restaurant: updatedRestaurant,
    });
  } catch (error) {
    console.error("Error completing profile setup:", error);
    return createErrorResponse(
      500,
      "Internal server error",
      error instanceof Error ? error.message : undefined,
      process.env.STAGE === "dev" && error instanceof Error
        ? error.message
        : undefined
    );
  }
};
