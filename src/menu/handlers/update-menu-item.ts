/**
 * Lambda function for updating a menu item
 * Allows partial updates to menu item properties
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { MenuItemRepository } from "../../repositories/menu-item-repository";
import { MenuItem } from "../../models/database";
import { createResponse } from "../../models/api";

/**
 * Handler for update menu item requests
 * @param event API Gateway event
 * @returns API Gateway response
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return createResponse(200, {});
    }

    // Get item ID from path parameters (optional for creating new items)
    const itemId = event.pathParameters?.itemId;

    // Parse request body
    if (!event.body) {
      return createResponse(400, {
        message: "Request body is required",
      });
    }

    const updates = JSON.parse(event.body) as Partial<MenuItem>;

    // Validate updates
    if (Object.keys(updates).length === 0) {
      return createResponse(400, {
        message: "No updates provided",
      });
    }

    // Prevent updating of certain fields (only for updates, not creation)
    if (itemId) {
      const protectedFields = ["itemId", "restaurantId", "createdAt"];
      const hasProtectedFields = protectedFields.some(
        (field) => field in updates
      );

      if (hasProtectedFields) {
        return createResponse(400, {
          message: `Cannot update protected fields: ${protectedFields.join(
            ", "
          )}`,
        });
      }
    }

    // Get menu item repository
    const menuItemRepository = new MenuItemRepository();

    let resultItem: MenuItem;
    let message: string;

    if (!itemId) {
      // Creating a new menu item
      // Validate required fields for creation
      if (
        !updates.name ||
        !updates.restaurantId ||
        updates.price === undefined
      ) {
        return createResponse(400, {
          message:
            "Missing required fields for creating menu item: name, restaurantId, price",
        });
      }

      // Create new menu item
      const newItem = {
        ...updates,
        isActive: updates.isActive ?? true,
        isAiGenerated: updates.isAiGenerated ?? false,
        ingredients: updates.ingredients ?? [],
        dietaryTags: updates.dietaryTags ?? [],
        description: updates.description ?? "",
        category: updates.category ?? "Main Course",
      } as Omit<MenuItem, "itemId" | "createdAt" | "updatedAt">;

      resultItem = await menuItemRepository.create(newItem);
      message = "Menu item created successfully";
    } else {
      // Updating existing menu item
      const existingItem = await menuItemRepository.getById(itemId);
      if (!existingItem) {
        return createResponse(404, {
          message: `Menu item with ID ${itemId} not found`,
        });
      }

      resultItem = await menuItemRepository.update(itemId, updates);
      message = "Menu item updated successfully";
    }

    // Check if this update affects optimization readiness
    const optimizationReadiness =
      await menuItemRepository.checkOptimizationReadiness(
        resultItem.restaurantId
      );

    // Return updated/created menu item with optimization readiness info
    return createResponse(200, {
      message,
      menuItem: resultItem,
      optimizationReadiness,
    });
  } catch (error: any) {
    console.error("Error updating menu item:", error);

    return createResponse(500, {
      message: "Error updating menu item",
      error: error.message || String(error),
    });
  }
};
