/**
 * Handler for enhancing menu descriptions using LLM
 *
 * @param event API Gateway event
 * @returns API Gateway response
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { MenuItem } from "../../models/database";
import { MenuItemRepository } from "../../repositories/menu-item-repository";
import { LLMService } from "../../services/llm-service";
import { LLMProvider } from "../../services/llm-client";
import { createResponse } from "../../models/api";
import { getUserIdFromToken } from "../../utils/auth-utils";

/**
 * Result interface for individual menu description enhancement
 */
interface EnhancementResult {
  itemId: string;
  name: string;
  originalDescription: string;
  enhancedDescription: string;
  enhancedDescriptionStatus?: "pending" | "approved" | "rejected";
  success: boolean;
  error?: string;
}

/**
 * Response interface for menu description enhancement
 */
interface EnhanceMenuDescriptionsResponse {
  message: string;
  processed: number;
  failed: number;
  results: EnhancementResult[];
}

/**
 * Request body interface for menu description enhancement
 */
interface EnhanceMenuDescriptionsRequest {
  itemId?: string;
  restaurantId?: string;
  category?: string;
  targetAudience?: string;
  enhancementStyle?: string;
  batchSize?: number;
  llmProvider?: LLMProvider;
}

/**
 * Generate a prompt for menu description enhancement
 *
 * @param menuItem Menu item to enhance
 * @param options Enhancement options
 * @returns Prompt for LLM
 */
function generateEnhancementPrompt(
  menuItem: MenuItem,
  options: {
    targetAudience?: string;
    enhancementStyle?: string;
  }
): { prompt: string; systemPrompt: string } {
  // Create a system prompt that instructs the LLM on how to enhance menu descriptions
  const systemPrompt = `You are an expert culinary writer specializing in creating compelling and appetizing menu descriptions. 
Your task is to enhance restaurant menu item descriptions to make them more appealing, descriptive, and enticing to customers.
Follow these guidelines:
1. Maintain the essence and key information of the original description
2. Use vivid, sensory language that appeals to taste, smell, texture, and appearance
3. Highlight quality ingredients and preparation methods
4. Keep the tone consistent with upscale restaurant menus
5. Be concise but descriptive (aim for 2-3 sentences)
6. Avoid clichés and generic phrases
7. Do not invent ingredients that aren't mentioned in the original description
8. Incorporate taste profile information when provided
9. Adapt the style to match the target audience when specified
10. Maintain any dietary information from the original description`;

  // Build the main prompt with all the menu item information
  let prompt = `Please enhance the following menu item description to make it more appealing and enticing to customers:\n\n`;

  // Add menu item details
  prompt += `Item Name: ${menuItem.name}\n`;
  prompt += `Category: ${menuItem.category}\n`;
  prompt += `Original Description: ${menuItem.description}\n`;
  prompt += `Price: $${menuItem.price.toFixed(2)}\n`;

  // Add ingredients if available
  if (menuItem.ingredients && menuItem.ingredients.length > 0) {
    prompt += `Ingredients: ${menuItem.ingredients.join(", ")}\n`;
  }

  // Add dietary tags if available
  if (menuItem.dietaryTags && menuItem.dietaryTags.length > 0) {
    prompt += `Dietary Information: ${menuItem.dietaryTags.join(", ")}\n`;
  }

  // Add taste profile information if available
  if (menuItem.qlooTasteProfile) {
    prompt += `\nTaste Profile Information:\n`;

    try {
      // Extract key taste profile elements
      const tasteProfile = menuItem.qlooTasteProfile;

      // Add flavor profile if available
      if (tasteProfile.flavors) {
        const topFlavors = Object.entries(tasteProfile.flavors)
          .sort((a: any, b: any) => b[1] - a[1])
          .slice(0, 3)
          .map(([flavor, _score]) => flavor);

        if (topFlavors.length > 0) {
          prompt += `Dominant Flavors: ${topFlavors.join(", ")}\n`;
        }
      }

      // Add texture information if available
      if (tasteProfile.textures) {
        const topTextures = Object.entries(tasteProfile.flavors)
          .sort((a: any, b: any) => b[1] - a[1])
          .slice(0, 2)
          .map(([flavor, _]) => flavor);

        if (topTextures.length > 0) {
          prompt += `Texture Profile: ${topTextures.join(", ")}\n`;
        }
      }

      // Add any other relevant taste profile information
      if (tasteProfile.summary) {
        prompt += `Taste Summary: ${tasteProfile.summary}\n`;
      }
    } catch (error) {
      // If there's an error parsing the taste profile, just skip it
      console.warn("Error parsing taste profile:", error);
    }
  }

  // Add target audience information if provided
  if (options.targetAudience) {
    prompt += `\nTarget Audience: ${options.targetAudience}\n`;
    prompt += `Please tailor the description to appeal specifically to this audience.\n`;
  }

  // Add enhancement style if provided
  if (options.enhancementStyle) {
    prompt += `\nDesired Style: ${options.enhancementStyle}\n`;
    prompt += `Please write the description in this style while maintaining professionalism.\n`;
  }

  // Final instructions
  prompt += `\nPlease provide ONLY the enhanced description text without any additional commentary or explanations. The description should be 2-3 sentences that would appear directly on a menu.`;

  return { prompt, systemPrompt };
}

/**
 * Process a single menu item for description enhancement
 *
 * @param menuItem Menu item to enhance
 * @param llmService LLM service
 * @param menuItemRepository Menu item repository
 * @param options Enhancement options
 * @returns Processing result
 */
async function processMenuItem(
  menuItem: MenuItem,
  llmService: LLMService,
  menuItemRepository: MenuItemRepository,
  options: {
    targetAudience?: string;
    enhancementStyle?: string;
    llmProvider?: LLMProvider;
  }
): Promise<EnhancementResult> {
  try {
    // Skip items that already have enhanced descriptions unless they're empty
    if (
      menuItem.enhancedDescription &&
      menuItem.enhancedDescription.trim() !== "" &&
      menuItem.enhancedDescriptionStatus === "approved"
    ) {
      return {
        itemId: menuItem.itemId,
        name: menuItem.name,
        originalDescription: menuItem.description,
        enhancedDescription: menuItem.enhancedDescription,
        enhancedDescriptionStatus: menuItem.enhancedDescriptionStatus,
        success: true,
      };
    }

    // Generate prompt for the LLM
    const { prompt, systemPrompt } = generateEnhancementPrompt(
      menuItem,
      options
    );

    // Use the specified LLM provider if provided, otherwise use default
    let enhancedDescription: string;
    let usedProvider = options.llmProvider;

    if (usedProvider) {
      const response = await llmService.completeWithProvider(usedProvider, {
        prompt,
        systemPrompt,
        temperature: 0.7, // Slightly creative but not too random
        maxTokens: 200, // Limit to a reasonable length for menu descriptions
      });
      enhancedDescription = response.text.trim();
    } else {
      const response = await llmService.complete({
        prompt,
        systemPrompt,
        temperature: 0.7,
        maxTokens: 200,
      });
      enhancedDescription = response.text.trim();
      usedProvider = LLMProvider.ANTHROPIC;
    }

    // Update the menu item with the enhanced description and set status to pending
    await menuItemRepository.updateEnhancedDescription(
      menuItem.itemId,
      enhancedDescription,
      {
        enhancementStyle: options.enhancementStyle,
        targetAudience: options.targetAudience,
        llmProvider: usedProvider,
      }
    );

    return {
      itemId: menuItem.itemId,
      name: menuItem.name,
      originalDescription: menuItem.description,
      enhancedDescription,
      enhancedDescriptionStatus: "pending",
      success: true,
    };
  } catch (error: any) {
    console.error(
      `Error enhancing description for item ${menuItem.itemId}:`,
      error
    );
    return {
      itemId: menuItem.itemId,
      name: menuItem.name,
      originalDescription: menuItem.description,
      enhancedDescription: "",
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

    // Validate user authentication
    const userId = await getUserIdFromToken(event);
    if (!userId) {
      return createResponse(401, {
        message: "Unauthorized",
      });
    }

    // Parse request body
    const requestBody: EnhanceMenuDescriptionsRequest = JSON.parse(
      event.body || "{}"
    );
    const {
      itemId,
      restaurantId,
      category,
      targetAudience,
      enhancementStyle,
      batchSize = 5, // Process fewer items at once compared to taste profile analysis
      llmProvider,
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

    // Initialize repositories and services
    const menuItemRepository = new MenuItemRepository();
    const llmService = new LLMService();

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

      const result = await processMenuItem(
        menuItem,
        llmService,
        menuItemRepository,
        {
          targetAudience,
          enhancementStyle,
          llmProvider,
        }
      );

      const response: EnhanceMenuDescriptionsResponse = {
        message: result.success
          ? "Menu description enhanced successfully"
          : "Failed to enhance menu description",
        processed: 1,
        failed: result.success ? 0 : 1,
        results: [result],
      };

      return {
        statusCode: result.success ? 200 : 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": "true",
        },
        body: JSON.stringify(response),
      };
    } else {
      // Batch processing for restaurant
      let menuItems: MenuItem[];

      if (category) {
        // Get menu items for a specific category
        menuItems = await menuItemRepository.getByRestaurantId(
          restaurantId!,
          category
        );
      } else {
        // Get all menu items for the restaurant
        menuItems = await menuItemRepository.getByRestaurantId(restaurantId!);
      }

      if (menuItems.length === 0) {
        return {
          statusCode: 404,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": "true",
          },
          body: JSON.stringify({
            message: `No menu items found for restaurant ID ${restaurantId}${
              category ? ` in category ${category}` : ""
            }`,
          }),
        };
      }

      // Process items in batches to avoid overwhelming the LLM API
      const results: EnhancementResult[] = [];
      let processed = 0;
      let failed = 0;

      // Process in batches
      for (let i = 0; i < menuItems.length; i += batchSize) {
        const batch = menuItems.slice(i, i + batchSize);

        // Process batch in parallel
        const batchResults = await Promise.all(
          batch.map((menuItem) =>
            processMenuItem(menuItem, llmService, menuItemRepository, {
              targetAudience,
              enhancementStyle,
              llmProvider,
            })
          )
        );

        // Collect results
        for (const result of batchResults) {
          results.push(result);
          if (result.success) {
            processed++;
          } else {
            failed++;
          }
        }
      }

      const response: EnhanceMenuDescriptionsResponse = {
        message: `Menu description enhancement completed for ${processed} items, failed for ${failed} items`,
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
    }
  } catch (error: any) {
    console.error("Error enhancing menu descriptions:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": "true",
      },
      body: JSON.stringify({
        message: `Error enhancing menu descriptions: ${error.message}`,
      }),
    };
  }
};
