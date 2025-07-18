/**
 * Handler for analyzing taste profiles of menu items
 *
 * @param event API Gateway event
 * @returns API Gateway response
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { MenuItem } from "../../models/database";
import { MenuItemRepository } from "../../repositories/menu-item-repository";
import { QlooClient, TasteProfileRequest } from "../../services/qloo-client";
import { TasteProfileVisualizationService } from "../../services/taste-profile-visualization-service";
import { TasteProfileVisualizationRepository } from "../../repositories/taste-profile-visualization-repository";

/**
 * Result interface for individual taste profile analysis
 */
interface TasteProfileResult {
  itemId: string;
  name: string;
  success: boolean;
  error?: string;
}

/**
 * Response interface for taste profile analysis
 */
interface AnalyzeTasteProfileResponse {
  message: string;
  processed: number;
  failed: number;
  results: TasteProfileResult[];
  visualizationData?: any;
}

/**
 * Request body interface for taste profile analysis
 */
interface AnalyzeTasteProfileRequest {
  itemId?: string;
  restaurantId?: string;
  includeIngredients?: boolean;
  includeDietaryTags?: boolean;
  batchSize?: number;
}

/**
 * Process a single menu item for taste profile analysis
 *
 * @param menuItem Menu item to analyze
 * @param qlooClient Qloo API Client
 * @param menuItemRepository Menu item repository
 * @param options Analysis options
 * @returns Processing result
 */
async function processMenuItem(
  menuItem: MenuItem,
  qlooClient: QlooClient,
  menuItemRepository: MenuItemRepository,
  options: {
    includeIngredients: boolean;
    includeDietaryTags: boolean;
  }
): Promise<{ result: TasteProfileResult; visualizationData?: any }> {
  try {
    // Map the menu item to the format expected by Qloo API
    const mappedItem = mapMenuItemToQlooFormat(menuItem, options);

    // Create taste profile request with the menu item and mapped data
    const tasteProfileRequest: TasteProfileRequest = {
      menuItem: menuItem,
      includeIngredients: options.includeIngredients,
      includeDietaryTags: options.includeDietaryTags,
      mappedData: mappedItem, // Pass the mapped data to the Qloo client
    };

    // Analyze taste profile
    const tasteProfile = await qlooClient.analyzeTasteProfile(
      tasteProfileRequest
    );

    // Enrich the taste profile with additional metadata
    const enrichedTasteProfile = {
      ...tasteProfile,
      // Add timestamp for when the analysis was performed
      analyzedAt: new Date().toISOString(),
      // Add version information for future compatibility
      version: "1.0",
      // Add context information about what was included in the analysis
      analysisContext: {
        includedIngredients: options.includeIngredients,
        includedDietaryTags: options.includeDietaryTags,
      },
    };

    // Update menu item with taste profile
    const updatedMenuItem = await menuItemRepository.updateTasteProfile(
      menuItem.itemId,
      enrichedTasteProfile
    );

    // Generate visualization data
    const visualizationService = new TasteProfileVisualizationService();
    const visualizationData =
      visualizationService.processForVisualization(updatedMenuItem);

    // Generate taste profile summary
    const tasteProfileSummary =
      visualizationService.generateTasteProfileSummary(updatedMenuItem);

    // Save visualization data to repository
    const visualizationRepository = new TasteProfileVisualizationRepository();
    await visualizationRepository.saveVisualizationData(visualizationData);

    return {
      result: {
        itemId: menuItem.itemId,
        name: menuItem.name,
        success: true,
      },
      visualizationData: {
        visualization: visualizationData,
        summary: tasteProfileSummary,
      },
    };
  } catch (error: any) {
    console.error(
      `Error analyzing taste profile for item ${menuItem.itemId}:`,
      error
    );
    return {
      result: {
        itemId: menuItem.itemId,
        name: menuItem.name,
        success: false,
        error: error.message,
      },
    };
  }
}

/**
 * Map menu item to the format expected by Qloo API
 *
 * @param menuItem Menu item to map
 * @param options Additional options for mapping
 * @returns Mapped menu item for Qloo API
 */
function mapMenuItemToQlooFormat(
  menuItem: MenuItem,
  options: {
    includeIngredients: boolean;
    includeDietaryTags: boolean;
  }
): any {
  // Extract key information from the menu item
  const { name, description, price, category } = menuItem;

  // Create a structured representation for the Qloo API
  const mappedItem: any = {
    name,
    description,
    price,
    category,
    metadata: {
      itemId: menuItem.itemId,
      restaurantId: menuItem.restaurantId,
      isActive: menuItem.isActive,
      isAiGenerated: menuItem.isAiGenerated,
    },
  };

  // Conditionally include ingredients and dietary tags based on options
  if (options.includeIngredients && menuItem.ingredients) {
    mappedItem.ingredients = menuItem.ingredients;
  }

  if (options.includeDietaryTags && menuItem.dietaryTags) {
    mappedItem.dietaryTags = menuItem.dietaryTags;
  }

  return mappedItem;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Parse request body
    const requestBody: AnalyzeTasteProfileRequest = JSON.parse(
      event.body || "{}"
    );
    const {
      itemId,
      restaurantId,
      includeIngredients = true,
      includeDietaryTags = true,
      batchSize = 10,
    } = requestBody;

    // Validate request
    if (!itemId && !restaurantId) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": "true",
        },
        body: JSON.stringify({
          message: "Either itemId or restaurantId must be provided",
        }),
      };
    }

    // Initialize repositories and clients
    const menuItemRepository = new MenuItemRepository();
    const qlooClient = new QlooClient();

    // Process based on request type
    if (itemId) {
      // Single item processing
      const menuItem = await menuItemRepository.getById(itemId);
      if (!menuItem) {
        return {
          statusCode: 404,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": "true",
          },
          body: JSON.stringify({
            message: `Menu item with ID ${itemId} not found`,
          }),
        };
      }

      const processResult = await processMenuItem(
        menuItem,
        qlooClient,
        menuItemRepository,
        {
          includeIngredients,
          includeDietaryTags,
        }
      );

      const response: AnalyzeTasteProfileResponse = {
        message: processResult.result.success
          ? "Taste profile analysis completed successfully"
          : "Taste profile analysis failed",
        processed: 1,
        failed: processResult.result.success ? 0 : 1,
        results: [processResult.result],
        visualizationData: processResult.visualizationData,
      };

      return {
        statusCode: processResult.result.success ? 200 : 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": "true",
        },
        body: JSON.stringify(response),
      };
    } else {
      // Batch processing for restaurant
      const menuItems = await menuItemRepository.getByRestaurantId(
        restaurantId!
      );
      if (menuItems.length === 0) {
        return {
          statusCode: 404,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": "true",
          },
          body: JSON.stringify({
            message: `No menu items found for restaurant ID ${restaurantId}`,
          }),
        };
      }

      // Process items in batches to avoid overwhelming the Qloo API
      const results: TasteProfileResult[] = [];
      const visualizationResults: any[] = [];
      let processed = 0;
      let failed = 0;

      // Process in batches
      for (let i = 0; i < menuItems.length; i += batchSize) {
        const batch = menuItems.slice(i, i + batchSize);

        // Process batch in parallel
        const batchResults = await Promise.all(
          batch.map((menuItem) =>
            processMenuItem(menuItem, qlooClient, menuItemRepository, {
              includeIngredients,
              includeDietaryTags,
            })
          )
        );

        // Collect results
        for (const processResult of batchResults) {
          results.push(processResult.result);
          if (processResult.result.success) {
            processed++;
            if (processResult.visualizationData) {
              visualizationResults.push({
                itemId: processResult.result.itemId,
                ...processResult.visualizationData,
              });
            }
          } else {
            failed++;
          }
        }
      }

      const response: AnalyzeTasteProfileResponse = {
        message: `Taste profile analysis completed for ${processed} items, failed for ${failed} items`,
        processed,
        failed,
        results,
        visualizationData:
          visualizationResults.length > 0 ? visualizationResults : undefined,
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
    }
  } catch (error: any) {
    console.error("Error analyzing taste profiles:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": "true",
      },
      body: JSON.stringify({
        message: `Error analyzing taste profiles: ${error.message}`,
      }),
    };
  }
};
