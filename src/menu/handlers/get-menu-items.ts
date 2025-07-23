/**
 * Lambda function for retrieving menu items
 * Supports filtering by category and search by name
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { MenuItemRepository } from "../../repositories/menu-item-repository";

/**
 * Handler for get menu items requests
 * @param event API Gateway event
 * @returns API Gateway response
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Get restaurant ID from query parameters
    const restaurantId = event.queryStringParameters?.restaurantId;

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

    // Get optional filters
    const category = event.queryStringParameters?.category;
    const searchTerm = event.queryStringParameters?.search;
    const isActive = event.queryStringParameters?.isActive === "true";
    const checkOptimizationReadiness =
      event.queryStringParameters?.checkOptimizationReadiness === "true";

    // Create filters object
    const filters: Record<string, any> = { restaurantId };

    // Add optional filters if provided
    if (category) {
      filters.category = category;
    }

    if (searchTerm) {
      filters.searchTerm = searchTerm;
    }

    if (event.queryStringParameters?.isActive !== undefined) {
      filters.isActive = isActive;
    }

    // Get menu items from repository
    const menuItemRepository = new MenuItemRepository();
    const menuItems = await menuItemRepository.list(filters);

    // Check optimization readiness if requested
    let optimizationReadiness;
    if (checkOptimizationReadiness) {
      optimizationReadiness =
        await menuItemRepository.checkOptimizationReadiness(restaurantId);
    }

    // Return menu items with optional optimization readiness
    const response: any = {
      menuItems,
    };

    if (optimizationReadiness) {
      response.optimizationReadiness = optimizationReadiness;
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(response),
    };
  } catch (error: any) {
    console.error("Error getting menu items:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Error getting menu items",
        error: error.message || String(error),
      }),
    };
  }
};
