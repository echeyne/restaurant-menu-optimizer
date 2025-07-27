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

    // Get item ID from path parameters
    const itemId = event.pathParameters?.itemId;

    // Validate item ID
    if (!itemId) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          message: "Missing required parameter: itemId",
        }),
      };
    }

    // Get menu item repository
    const menuItemRepository = new MenuItemRepository();

    // Check if menu item exists
    const existingItem = await menuItemRepository.getById(itemId);
    if (!existingItem) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          message: `Menu item with ID ${itemId} not found`,
        }),
      };
    }

    // Delete menu item
    await menuItemRepository.delete(itemId);

    // Return success response
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Menu item deleted successfully",
        itemId,
      }),
    };
  } catch (error: any) {
    console.error("Error deleting menu item:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Error deleting menu item",
        error: error.message || String(error),
      }),
    };
  }
};
