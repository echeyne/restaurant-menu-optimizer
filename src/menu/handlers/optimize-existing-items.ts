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
 * Interface for selected demographics for optimization
 */
interface SelectedDemographics {
  selectedAgeGroups: string[];
  selectedGenders: string[];
  selectedInterests: string[];
}

/**
 * Interface for selected specialty dish
 */
interface SelectedSpecialtyDish {
  dishName: string;
  tagId: string;
  restaurantName: string;
  popularity: number;
  weight: number; // Weight indicating customer preference strength
  businessRating: number;
}

/**
 * Interface for optimization request
 */
interface OptimizeExistingItemsRequest {
  restaurantId: string;
  itemIds?: string[]; // Optional: specific items to optimize, if not provided, optimize all active items
  selectedDemographics: SelectedDemographics; // Required: user-selected demographic groups
  selectedSpecialtyDishes?: SelectedSpecialtyDish[]; // Optional: highly rated specialty dishes from similar restaurants
  optimizationStyle?: "casual" | "upscale" | "trendy" | "traditional";
  targetAudience?: string; // Optional: specific target audience override
  cuisineType?: string; // Optional: cuisine type for optimization context
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

    if (!request.selectedDemographics) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          message: "Missing required field: selectedDemographics",
        }),
      };
    }

    // Validate that at least one demographic group is selected
    const hasSelectedDemographics =
      (request.selectedDemographics.selectedAgeGroups &&
        request.selectedDemographics.selectedAgeGroups.length > 0) ||
      (request.selectedDemographics.selectedGenders &&
        request.selectedDemographics.selectedGenders.length > 0) ||
      (request.selectedDemographics.selectedInterests &&
        request.selectedDemographics.selectedInterests.length > 0);

    if (!hasSelectedDemographics) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          message:
            "At least one demographic group must be selected for optimization",
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
          request.selectedDemographics,
          request.selectedSpecialtyDishes || [],
          llmService,
          request.optimizationStyle,
          request.targetAudience,
          request.cuisineType
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
 * @param selectedDemographics User-selected demographic groups
 * @param selectedSpecialtyDishes Highly rated specialty dishes from similar restaurants
 * @param llmService LLM service instance
 * @param optimizationStyle Style of optimization
 * @param targetAudience Target audience override
 * @returns Optimized menu item
 */
async function optimizeMenuItem(
  menuItem: MenuItem,
  demographicsData: DemographicsData,
  selectedDemographics: SelectedDemographics,
  selectedSpecialtyDishes: SelectedSpecialtyDish[],
  llmService: LLMService,
  optimizationStyle?: string,
  targetAudience?: string,
  cuisineType?: string
): Promise<OptimizedMenuItem> {
  // Build demographic insights for the prompt using selected demographics
  const demographicInsights = buildSelectedDemographicInsights(
    demographicsData,
    selectedDemographics
  );

  // Create optimization prompt with selected demographics and specialty dishes
  const prompt = createOptimizationPrompt(
    menuItem,
    demographicInsights,
    selectedSpecialtyDishes,
    optimizationStyle,
    targetAudience,
    cuisineType
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
 * Build demographic insights string from selected demographics data
 * @param demographicsData Demographics data
 * @param selectedDemographics User-selected demographic groups
 * @returns Array of demographic insights
 */
function buildSelectedDemographicInsights(
  demographicsData: DemographicsData,
  selectedDemographics: SelectedDemographics
): string[] {
  const insights: string[] = [];

  // Selected age group insights
  if (
    selectedDemographics.selectedAgeGroups &&
    selectedDemographics.selectedAgeGroups.length > 0
  ) {
    const selectedAgeGroupData =
      demographicsData.ageGroups?.filter((ageGroup) =>
        selectedDemographics.selectedAgeGroups.includes(ageGroup.ageRange)
      ) || [];

    if (selectedAgeGroupData.length > 0) {
      const ageGroupNames = selectedAgeGroupData.map(
        (ag) => `${ag.ageRange} (${ag.percentage}%)`
      );
      insights.push(`Target age groups: ${ageGroupNames.join(", ")}`);

      // Collect all preferences from selected age groups
      const allPreferences = selectedAgeGroupData.flatMap(
        (ag) => ag.preferences || []
      );
      const uniquePreferences = allPreferences.filter(
        (value, index, self) => self.indexOf(value) === index
      );
      if (uniquePreferences.length > 0) {
        insights.push(`Age group preferences: ${uniquePreferences.join(", ")}`);
      }
    }
  }

  // Selected gender insights
  if (
    selectedDemographics.selectedGenders &&
    selectedDemographics.selectedGenders.length > 0
  ) {
    const selectedGenderData =
      demographicsData.genders?.filter((gender) =>
        selectedDemographics.selectedGenders.includes(gender.gender)
      ) || [];

    if (selectedGenderData.length > 0) {
      const genderNames = selectedGenderData.map(
        (g) => `${g.gender} (${g.percentage}%)`
      );
      insights.push(`Target genders: ${genderNames.join(", ")}`);

      // Collect all preferences from selected genders
      const allPreferences = selectedGenderData.flatMap(
        (g) => g.preferences || []
      );
      const uniquePreferences = allPreferences.filter(
        (value, index, self) => self.indexOf(value) === index
      );
      if (uniquePreferences.length > 0) {
        insights.push(`Gender preferences: ${uniquePreferences.join(", ")}`);
      }
    }
  }

  // Selected interest insights
  if (
    selectedDemographics.selectedInterests &&
    selectedDemographics.selectedInterests.length > 0
  ) {
    const availableInterests = demographicsData.interests || [];
    const validSelectedInterests =
      selectedDemographics.selectedInterests.filter((interest) =>
        availableInterests.includes(interest)
      );

    if (validSelectedInterests.length > 0) {
      insights.push(`Target interests: ${validSelectedInterests.join(", ")}`);
    }
  }

  // Include dining pattern insights if available (not user-selectable but provides context)
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
 * @param selectedSpecialtyDishes Highly rated specialty dishes from similar restaurants
 * @param optimizationStyle Style of optimization
 * @param targetAudience Target audience
 * @returns Optimization prompt
 */
function createOptimizationPrompt(
  menuItem: MenuItem,
  demographicInsights: string[],
  selectedSpecialtyDishes: SelectedSpecialtyDish[],
  optimizationStyle?: string,
  targetAudience?: string,
  cuisineType?: string
): string {
  const style = optimizationStyle || "appealing";
  const audience =
    targetAudience || "the restaurant's primary customer demographic";
  const cuisine = cuisineType || "the restaurant's cuisine style";

  // Build specialty dishes context if available
  let specialtyDishesContext = "";
  if (selectedSpecialtyDishes && selectedSpecialtyDishes.length > 0) {
    const dishDescriptions = selectedSpecialtyDishes.map(
      (dish) =>
        `- "${dish.dishName}" from ${dish.restaurantName} (Popularity: ${dish.popularity}, Weight: ${dish.weight}, Rating: ${dish.businessRating})`
    );
    specialtyDishesContext = `\n\nHIGHLY RATED SPECIALTY DISHES FROM SIMILAR RESTAURANTS:
${dishDescriptions.join("\n")}

Use these popular dishes as inspiration for naming and description techniques that resonate with customers in this market. The weight value indicates customer preference strength (1.0 = highest preference, 0.0 = lowest preference). Focus on dishes with higher weights as they represent stronger customer affinity. Consider what makes these dishes appealing and incorporate similar language patterns, descriptive techniques, or presentation styles that could enhance the menu item being optimized.`;
  }

  return `You are a professional menu consultant helping to optimize menu item names and descriptions based on customer demographics and successful dishes from similar restaurants.

RESTAURANT CONTEXT:
Cuisine Type: ${cuisine}

MENU ITEM TO OPTIMIZE:
Name: "${menuItem.name}"
Description: "${menuItem.description}"
Category: ${menuItem.category}
Price: ${menuItem.price}
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
${demographicInsights.join("\n")}${specialtyDishesContext}

OPTIMIZATION REQUIREMENTS:
- Style: ${style}
- Target Audience: ${audience}
- Cuisine Context: ${cuisine}
- Keep the essence and accuracy of the original dish
- Make the name and description more appealing to the target demographic
- Use language and terminology that resonates with the customer base
- Highlight aspects that would appeal to their interests and preferences
- Draw inspiration from successful dishes in similar restaurants for naming and description techniques
- Maintain authenticity while enhancing appeal
- Ensure the optimized content fits well within the ${cuisine} cuisine style

Please provide your optimization in the following JSON format:
{
  "optimizedName": "Enhanced dish name that appeals to the target demographic",
  "optimizedDescription": "Enhanced description that highlights appealing aspects for the target audience",
  "reason": "Brief explanation of why these changes appeal to the demographic and how they draw inspiration from successful similar dishes"
}

Focus on making the menu item more appealing while staying true to the original dish and incorporating successful techniques from similar restaurants within the ${cuisine} cuisine context.`;
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
