/**
 * Handler for comparing taste profiles of menu items
 *
 * @param event API Gateway event
 * @returns API Gateway response
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { MenuItemRepository } from "../../repositories/menu-item-repository";
import { TasteProfileVisualizationService } from "../../services/taste-profile-visualization-service";
import { TasteProfileVisualizationRepository } from "../../repositories/taste-profile-visualization-repository";
import { createResponse } from "../../models/api";
import { getUserIdFromToken } from "../../utils/auth-utils";

/**
 * Request body interface for taste profile comparison
 */
interface CompareTasteProfilesRequest {
  item1Id: string;
  item2Id: string;
  restaurantId?: string; // Optional, for validation
}

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

    // Parse request body
    const requestBody: CompareTasteProfilesRequest = JSON.parse(
      event.body || "{}"
    );
    const { item1Id, item2Id, restaurantId } = requestBody;

    // Validate request
    if (!item1Id || !item2Id) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": "true",
        },
        body: JSON.stringify({
          message: "Both item1Id and item2Id must be provided",
        }),
      };
    }

    // Initialize repositories and services
    const menuItemRepository = new MenuItemRepository();
    const visualizationService = new TasteProfileVisualizationService();
    const visualizationRepository = new TasteProfileVisualizationRepository();

    // Check if comparison already exists
    const existingComparison = await visualizationRepository.getComparison(
      item1Id,
      item2Id
    );

    if (existingComparison) {
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": "true",
        },
        body: JSON.stringify({
          message: "Taste profile comparison retrieved successfully",
          comparison: existingComparison.comparisonData,
          cached: true,
        }),
      };
    }

    // Fetch menu items
    const menuItem1 = await menuItemRepository.getById(item1Id);
    const menuItem2 = await menuItemRepository.getById(item2Id);

    // Validate menu items
    if (!menuItem1 || !menuItem2) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": "true",
        },
        body: JSON.stringify({
          message: `Menu item not found: ${!menuItem1 ? item1Id : item2Id}`,
        }),
      };
    }

    // Validate restaurant ID if provided
    if (
      restaurantId &&
      (menuItem1.restaurantId !== restaurantId ||
        menuItem2.restaurantId !== restaurantId)
    ) {
      return {
        statusCode: 403,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": "true",
        },
        body: JSON.stringify({
          message: "Menu items do not belong to the specified restaurant",
        }),
      };
    }

    // Validate taste profiles
    if (!menuItem1.qlooTasteProfile || !menuItem2.qlooTasteProfile) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": "true",
        },
        body: JSON.stringify({
          message: `Taste profile not available for menu item: ${
            !menuItem1.qlooTasteProfile ? item1Id : item2Id
          }`,
        }),
      };
    }

    // Generate comparison
    const comparison = visualizationService.compareTasteProfiles(
      menuItem1,
      menuItem2
    );

    // Save comparison to repository
    await visualizationRepository.saveComparison(
      comparison,
      menuItem1.restaurantId
    );

    // Generate visualization data for both items if not already available
    const visualizationData1 = await visualizationRepository.getByItemId(
      item1Id
    );
    const visualizationData2 = await visualizationRepository.getByItemId(
      item2Id
    );

    if (!visualizationData1) {
      const visualization1 =
        visualizationService.processForVisualization(menuItem1);
      await visualizationRepository.saveVisualizationData(visualization1);
    }

    if (!visualizationData2) {
      const visualization2 =
        visualizationService.processForVisualization(menuItem2);
      await visualizationRepository.saveVisualizationData(visualization2);
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": "true",
      },
      body: JSON.stringify({
        message: "Taste profile comparison generated successfully",
        comparison,
        cached: false,
      }),
    };
  } catch (error: any) {
    console.error("Error comparing taste profiles:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": "true",
      },
      body: JSON.stringify({
        message: `Error comparing taste profiles: ${error.message}`,
      }),
    };
  }
};
