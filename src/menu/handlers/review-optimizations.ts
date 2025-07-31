/**
 * Lambda function for reviewing and approving/rejecting optimized menu items and suggestions
 * Presents optimization results for user review and implements approval/rejection mechanism
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { OptimizedMenuItemsRepository } from "../../repositories/optimized-menu-items-repository";
import { SuggestionRepository } from "../../repositories/suggestion-repository";
import { MenuItemRepository } from "../../repositories/menu-item-repository";
import {
  OptimizedMenuItem,
  MenuItemSuggestion,
  MenuItem,
} from "../../models/database";
import { createResponse } from "../../models/api";
import { getUserIdFromToken } from "../../utils/auth-utils";

/**
 * Type of optimization to review
 */
enum OptimizationType {
  EXISTING_ITEMS = "existing_items",
  NEW_ITEMS = "new_items",
}

/**
 * Interface for review request
 */
interface ReviewOptimizationsRequest {
  restaurantId: string;
  type: OptimizationType;
  itemId?: string; // For single item review
  status?: "approved" | "rejected"; // For updating status
  feedback?: string; // Optional feedback for rejections
}

/**
 * Interface for review response
 */
interface ReviewOptimizationsResponse {
  restaurantId: string;
  type: OptimizationType;
  pendingItems: Array<OptimizedMenuItem | MenuItemSuggestion>;
  approvedItems: Array<OptimizedMenuItem | MenuItemSuggestion>;
  rejectedItems: Array<OptimizedMenuItem | MenuItemSuggestion>;
  updatedItem?: OptimizedMenuItem | MenuItemSuggestion;
  message?: string;
}

/**
 * Handler for reviewing optimizations
 * @param event API Gateway event
 * @returns API Gateway response with optimization review results
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Handle OPTIONS request for CORS
    if (event.httpMethod === "OPTIONS") {
      return createResponse(200, {});
    }

    // Validate user authentication
    const userId = await getUserIdFromToken(event);
    if (!userId) {
      return createResponse(401, {
        message: "Unauthorized",
      });
    }

    // Initialize repositories
    const optimizedItemsRepository = new OptimizedMenuItemsRepository();
    const suggestionRepository = new SuggestionRepository();
    const menuItemRepository = new MenuItemRepository();

    // Handle GET request to fetch optimization items
    if (event.httpMethod === "GET") {
      const restaurantId = event.queryStringParameters?.restaurantId;
      const type = event.queryStringParameters?.type as OptimizationType;

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

      if (!type || !Object.values(OptimizationType).includes(type)) {
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            message:
              "Invalid or missing parameter: type (must be 'existing_items' or 'new_items')",
          }),
        };
      }

      // Get items based on type
      let pendingItems: Array<OptimizedMenuItem | MenuItemSuggestion> = [];
      let approvedItems: Array<OptimizedMenuItem | MenuItemSuggestion> = [];
      let rejectedItems: Array<OptimizedMenuItem | MenuItemSuggestion> = [];

      if (type === OptimizationType.EXISTING_ITEMS) {
        pendingItems = await optimizedItemsRepository.getByRestaurantId(
          restaurantId,
          "pending"
        );
        approvedItems = await optimizedItemsRepository.getByRestaurantId(
          restaurantId,
          "approved"
        );
        rejectedItems = await optimizedItemsRepository.getByRestaurantId(
          restaurantId,
          "rejected"
        );
      } else {
        pendingItems = await suggestionRepository.getByStatus(
          restaurantId,
          "pending"
        );
        approvedItems = await suggestionRepository.getByStatus(
          restaurantId,
          "approved"
        );
        rejectedItems = await suggestionRepository.getByStatus(
          restaurantId,
          "rejected"
        );
      }

      const response: ReviewOptimizationsResponse = {
        restaurantId,
        type,
        pendingItems,
        approvedItems,
        rejectedItems,
      };

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify(response),
      };
    }

    // Handle POST request to update optimization status
    if (event.httpMethod === "POST") {
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

      const request: ReviewOptimizationsRequest = JSON.parse(event.body);

      // Validate required fields
      if (
        !request.restaurantId ||
        !request.type ||
        !request.itemId ||
        !request.status
      ) {
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            message:
              "Missing required fields: restaurantId, type, itemId, and status are required",
          }),
        };
      }

      // Validate status
      if (request.status !== "approved" && request.status !== "rejected") {
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            message: "Invalid status: must be 'approved' or 'rejected'",
          }),
        };
      }

      let updatedItem: OptimizedMenuItem | MenuItemSuggestion | null = null;
      let message = "";

      // Update status based on type
      if (request.type === OptimizationType.EXISTING_ITEMS) {
        // Update optimized menu item status
        updatedItem = await optimizedItemsRepository.updateStatus(
          request.itemId,
          request.status
        );

        // If approved, update the original menu item with optimized content
        if (request.status === "approved") {
          const optimizedItem = updatedItem as OptimizedMenuItem;

          // Get the original menu item
          const menuItem = await menuItemRepository.getById(
            optimizedItem.itemId
          );

          if (menuItem) {
            // Update with optimized content
            const updates = {
              name: optimizedItem.optimizedName,
              description: optimizedItem.optimizedDescription,
            };

            await menuItemRepository.update(menuItem.itemId, updates);

            // Also update the enhanced name and description status to approved
            if (menuItem.enhancedName) {
              await menuItemRepository.updateEnhancedNameStatus(
                menuItem.itemId,
                "approved"
              );
            }

            if (menuItem.enhancedDescription) {
              await menuItemRepository.updateEnhancedDescriptionStatus(
                menuItem.itemId,
                "approved"
              );
            }

            message = "Optimized menu item approved and applied to menu";
          } else {
            message =
              "Optimized menu item approved but original menu item not found";
          }
        } else {
          message = "Optimized menu item rejected";
        }
      } else {
        // Update menu item suggestion status
        updatedItem = await suggestionRepository.updateStatus(
          request.itemId,
          request.status
        );

        // If approved, create a new menu item from the suggestion
        if (request.status === "approved") {
          const suggestion = updatedItem as MenuItemSuggestion;

          // Convert suggestion to menu item
          const suggestionData = await suggestionRepository.convertToMenuItem(
            suggestion.suggestionId
          );

          // Create new menu item
          const newMenuItem: Omit<
            MenuItem,
            "itemId" | "createdAt" | "updatedAt"
          > = {
            restaurantId: suggestionData.restaurantId,
            name: suggestionData.name,
            description: suggestionData.description,
            enhancedName: suggestionData.name, // Store in enhancedName as well
            enhancedDescription: suggestionData.description, // Store in enhancedDescription as well
            enhancedNameStatus: "approved", // Mark as approved since it's AI-generated
            enhancedDescriptionStatus: "approved", // Mark as approved since it's AI-generated
            price: suggestionData.estimatedPrice,
            category: suggestionData.category,
            ingredients: suggestionData.suggestedIngredients || [],
            dietaryTags: suggestionData.dietaryTags || [],
            isActive: true,
            isAiGenerated: true,
          };

          await menuItemRepository.create(newMenuItem);
          message = "New menu item suggestion approved and added to menu";
        } else {
          message = "New menu item suggestion rejected";
        }
      }

      // Get updated lists after status change
      let pendingItems: Array<OptimizedMenuItem | MenuItemSuggestion> = [];
      let approvedItems: Array<OptimizedMenuItem | MenuItemSuggestion> = [];
      let rejectedItems: Array<OptimizedMenuItem | MenuItemSuggestion> = [];

      if (request.type === OptimizationType.EXISTING_ITEMS) {
        pendingItems = await optimizedItemsRepository.getByRestaurantId(
          request.restaurantId,
          "pending"
        );
        approvedItems = await optimizedItemsRepository.getByRestaurantId(
          request.restaurantId,
          "approved"
        );
        rejectedItems = await optimizedItemsRepository.getByRestaurantId(
          request.restaurantId,
          "rejected"
        );
      } else {
        pendingItems = await suggestionRepository.getByStatus(
          request.restaurantId,
          "pending"
        );
        approvedItems = await suggestionRepository.getByStatus(
          request.restaurantId,
          "approved"
        );
        rejectedItems = await suggestionRepository.getByStatus(
          request.restaurantId,
          "rejected"
        );
      }

      const response: ReviewOptimizationsResponse = {
        restaurantId: request.restaurantId,
        type: request.type,
        pendingItems,
        approvedItems,
        rejectedItems,
        updatedItem: updatedItem || undefined,
        message,
      };

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify(response),
      };
    }

    // Handle unsupported methods
    return {
      statusCode: 405,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Method not allowed",
      }),
    };
  } catch (error: any) {
    console.error("Error reviewing optimizations:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Error reviewing optimizations",
        error: error.message || String(error),
      }),
    };
  }
};
