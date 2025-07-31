/**
 * Lambda function for deleting a menu item
 * Removes a menu item from the database
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { createResponse } from "../../models/api";
import { MenuItemRepository } from "../../repositories/menu-item-repository";

/**
 * Handler for delete menu item requests
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

    // Get menu item repository
    const menuItemRepository = new MenuItemRepository();

    // Check if menu item exists
    const existingItem = await menuItemRepository.getById(itemId);
    if (!existingItem) {
      return createResponse(404, {
        message: `Menu item with ID ${itemId} not found`,
      });
    }

    // Delete menu item
    await menuItemRepository.delete(itemId);

    // Return success response
    return createResponse(200, {
      message: "Menu item deleted successfully",
      itemId,
    });
  } catch (error: any) {
    console.error("Error deleting menu item:", error);

    return createResponse(500, {
      message: "Error deleting menu item",
      error: error.message || String(error),
    });
  }
};
