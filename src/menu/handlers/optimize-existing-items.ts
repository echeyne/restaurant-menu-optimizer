/**
 * Lambda function for optimizing existing menu item names and descriptions
 * Uses demographics data to enhance dish names and descriptions via LLM
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { MenuItemRepository } from "../../repositories/menu-item-repository";
import { DemographicsDataRepository } from "../../repositories/demographics-data-repository";
import { OptimizedMenuItemsRepository } from "../../repositories/optimized-menu-items-repository";
import { LLMService } from "../../services/llm-service";
import {
  MenuItem,
  DemographicsData,
  OptimizedMenuItem,
} from "../../models/database";
import { createResponse } from "../../models/api";
import { getUserIdFromToken } from "../../utils/auth-utils";

/**
 * Interface for optimization request
 */
interface OptimizeExistingItemsRequest {
  restaurantId: string;
  itemIds?: string[]; // Optional: specific items to optimize, if not provided, optimize all active items
  optimizationStyle?: "casual" | "upscale" | "trendy" | "traditional";
  targetAudience?: string; // Optional: specific target audience override
}

/**
 * Interface for optimization response
 */
interface OptimizeExistingItemsResponse {
  restaurantId: string;
  optimizedItems: OptimizedMenuItem[];
  totalItemsProcessed: number;
  successCount: number;
  failureCount: number;
  errors?: string[];
}

/**
 * Handler for optimizing existing menu items
 * @param event API Gateway event
 * @returns API Gateway response with optimization results
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

    const request: OptimizeExistingItemsRequest = JSON.parse(event.body);

    // Validate required fields
    if (!request.restaurantId) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          message: "Missing required field: restaurantId",
        }),
      };
    }

    // Initialize repositories and services
    const menuItemRepository = new MenuItemRepository();
    const demographicsRepository = new DemographicsDataRepository();
    const optimizedItemsRepository = new OptimizedMenuItemsRepository();
    const llmService = new LLMService();

    // Get demographics data
    const demographicsData = await demographicsRepository.getById(
      request.restaurantId
    );
    if (!demographicsData) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          message:
            "Demographics data not found. Please complete restaurant profile setup first.",
        }),
      };
    }

    // Get menu items to optimize
    let menuItems: MenuItem[];
    if (request.itemIds && request.itemIds.length > 0) {
      // Get specific items
      menuItems = [];
      for (const itemId of request.itemIds) {
        const item = await menuItemRepository.getById(itemId);
        if (
          item &&
          item.restaurantId === request.restaurantId &&
          item.isActive
        ) {
          menuItems.push(item);
        }
      }
    } else {
      // Get all active items for the restaurant
      menuItems = await menuItemRepository.getActiveByRestaurantId(
        request.restaurantId
      );
    }

    if (menuItems.length === 0) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          message: "No active menu items found to optimize",
        }),
      };
    }

    // Process optimization
    const optimizedItems: OptimizedMenuItem[] = [];
    const errors: string[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const menuItem of menuItems) {
      try {
        const optimizedItem = await optimizeMenuItem(
          menuItem,
          demographicsData,
          llmService,
          request.optimizationStyle,
          request.targetAudience
        );

        // Save optimized item
        const savedOptimizedItem = await optimizedItemsRepository.create(
          optimizedItem
        );
        optimizedItems.push(savedOptimizedItem);
        successCount++;
      } catch (error: any) {
        console.error(`Error optimizing item ${menuItem.itemId}:`, error);
        errors.push(`Failed to optimize "${menuItem.name}": ${error.message}`);
        failureCount++;
      }
    }

    // Prepare response
    const response: OptimizeExistingItemsResponse = {
      restaurantId: request.restaurantId,
      optimizedItems,
      totalItemsProcessed: menuItems.length,
      successCount,
      failureCount,
      errors: errors.length > 0 ? errors : undefined,
    };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(response),
    };
  } catch (error: any) {
    console.error("Error optimizing existing items:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Error optimizing existing items",
        error: error.message || String(error),
      }),
    };
  }
};

/**
 * Optimize a single menu item using LLM and demographics data
 * @param menuItem Menu item to optimize
 * @param demographicsData Demographics data for the restaurant
 * @param llmService LLM service instance
 * @param optimizationStyle Style of optimization
 * @param targetAudience Target audience override
 * @returns Optimized menu item
 */
async function optimizeMenuItem(
  menuItem: MenuItem,
  demographicsData: DemographicsData,
  llmService: LLMService,
  optimizationStyle?: string,
  targetAudience?: string
): Promise<OptimizedMenuItem> {
  // Build demographic insights for the prompt
  const demographicInsights = buildDemographicInsights(demographicsData);

  // Create optimization prompt
  const prompt = createOptimizationPrompt(
    menuItem,
    demographicInsights,
    optimizationStyle,
    targetAudience
  );

  // Call LLM for optimization
  const response = await llmService.complete({
    prompt,
    maxTokens: 500,
    temperature: 0.7,
  });

  // Parse LLM response
  const optimizationResult = parseLLMResponse(response.text);

  // Create optimized menu item record
  const optimizedItem: OptimizedMenuItem = {
    itemId: menuItem.itemId,
    restaurantId: menuItem.restaurantId,
    originalName: menuItem.name,
    optimizedName: optimizationResult.optimizedName || menuItem.name,
    originalDescription: menuItem.description,
    optimizedDescription:
      optimizationResult.optimizedDescription || menuItem.description,
    optimizationReason:
      optimizationResult.reason || "Enhanced based on demographic preferences",
    demographicInsights,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  return optimizedItem;
}

/**
 * Build demographic insights string from demographics data
 * @param demographicsData Demographics data
 * @returns Array of demographic insights
 */
function buildDemographicInsights(
  demographicsData: DemographicsData
): string[] {
  const insights: string[] = [];

  // Age group insights
  if (demographicsData.ageGroups && demographicsData.ageGroups.length > 0) {
    const primaryAgeGroup = demographicsData.ageGroups.sort(
      (a, b) => b.percentage - a.percentage
    )[0];
    insights.push(
      `Primary age group: ${primaryAgeGroup.ageRange} (${primaryAgeGroup.percentage}%)`
    );

    if (primaryAgeGroup.preferences && primaryAgeGroup.preferences.length > 0) {
      insights.push(
        `Age group preferences: ${primaryAgeGroup.preferences.join(", ")}`
      );
    }
  }

  // Interest insights
  if (demographicsData.interests && demographicsData.interests.length > 0) {
    insights.push(
      `Customer interests: ${demographicsData.interests.slice(0, 5).join(", ")}`
    );
  }

  // Dining pattern insights
  if (
    demographicsData.diningPatterns &&
    demographicsData.diningPatterns.length > 0
  ) {
    const topPattern = demographicsData.diningPatterns.sort(
      (a, b) => b.frequency - a.frequency
    )[0];
    insights.push(
      `Primary dining pattern: ${topPattern.pattern} (${topPattern.frequency}% frequency)`
    );

    if (topPattern.timeOfDay && topPattern.timeOfDay.length > 0) {
      insights.push(`Popular dining times: ${topPattern.timeOfDay.join(", ")}`);
    }
  }

  return insights;
}

/**
 * Create optimization prompt for LLM
 * @param menuItem Menu item to optimize
 * @param demographicInsights Demographic insights
 * @param optimizationStyle Style of optimization
 * @param targetAudience Target audience
 * @returns Optimization prompt
 */
function createOptimizationPrompt(
  menuItem: MenuItem,
  demographicInsights: string[],
  optimizationStyle?: string,
  targetAudience?: string
): string {
  const style = optimizationStyle || "appealing";
  const audience =
    targetAudience || "the restaurant's primary customer demographic";

  return `You are a professional menu consultant helping to optimize menu item names and descriptions based on customer demographics.

MENU ITEM TO OPTIMIZE:
Name: "${menuItem.name}"
Description: "${menuItem.description}"
Category: ${menuItem.category}
Price: $${menuItem.price}
${
  menuItem.ingredients.length > 0
    ? `Ingredients: ${menuItem.ingredients.join(", ")}`
    : ""
}
${
  menuItem.dietaryTags.length > 0
    ? `Dietary Tags: ${menuItem.dietaryTags.join(", ")}`
    : ""
}

CUSTOMER DEMOGRAPHICS:
${demographicInsights.join("\n")}

OPTIMIZATION REQUIREMENTS:
- Style: ${style}
- Target Audience: ${audience}
- Keep the essence and accuracy of the original dish
- Make the name and description more appealing to the target demographic
- Use language and terminology that resonates with the customer base
- Highlight aspects that would appeal to their interests and preferences
- Maintain authenticity while enhancing appeal

Please provide your optimization in the following JSON format:
{
  "optimizedName": "Enhanced dish name that appeals to the target demographic",
  "optimizedDescription": "Enhanced description that highlights appealing aspects for the target audience",
  "reason": "Brief explanation of why these changes appeal to the demographic"
}

Focus on making the menu item more appealing while staying true to the original dish.`;
}

/**
 * Parse LLM response to extract optimization results
 * @param content LLM response content
 * @returns Parsed optimization result
 */
function parseLLMResponse(content: string): {
  optimizedName?: string;
  optimizedDescription?: string;
  reason?: string;
} {
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        optimizedName: parsed.optimizedName,
        optimizedDescription: parsed.optimizedDescription,
        reason: parsed.reason,
      };
    }
  } catch (error) {
    console.error("Error parsing LLM response:", error);
  }

  // Fallback: return empty result if parsing fails
  return {};
}
