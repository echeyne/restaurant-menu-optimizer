/**
 * Lambda function for suggesting new menu items based on specialty dish data from similar restaurants
 * Uses specialty dish data from similar restaurants to generate new menu item suggestions via LLM
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { SimilarRestaurantDataRepository } from "../../repositories/similar-restaurant-data-repository";
import { MenuItemRepository } from "../../repositories/menu-item-repository";
import { RestaurantRepository } from "../../repositories/restaurant-repository";
import { SuggestionRepository } from "../../repositories/suggestion-repository";
import { LLMService } from "../../services/llm-service";
import {
  SimilarRestaurantData,
  MenuItem,
  Restaurant,
  MenuItemSuggestion,
  SpecialtyDish,
} from "../../models/database";

/**
 * Interface for new item suggestion request
 */
interface SuggestNewItemsRequest {
  restaurantId: string;
  maxSuggestions?: number; // Default: 5
  cuisineStyle?: string; // Optional: specific cuisine style preference
  priceRange?: "budget" | "moderate" | "upscale" | "luxury";
  excludeCategories?: string[]; // Categories to exclude from suggestions
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

    // Get existing menu items to avoid duplicates
    const existingMenuItems = await menuItemRepository.getActiveByRestaurantId(
      request.restaurantId
    );

    // Generate suggestions based on specialty dishes
    const maxSuggestions = request.maxSuggestions || 5;
    const suggestions = await generateMenuItemSuggestions(
      restaurant,
      similarRestaurantData,
      existingMenuItems,
      llmService,
      {
        maxSuggestions,
        cuisineStyle: request.cuisineStyle,
        priceRange: request.priceRange,
        excludeCategories: request.excludeCategories || [],
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
 * Generate menu item suggestions based on specialty dishes from similar restaurants
 * @param restaurant Restaurant profile
 * @param similarRestaurantData Similar restaurant data with specialty dishes
 * @param existingMenuItems Existing menu items to avoid duplicates
 * @param llmService LLM service instance
 * @param options Generation options
 * @returns Array of menu item suggestions
 */
async function generateMenuItemSuggestions(
  restaurant: Restaurant,
  similarRestaurantData: SimilarRestaurantData,
  existingMenuItems: MenuItem[],
  llmService: LLMService,
  options: {
    maxSuggestions: number;
    cuisineStyle?: string;
    priceRange?: string;
    excludeCategories: string[];
  }
): Promise<Omit<MenuItemSuggestion, "suggestionId" | "createdAt">[]> {
  // Filter and prioritize specialty dishes
  const prioritizedDishes = prioritizeSpecialtyDishes(
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
    prioritizedDishes,
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
 * Prioritize specialty dishes based on popularity and restaurant count
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
      // Sort by popularity first, then by restaurant count
      if (b.popularity !== a.popularity) {
        return b.popularity - a.popularity;
      }
      return b.restaurantCount - a.restaurantCount;
    })
    .slice(0, maxDishes);
}

/**
 * Create LLM prompt for generating menu item suggestions
 * @param restaurant Restaurant profile
 * @param specialtyDishes Prioritized specialty dishes
 * @param existingDishNames Existing dish names to avoid duplicates
 * @param options Generation options
 * @returns LLM prompt
 */
function createSuggestionPrompt(
  restaurant: Restaurant,
  specialtyDishes: SpecialtyDish[],
  existingDishNames: string[],
  options: {
    maxSuggestions: number;
    cuisineStyle?: string;
    priceRange?: string;
    excludeCategories: string[];
  }
): string {
  const cuisineContext = restaurant.genreTags
    ? restaurant.genreTags
        .filter((tag) => tag.includes("genre:restaurant"))
        .map((tag) => tag.split(":").pop())
        .join(", ")
    : "general";

  const priceContext = restaurant.priceLevel
    ? `Price level: ${restaurant.priceLevel} (1=budget, 4=luxury)`
    : "";

  return `You are a professional menu consultant helping to create new menu item suggestions for a restaurant based on popular dishes from similar restaurants in the area.

RESTAURANT PROFILE:
Name: ${restaurant.name}
Location: ${restaurant.city}, ${restaurant.state}
Cuisine Type: ${cuisineContext}
${priceContext}
${options.cuisineStyle ? `Preferred Style: ${options.cuisineStyle}` : ""}
${options.priceRange ? `Target Price Range: ${options.priceRange}` : ""}

POPULAR SPECIALTY DISHES FROM SIMILAR RESTAURANTS:
${specialtyDishes
  .map(
    (dish, index) =>
      `${index + 1}. ${dish.dishName} (Popular at ${
        dish.restaurantCount
      } restaurants, popularity score: ${dish.popularity})`
  )
  .join("\n")}

EXISTING MENU ITEMS TO AVOID DUPLICATING:
${existingDishNames.slice(0, 20).join(", ")}${
    existingDishNames.length > 20 ? "..." : ""
  }

${
  options.excludeCategories.length > 0
    ? `CATEGORIES TO EXCLUDE: ${options.excludeCategories.join(", ")}`
    : ""
}

REQUIREMENTS:
- Generate ${options.maxSuggestions} unique menu item suggestions
- Base suggestions on the popular specialty dishes from similar restaurants
- Adapt dishes to fit the restaurant's cuisine style and price level
- Avoid duplicating existing menu items
- Create appealing names and descriptions that would attract customers
- Provide realistic price estimates based on the restaurant's price level
- Include suggested ingredients and dietary tags where appropriate
- Ensure suggestions are feasible for the restaurant to prepare

Please provide your suggestions in the following JSON format:
{
  "suggestions": [
    {
      "name": "Dish name that's appealing and fits the restaurant style",
      "description": "Detailed description that highlights key ingredients and appeal",
      "estimatedPrice": 15.99,
      "category": "appetizer/entree/dessert/etc",
      "ingredients": ["ingredient1", "ingredient2", "ingredient3"],
      "dietaryTags": ["vegetarian", "gluten-free", etc],
      "basedOnDish": "Name of the specialty dish this was inspired by"
    }
  ]
}

Focus on creating dishes that would be popular with customers while being practical for the restaurant to execute.`;
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
