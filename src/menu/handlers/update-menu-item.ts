/**
 * Lambda function for updating a menu item
 * Allows partial updates to menu item properties
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { MenuItemRepository } from "../../repositories/menu-item-repository";
import { MenuItem } from "../../models/database";

/**
 * Handler for update menu item requests
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

    // Parse request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          message: "Request body is required",
        }),
      };
    }

    const updates = JSON.parse(event.body) as Partial<MenuItem>;

    // Validate updates
    if (Object.keys(updates).length === 0) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          message: "No updates provided",
        }),
      };
    }

    // Prevent updating of certain fields
    const protectedFields = ["itemId", "restaurantId", "createdAt"];
    const hasProtectedFields = protectedFields.some(
      (field) => field in updates
    );

    if (hasProtectedFields) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          message: `Cannot update protected fields: ${protectedFields.join(
            ", "
          )}`,
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

    // Update menu item
    const updatedItem = await menuItemRepository.update(itemId, updates);

    // Check if this update affects optimization readiness
    const optimizationReadiness =
      await menuItemRepository.checkOptimizationReadiness(
        existingItem.restaurantId
      );

    // Return updated menu item with optimization readiness info
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Menu item updated successfully",
        menuItem: updatedItem,
        optimizationReadiness,
      }),
    };
  } catch (error: any) {
    console.error("Error updating menu item:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Error updating menu item",
        error: error.message || String(error),
      }),
    };
  }
};
