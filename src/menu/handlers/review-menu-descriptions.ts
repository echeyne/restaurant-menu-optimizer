/**
 * Handler for reviewing enhanced menu descriptions
 *
 * @param event API Gateway event
 * @returns API Gateway response
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { createResponse } from "../../models/api";
import { MenuItem } from "../../models/database";
import { MenuItemRepository } from "../../repositories/menu-item-repository";

/**
 * Result interface for individual menu description review
 */
interface ReviewResult {
  itemId: string;
  name: string;
  originalDescription: string;
  enhancedDescription: string;
  status: "approved" | "rejected";
  success: boolean;
  error?: string;
}

/**
 * Response interface for menu description review
 */
interface ReviewMenuDescriptionsResponse {
  message: string;
  processed: number;
  failed: number;
  results: ReviewResult[];
}

/**
 * Request body interface for menu description review
 */
interface ReviewMenuDescriptionRequest {
  itemId: string;
  status: "approved" | "rejected";
  feedback?: string;
}

/**
 * Request body interface for batch menu description review
 */
interface BatchReviewMenuDescriptionsRequest {
  items: {
    itemId: string;
    status: "approved" | "rejected";
    feedback?: string;
  }[];
}

/**
 * Process a single menu item description review
 *
 * @param itemId Menu item ID to review
 * @param status Approval status
 * @param feedback Optional feedback
 * @param menuItemRepository Menu item repository
 * @returns Processing result
 */
async function processReview(
  itemId: string,
  status: "approved" | "rejected",
  feedback: string | undefined,
  menuItemRepository: MenuItemRepository
): Promise<ReviewResult> {
  try {
    // Get the menu item
    const menuItem = await menuItemRepository.getById(itemId);
    if (!menuItem) {
      throw new Error(`Menu item with ID ${itemId} not found`);
    }

    // Check if the menu item has an enhanced description
    if (!menuItem.enhancedDescription) {
      throw new Error(
        `Menu item with ID ${itemId} has no enhanced description to review`
      );
    }

    // Update the status
    const updatedItem =
      await menuItemRepository.updateEnhancedDescriptionStatus(
        itemId,
        status,
        feedback
      );

    return {
      itemId: updatedItem.itemId,
      name: updatedItem.name,
      originalDescription: updatedItem.description,
      enhancedDescription: updatedItem.enhancedDescription || "",
      status,
      success: true,
    };
  } catch (error: any) {
    console.error(`Error reviewing description for item ${itemId}:`, error);
    return {
      itemId,
      name: "",
      originalDescription: "",
      enhancedDescription: "",
      status: status,
      success: false,
      error: error.message,
    };
  }
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Handle OPTIONS request for CORS
    if (event.httpMethod === "OPTIONS") {
      return createResponse(200, {});
    }

    // Initialize repository
    const menuItemRepository = new MenuItemRepository();

    // Check if this is a batch request or single item request
    const requestBody = JSON.parse(event.body || "{}");

    // Process based on request type
    let results: ReviewResult[] = [];
    let processed = 0;
    let failed = 0;

    if (Array.isArray(requestBody.items)) {
      // Batch processing
      const batchRequest = requestBody as BatchReviewMenuDescriptionsRequest;

      // Process each item in the batch
      for (const item of batchRequest.items) {
        const result = await processReview(
          item.itemId,
          item.status,
          item.feedback,
          menuItemRepository
        );

        results.push(result);
        if (result.success) {
          processed++;
        } else {
          failed++;
        }
      }
    } else {
      // Single item processing
      const singleRequest = requestBody as ReviewMenuDescriptionRequest;

      // Validate request
      if (!singleRequest.itemId || !singleRequest.status) {
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": "true",
          },
          body: JSON.stringify({
            message: "itemId and status are required",
          }),
        };
      }

      const result = await processReview(
        singleRequest.itemId,
        singleRequest.status,
        singleRequest.feedback,
        menuItemRepository
      );

      results.push(result);
      if (result.success) {
        processed++;
      } else {
        failed++;
      }
    }

    // Prepare response
    const response: ReviewMenuDescriptionsResponse = {
      message: `Menu description review completed for ${processed} items, failed for ${failed} items`,
      processed,
      failed,
      results,
    };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": "true",
      },
      body: JSON.stringify(response),
    };
  } catch (error: any) {
    console.error("Error reviewing menu descriptions:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": "true",
      },
      body: JSON.stringify({
        message: `Error reviewing menu descriptions: ${error.message}`,
      }),
    };
  }
};
