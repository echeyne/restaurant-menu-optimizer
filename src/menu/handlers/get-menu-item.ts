/**
 * Lambda function for retrieving a single menu item by ID
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { createResponse } from "../../models/api";
import { MenuItemRepository } from "../../repositories/menu-item-repository";

/**
 * Handler for get menu item requests
 * @param event API Gateway event
 * @returns API Gateway response
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Handle OPTIONS request for CORS
    if (event.httpMethod === "OPTIONS") {
      return createResponse(200, {});
    }

    // Get item ID from query parameters
    const itemId = event.queryStringParameters?.itemId;

    // Validate item ID
    if (!itemId) {
      return createResponse(400, {
        message: "Missing required parameter: itemId",
      });
    }

    // Get menu item from repository
    const menuItemRepository = new MenuItemRepository();
    const menuItem = await menuItemRepository.getById(itemId);

    // Check if menu item exists
    if (!menuItem) {
      return createResponse(404, {
        message: `Menu item with ID ${itemId} not found`,
      });
    }

    // Return menu item
    return createResponse(200, {
      menuItem,
    });
  } catch (error: any) {
    console.error("Error getting menu item:", error);

    return createResponse(500, {
      message: "Error getting menu item",
      error: error.message || String(error),
    });
  }
};
