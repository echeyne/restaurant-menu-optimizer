/**
 * Lambda function for selecting a restaurant from Qloo search results
 * Handles restaurant selection and data storage
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { RestaurantRepository } from "../../repositories/restaurant-repository";
import { QlooSearchResult } from "../../models/database";

/**
 * Request body interface for restaurant selection
 */
interface SelectRestaurantRequest {
  restaurantId: string;
  qlooSearchResult: QlooSearchResult;
}

/**
 * Response interface for restaurant selection
 */
interface SelectRestaurantResponse {
  success: boolean;
  restaurant?: any;
  message?: string;
}

/**
 * Lambda handler for selecting a restaurant
 * @param event API Gateway event
 * @returns API Gateway response
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log("Select restaurant request:", JSON.stringify(event, null, 2));

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

    const requestBody: SelectRestaurantRequest = JSON.parse(event.body);

    // Validate required fields
    if (!requestBody.restaurantId || !requestBody.qlooSearchResult) {
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
          message: "Restaurant ID and Qloo search result are required",
        }),
      };
    }

    // Validate Qloo search result has required fields
    if (
      !requestBody.qlooSearchResult.entityId ||
      !requestBody.qlooSearchResult.name
    ) {
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
          message: "Qloo search result must include entityId and name",
        }),
      };
    }

    // Initialize repository
    const restaurantRepository = new RestaurantRepository();

    // Check if restaurant exists
    const existingRestaurant = await restaurantRepository.getById(
      requestBody.restaurantId
    );
    if (!existingRestaurant) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type,Authorization",
          "Access-Control-Allow-Methods": "POST,OPTIONS",
        },
        body: JSON.stringify({
          success: false,
          message: "Restaurant not found",
        }),
      };
    }

    // Update restaurant with Qloo data
    const updatedRestaurant = await restaurantRepository.updateWithQlooData(
      requestBody.restaurantId,
      requestBody.qlooSearchResult
    );

    console.log("Restaurant updated with Qloo data:", updatedRestaurant);

    const response: SelectRestaurantResponse = {
      success: true,
      restaurant: updatedRestaurant,
      message: "Restaurant selected and updated successfully",
    };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
      },
      body: JSON.stringify(response),
    };
  } catch (error: any) {
    console.error("Error selecting restaurant:", error);

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
