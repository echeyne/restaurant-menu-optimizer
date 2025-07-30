/**
 * Lambda function for suggesting new menu items based on specialty dish data from similar restaurants
 * Uses specialty dish data from similar restaurants to generate new menu item suggestions via LLM
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { SimilarRestaurantDataRepository } from "../../repositories/similar-restaurant-data-repository";
import { DemographicsDataRepository } from "../../repositories/demographics-data-repository";
import { MenuItemRepository } from "../../repositories/menu-item-repository";
import { RestaurantRepository } from "../../repositories/restaurant-repository";
import { SuggestionRepository } from "../../repositories/suggestion-repository";
import { LLMService } from "../../services/llm-service";
import {
  SimilarRestaurantData,
  DemographicsData,
  MenuItem,
  Restaurant,
  MenuItemSuggestion,
  SpecialtyDish,
  SimilarRestaurant,
  AgeGroupData,
  GenderData,
} from "../../models/database";
import { createResponse } from "../../models/api";
import { getUserIdFromToken } from "../../utils/auth-utils";

/**
 * Interface for selected demographics
 */
interface SelectedDemographics {
  selectedAgeGroups: string[];
  selectedGenderGroups: string[];
  selectedInterests: string[];
}

/**
 * Interface for selected specialty dish
 */
interface SelectedSpecialtyDish {
  dishName: string;
  tagId: string;
  restaurantName: string;
  qlooPopularityRating: number;
  weight: number; // Weight indicating customer preference strength
  tripAdvisorRating: number;
}

/**
 * Interface for new item suggestion request
 */
interface SuggestNewItemsRequest {
  restaurantId: string;
  maxSuggestions?: number; // Default: 5
  cuisineType?: string; // Allow user to change cuisine type from restaurant default
  priceRange?: "budget" | "moderate" | "upscale" | "luxury";
  excludeCategories?: string[]; // Categories to exclude from suggestions
  selectedDemographics?: SelectedDemographics; // User-selected demographic groups for optimization
  selectedSpecialtyDishes?: SelectedSpecialtyDish[]; // User-selected specialty dishes from similar restaurants
  specificDishRequests?: string[]; // Particular dishes the user wants to create
}

/**
 * Interface for new item suggestion response
 */
interface SuggestNewItemsResponse {
  restaurantId: string;
  suggestions: MenuItemSuggestion[];
  totalSuggestions: number;
  basedOnSpecialtyDishes: string[];
  inspirationSources: string[];
  errors?: string[];
}

/**
 * Handler for suggesting new menu items
 * @param event API Gateway event
 * @returns API Gateway response with new menu item suggestions
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

    const request: SuggestNewItemsRequest = JSON.parse(event.body);

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
    const similarRestaurantRepository = new SimilarRestaurantDataRepository();
    const demographicsRepository = new DemographicsDataRepository();
    const menuItemRepository = new MenuItemRepository();
    const restaurantRepository = new RestaurantRepository();
    const suggestionRepository = new SuggestionRepository();
    const llmService = new LLMService();

    // Get restaurant profile
    const restaurant = await restaurantRepository.getById(request.restaurantId);
    if (!restaurant) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          message: "Restaurant not found",
        }),
      };
    }

    // Get similar restaurant data
    const similarRestaurantData = await similarRestaurantRepository.getById(
      request.restaurantId
    );
    if (!similarRestaurantData) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          message:
            "Similar restaurant data not found. Please complete restaurant profile setup first.",
        }),
      };
    }

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

    // Get existing menu items to avoid duplicates
    const existingMenuItems = await menuItemRepository.getActiveByRestaurantId(
      request.restaurantId
    );

    // Generate suggestions based on specialty dishes and demographics
    const maxSuggestions = request.maxSuggestions || 5;
    const suggestions = await generateMenuItemSuggestions(
      restaurant,
      similarRestaurantData,
      demographicsData,
      existingMenuItems,
      llmService,
      {
        maxSuggestions,
        cuisineType: request.cuisineType,
        priceRange: request.priceRange,
        excludeCategories: request.excludeCategories || [],
        selectedDemographics: request.selectedDemographics,
        selectedSpecialtyDishes: request.selectedSpecialtyDishes,
        specificDishRequests: request.specificDishRequests,
      }
    );

    // Save suggestions to database
    const savedSuggestions = await suggestionRepository.batchCreate(
      suggestions
    );

    // Prepare response
    const response: SuggestNewItemsResponse = {
      restaurantId: request.restaurantId,
      suggestions: savedSuggestions,
      totalSuggestions: savedSuggestions.length,
      basedOnSpecialtyDishes: similarRestaurantData.specialtyDishes.map(
        (dish) => dish.dishName
      ),
      inspirationSources: [
        "Similar restaurants in your area",
        "Popular specialty dishes",
        "Customer preferences analysis",
      ],
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
    console.error("Error suggesting new menu items:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Error suggesting new menu items",
        error: error.message || String(error),
      }),
    };
  }
};

/**
 * Generate menu item suggestions based on specialty dishes from similar restaurants and demographics
 * @param restaurant Restaurant profile
 * @param similarRestaurantData Similar restaurant data with specialty dishes
 * @param demographicsData Demographics data for the restaurant
 * @param existingMenuItems Existing menu items to avoid duplicates
 * @param llmService LLM service instance
 * @param options Generation options
 * @returns Array of menu item suggestions
 */
async function generateMenuItemSuggestions(
  restaurant: Restaurant,
  similarRestaurantData: SimilarRestaurantData,
  demographicsData: DemographicsData,
  existingMenuItems: MenuItem[],
  llmService: LLMService,
  options: {
    maxSuggestions: number;
    cuisineType?: string;
    priceRange?: string;
    excludeCategories: string[];
    selectedDemographics?: SelectedDemographics;
    selectedSpecialtyDishes?: SelectedSpecialtyDish[];
    specificDishRequests?: string[];
  }
): Promise<Omit<MenuItemSuggestion, "suggestionId" | "createdAt">[]> {
  // Use selected specialty dishes if provided, otherwise prioritize all dishes
  const dishesToUse =
    options.selectedSpecialtyDishes &&
    options.selectedSpecialtyDishes.length > 0
      ? options.selectedSpecialtyDishes.map((selected) => ({
          dishName: selected.dishName,
          tagId: selected.tagId,
          restaurantCount: 1, // Not relevant for selected dishes
          popularity: selected.qlooPopularityRating,
          weight: selected.weight,
          totalWeight: selected.weight, // For selected dishes, totalWeight equals weight
        }))
      : prioritizeSpecialtyDishes(
          similarRestaurantData.specialtyDishes,
          options.maxSuggestions * 2 // Get more dishes to have variety for LLM
        );

  // Get existing dish names to avoid duplicates
  const existingDishNames = existingMenuItems.map((item) =>
    item.name.toLowerCase()
  );

  // Create LLM prompt for generating suggestions
  const prompt = createSuggestionPrompt(
    restaurant,
    dishesToUse,
    demographicsData,
    existingDishNames,
    options
  );

  // Call LLM for suggestions
  const response = await llmService.complete({
    prompt,
    maxTokens: 2000,
    temperature: 0.8, // Higher temperature for more creative suggestions
  });

  // Parse LLM response
  const parsedSuggestions = parseLLMSuggestionResponse(response.text);

  // Convert to MenuItemSuggestion format
  const suggestions: Omit<MenuItemSuggestion, "suggestionId" | "createdAt">[] =
    parsedSuggestions
      .slice(0, options.maxSuggestions)
      .map((suggestion, index) => ({
        restaurantId: restaurant.restaurantId,
        name: suggestion.name,
        description: suggestion.description,
        estimatedPrice: suggestion.estimatedPrice,
        category: suggestion.category,
        suggestedIngredients: suggestion.ingredients || [],
        dietaryTags: suggestion.dietaryTags || [],
        inspirationSource: `Similar restaurants - ${
          suggestion.basedOnDish || "popular specialty dishes"
        }`,
        basedOnSpecialtyDish: suggestion.basedOnDish,
        status: "pending",
      }));

  return suggestions;
}

/**
 * Prioritize specialty dishes based on popularity, weight, and restaurant count
 * @param specialtyDishes Array of specialty dishes
 * @param maxDishes Maximum number of dishes to return
 * @returns Prioritized array of specialty dishes
 */
function prioritizeSpecialtyDishes(
  specialtyDishes: SpecialtyDish[],
  maxDishes: number
): SpecialtyDish[] {
  return specialtyDishes
    .sort((a, b) => {
      // Primary sort by popularity, secondary sort by weight, tertiary sort by restaurant count
      if (b.popularity !== a.popularity) {
        return b.popularity - a.popularity;
      }
      if (b.weight !== a.weight) {
        return b.weight - a.weight;
      }
      return b.restaurantCount - a.restaurantCount;
    })
    .slice(0, maxDishes);
}

/**
 * Create LLM prompt for generating menu item suggestions
 * @param restaurant Restaurant profile
 * @param specialtyDishes Prioritized specialty dishes
 * @param demographicsData Demographics data for the restaurant
 * @param existingDishNames Existing dish names to avoid duplicates
 * @param options Generation options
 * @returns LLM prompt
 */
function createSuggestionPrompt(
  restaurant: Restaurant,
  specialtyDishes: SpecialtyDish[],
  demographicsData: DemographicsData,
  existingDishNames: string[],
  options: {
    maxSuggestions: number;
    cuisineType?: string;
    priceRange?: string;
    excludeCategories: string[];
    selectedDemographics?: SelectedDemographics;
    selectedSpecialtyDishes?: SelectedSpecialtyDish[];
    specificDishRequests?: string[];
  }
): string {
  // Use provided cuisine type or default to restaurant's cuisine
  const cuisineContext = options.cuisineType || restaurant.cuisine || "general";

  const priceContext = restaurant.priceLevel
    ? `Price level: ${restaurant.priceLevel} (1=budget, 4=luxury)`
    : "";

  // Build demographics context
  const demographicsContext = buildDemographicsContext(
    demographicsData,
    options.selectedDemographics
  );

  // Build specialty dishes context with ratings if selected dishes are provided
  const specialtyDishesContext = buildSpecialtyDishesContext(
    specialtyDishes,
    options.selectedSpecialtyDishes
  );

  // Build specific dish requests context
  const specificDishRequestsContext =
    options.specificDishRequests && options.specificDishRequests.length > 0
      ? `\nSPECIFIC DISH REQUESTS FROM USER:
${options.specificDishRequests
  .map((dish, index) => `${index + 1}. ${dish}`)
  .join("\n")}`
      : "";

  return `You are a professional menu consultant helping to create new menu item suggestions for a restaurant based on popular dishes from similar restaurants and customer demographics.

RESTAURANT PROFILE:
Name: ${restaurant.name}
Location: ${restaurant.city}, ${restaurant.state}
Cuisine Type: ${cuisineContext}
${priceContext}
${options.priceRange ? `Target Price Range: ${options.priceRange}` : ""}

${demographicsContext}

${specialtyDishesContext}

EXISTING MENU ITEMS TO AVOID DUPLICATING:
${existingDishNames.slice(0, 20).join(", ")}${
    existingDishNames.length > 20 ? "..." : ""
  }

${
  options.excludeCategories.length > 0
    ? `CATEGORIES TO EXCLUDE: ${options.excludeCategories.join(", ")}`
    : ""
}

${specificDishRequestsContext}

REQUIREMENTS:
- Generate ${options.maxSuggestions} unique menu item suggestions
- Base suggestions on the popular specialty dishes from similar restaurants
- Incorporate the demographic preferences and dining patterns into your suggestions
- Adapt dishes to fit the restaurant's cuisine style and price level
- If specific dish requests are provided, prioritize creating variations of those dishes
- Avoid duplicating existing menu items
- Create appealing names and descriptions that would attract the target demographics
- Provide realistic price estimates based on the restaurant's price level
- Include suggested ingredients and dietary tags where appropriate
- Ensure suggestions are feasible for the restaurant to prepare
- Consider the highly rated similar dishes when making optimization decisions

Please provide your suggestions in the following JSON format:
{
  "suggestions": [
    {
      "name": "Dish name that's appealing and fits the restaurant style and demographics",
      "description": "Detailed description that highlights key ingredients and appeal to target demographics",
      "estimatedPrice": 15.99,
      "category": "appetizer/entree/dessert/etc",
      "ingredients": ["ingredient1", "ingredient2", "ingredient3"],
      "dietaryTags": ["vegetarian", "gluten-free", etc],
      "basedOnDish": "Name of the specialty dish this was inspired by"
    }
  ]
}

Focus on creating dishes that would be popular with the target customer demographics while being practical for the restaurant to execute.`;
}

/**
 * Build demographics context for the LLM prompt
 * @param demographicsData Demographics data for the restaurant
 * @param selectedDemographics User-selected demographics (optional)
 * @returns Formatted demographics context string
 */
function buildDemographicsContext(
  demographicsData: DemographicsData,
  selectedDemographics?: SelectedDemographics
): string {
  let context = "CUSTOMER DEMOGRAPHICS:\n";

  // Age groups context
  const ageGroupsToUse = selectedDemographics?.selectedAgeGroups?.length
    ? demographicsData.ageGroups.filter((group) =>
        selectedDemographics.selectedAgeGroups.includes(group.ageRange)
      )
    : demographicsData.ageGroups;

  if (ageGroupsToUse.length > 0) {
    context += "Age Groups:\n";
    ageGroupsToUse.forEach((group) => {
      context += `- ${group.ageRange}: ${group.percentage}% of customers\n`;
      if (group.preferences.length > 0) {
        context += `  Preferences: ${group.preferences.join(", ")}\n`;
      }
    });
  }

  // Gender groups context
  const genderGroupsToUse = selectedDemographics?.selectedGenderGroups?.length
    ? demographicsData.genders.filter((group) =>
        selectedDemographics.selectedGenderGroups.includes(group.gender)
      )
    : demographicsData.genders;

  if (genderGroupsToUse.length > 0) {
    context += "Gender Distribution:\n";
    genderGroupsToUse.forEach((group) => {
      context += `- ${group.gender}: ${group.percentage}% of customers\n`;
      if (group.preferences.length > 0) {
        context += `  Preferences: ${group.preferences.join(", ")}\n`;
      }
    });
  }

  // Interests context
  const interestsToUse = selectedDemographics?.selectedInterests?.length
    ? selectedDemographics.selectedInterests
    : demographicsData.interests;

  if (interestsToUse.length > 0) {
    context += `Customer Interests: ${interestsToUse.join(", ")}\n`;
  }

  // Dining patterns
  if (demographicsData.diningPatterns.length > 0) {
    context += "Dining Patterns:\n";
    demographicsData.diningPatterns.forEach((pattern) => {
      context += `- ${pattern.pattern}: ${
        pattern.frequency
      }% frequency, popular times: ${pattern.timeOfDay.join(", ")}\n`;
    });
  }

  return context;
}

/**
 * Build specialty dishes context for the LLM prompt
 * @param specialtyDishes Specialty dishes to include
 * @param selectedSpecialtyDishes User-selected specialty dishes (optional)
 * @returns Formatted specialty dishes context string
 */
function buildSpecialtyDishesContext(
  specialtyDishes: SpecialtyDish[],
  selectedSpecialtyDishes?: SelectedSpecialtyDish[]
): string {
  let context = "POPULAR SPECIALTY DISHES FROM SIMILAR RESTAURANTS:\n";

  if (selectedSpecialtyDishes && selectedSpecialtyDishes.length > 0) {
    // Use selected dishes with their ratings
    selectedSpecialtyDishes.forEach((dish, index) => {
      context += `${index + 1}. ${dish.dishName} from ${dish.restaurantName}\n`;
      context += `   - Qloo Popularity Rating: ${dish.qlooPopularityRating}/5\n`;
      context += `   - Customer Preference Weight: ${dish.weight} (1.0 = highest preference)\n`;
      context += `   - TripAdvisor Rating: ${dish.tripAdvisorRating}/5\n`;
    });
  } else {
    // Use all specialty dishes with popularity scores and weights
    specialtyDishes.forEach((dish, index) => {
      context += `${index + 1}. ${dish.dishName} (Popular at ${
        dish.restaurantCount
      } restaurants, popularity score: ${dish.popularity}, preference weight: ${
        dish.weight
      })\n`;
    });
  }

  return context;
}

/**
 * Parse LLM response to extract menu item suggestions
 * @param content LLM response content
 * @returns Array of parsed suggestions
 */
function parseLLMSuggestionResponse(content: string): Array<{
  name: string;
  description: string;
  estimatedPrice: number;
  category: string;
  ingredients?: string[];
  dietaryTags?: string[];
  basedOnDish?: string;
}> {
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
        return parsed.suggestions.map((suggestion: any) => ({
          name: suggestion.name || "Unnamed Dish",
          description: suggestion.description || "Delicious dish",
          estimatedPrice: parseFloat(suggestion.estimatedPrice) || 12.99,
          category: suggestion.category || "entree",
          ingredients: Array.isArray(suggestion.ingredients)
            ? suggestion.ingredients
            : [],
          dietaryTags: Array.isArray(suggestion.dietaryTags)
            ? suggestion.dietaryTags
            : [],
          basedOnDish: suggestion.basedOnDish,
        }));
      }
    }
  } catch (error) {
    console.error("Error parsing LLM suggestion response:", error);
  }

  // Fallback: return empty array if parsing fails
  return [];
}
