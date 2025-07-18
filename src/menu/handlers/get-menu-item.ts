/**
 * Lambda function for retrieving a single menu item by ID
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
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

    // Get menu item from repository
    const menuItemRepository = new MenuItemRepository();
    const menuItem = await menuItemRepository.getById(itemId);

    // Check if menu item exists
    if (!menuItem) {
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

    // Return menu item
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        menuItem,
      }),
    };
  } catch (error: any) {
    console.error("Error getting menu item:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Error getting menu item",
        error: error.message || String(error),
      }),
    };
  }
};
