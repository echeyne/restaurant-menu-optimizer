/**
 * Lambda function for presenting LLM optimization options to users
 * Provides two optimization choices:
 * 1. Optimize existing dish names and descriptions based on demographic data
 * 2. Suggest new menu items based on dishes from similar restaurants
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { MenuItemRepository } from "../../repositories/menu-item-repository";
import { DemographicsDataRepository } from "../../repositories/demographics-data-repository";
import { SimilarRestaurantDataRepository } from "../../repositories/similar-restaurant-data-repository";
import { createResponse } from "../../models/api";
import { getUserIdFromToken } from "../../utils/auth-utils";
import {
  DemographicsData,
  SimilarRestaurantData,
  AgeGroupData,
  GenderData,
  SpecialtyDish,
  SimilarRestaurant,
} from "../../models/database";

/**
 * Interface for optimization option
 */
interface OptimizationOption {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  available: boolean;
  reason?: string;
}

/**
 * Interface for optimization readiness check
 */
interface OptimizationReadiness {
  hasMenuItems: boolean;
  hasDemographicsData: boolean;
  hasSimilarRestaurantData: boolean;
  menuItemCount: number;
  specialtyDishCount: number;
}

/**
 * Interface for demographic information display
 */
interface DemographicDisplay {
  ageGroups: AgeGroupDisplay[];
  genderGroups: GenderGroupDisplay[];
  interests: string[];
  diningPatterns: DiningPatternDisplay[];
  interpretation: string;
}

/**
 * Interface for age group display with interpretation
 */
interface AgeGroupDisplay {
  ageRange: string;
  percentage: number;
  preferences: string[];
  interpretation: string;
}

/**
 * Interface for gender group display with interpretation
 */
interface GenderGroupDisplay {
  gender: string;
  percentage: number;
  preferences: string[];
  interpretation: string;
}

/**
 * Interface for dining pattern display
 */
interface DiningPatternDisplay {
  pattern: string;
  frequency: number;
  timeOfDay: string[];
  interpretation: string;
}

/**
 * Interface for specialty dish display with ratings
 */
interface SpecialtyDishDisplay {
  dishName: string;
  tagId: string;
  restaurantCount: number;
  popularity: number;
  qlooRating: number;
  tripAdvisorRating?: number;
  restaurantName?: string;
  interpretation: string;
}

/**
 * Handler for optimization options requests
 * @param event API Gateway event
 * @returns API Gateway response with optimization options
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

    // Handle GET request - return optimization options
    if (event.httpMethod === "GET") {
      return await handleGetOptimizationOptions(event);
    }

    // Handle POST request - process user selection
    if (event.httpMethod === "POST") {
      return await handleOptimizationSelection(event);
    }

    // Method not allowed
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
    console.error("Error in optimization options handler:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Error processing optimization options request",
        error: error.message || String(error),
      }),
    };
  }
};

/**
 * Handle GET request for optimization options
 * @param event API Gateway event
 * @returns API Gateway response with optimization options
 */
async function handleGetOptimizationOptions(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const restaurantId = event.queryStringParameters?.restaurantId;

    // Validate restaurant ID
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

    // Check optimization readiness
    const readiness = await checkOptimizationReadiness(restaurantId);

    // Get demographic information with clear interpretation
    const demographicInfo = await getDemographicInformation(restaurantId);

    // Get specialty dishes from similar restaurants with ratings
    const specialtyDishes = await getSpecialtyDishesWithRatings(restaurantId);

    // Define optimization options
    const options: OptimizationOption[] = [
      {
        id: "optimize-existing",
        title: "Optimize Existing Menu Items",
        description:
          "Enhance your current dish names and descriptions using demographic insights to better appeal to your target customers.",
        requirements: [
          "Menu items uploaded and saved",
          "Demographics data collected from Qloo",
        ],
        available: readiness.hasMenuItems && readiness.hasDemographicsData,
        reason: !readiness.hasMenuItems
          ? "No menu items found. Please upload and save your menu first."
          : !readiness.hasDemographicsData
          ? "Demographics data not available. Please complete restaurant profile setup."
          : undefined,
      },
      {
        id: "suggest-new-items",
        title: "Suggest New Menu Items",
        description:
          "Generate new menu item suggestions based on popular specialty dishes from similar restaurants in your area.",
        requirements: [
          "Similar restaurant data collected from Qloo",
          "Specialty dish data available",
        ],
        available:
          readiness.hasSimilarRestaurantData &&
          readiness.specialtyDishCount > 0,
        reason: !readiness.hasSimilarRestaurantData
          ? "Similar restaurant data not available. Please complete restaurant profile setup."
          : readiness.specialtyDishCount === 0
          ? "No specialty dish data found from similar restaurants."
          : undefined,
      },
    ];

    // Return optimization options with demographic information and specialty dishes
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        restaurantId,
        optimizationOptions: options,
        demographicInformation: demographicInfo,
        specialtyDishes: specialtyDishes,
        readiness: {
          menuItemCount: readiness.menuItemCount,
          specialtyDishCount: readiness.specialtyDishCount,
          hasAllRequiredData:
            readiness.hasMenuItems &&
            readiness.hasDemographicsData &&
            readiness.hasSimilarRestaurantData,
        },
      }),
    };
  } catch (error: any) {
    console.error("Error getting optimization options:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Error getting optimization options",
        error: error.message || String(error),
      }),
    };
  }
}

/**
 * Check if restaurant is ready for optimization
 * @param restaurantId Restaurant ID to check
 * @returns Optimization readiness information
 */
async function checkOptimizationReadiness(
  restaurantId: string
): Promise<OptimizationReadiness> {
  const menuItemRepository = new MenuItemRepository();
  const demographicsRepository = new DemographicsDataRepository();
  const similarRestaurantRepository = new SimilarRestaurantDataRepository();

  try {
    // Check for menu items
    const menuItems = await menuItemRepository.list({ restaurantId });
    const hasMenuItems = menuItems.length > 0;

    // Check for demographics data
    let hasDemographicsData = false;
    try {
      const demographicsData = await demographicsRepository.getById(
        restaurantId
      );
      hasDemographicsData = !!demographicsData;
    } catch (error) {
      console.log("No demographics data found for restaurant:", restaurantId);
    }

    // Check for similar restaurant data
    let hasSimilarRestaurantData = false;
    let specialtyDishCount = 0;
    try {
      const similarRestaurantData = await similarRestaurantRepository.getById(
        restaurantId
      );
      hasSimilarRestaurantData = !!similarRestaurantData;
      specialtyDishCount = similarRestaurantData?.specialtyDishes?.length || 0;
    } catch (error) {
      console.log(
        "No similar restaurant data found for restaurant:",
        restaurantId
      );
    }

    return {
      hasMenuItems,
      hasDemographicsData,
      hasSimilarRestaurantData,
      menuItemCount: menuItems.length,
      specialtyDishCount,
    };
  } catch (error) {
    console.error("Error checking optimization readiness:", error);
    return {
      hasMenuItems: false,
      hasDemographicsData: false,
      hasSimilarRestaurantData: false,
      menuItemCount: 0,
      specialtyDishCount: 0,
    };
  }
}

/**
 * Get demographic information with clear interpretation
 * @param restaurantId Restaurant ID to get demographics for
 * @returns Demographic information with interpretations
 */
async function getDemographicInformation(
  restaurantId: string
): Promise<DemographicDisplay | null> {
  const demographicsRepository = new DemographicsDataRepository();

  try {
    const demographicsData = await demographicsRepository.getById(restaurantId);
    if (!demographicsData) {
      return null;
    }

    // Process age groups with interpretations
    const ageGroups: AgeGroupDisplay[] = demographicsData.ageGroups.map(
      (ageGroup: AgeGroupData) => ({
        ageRange: ageGroup.ageRange,
        percentage: ageGroup.percentage,
        preferences: ageGroup.preferences,
        interpretation: generateAgeGroupInterpretation(ageGroup),
      })
    );

    // Process gender groups with interpretations
    const genderGroups: GenderGroupDisplay[] = demographicsData.genders.map(
      (gender: GenderData) => ({
        gender: gender.gender,
        percentage: gender.percentage,
        preferences: gender.preferences,
        interpretation: generateGenderInterpretation(gender),
      })
    );

    // Process dining patterns with interpretations
    const diningPatterns: DiningPatternDisplay[] =
      demographicsData.diningPatterns.map((pattern) => ({
        pattern: pattern.pattern,
        frequency: pattern.frequency,
        timeOfDay: pattern.timeOfDay,
        interpretation: generateDiningPatternInterpretation(pattern),
      }));

    // Generate overall interpretation
    const overallInterpretation = generateOverallDemographicInterpretation(
      ageGroups,
      genderGroups,
      demographicsData.interests
    );

    return {
      ageGroups,
      genderGroups,
      interests: demographicsData.interests,
      diningPatterns,
      interpretation: overallInterpretation,
    };
  } catch (error) {
    console.error("Error getting demographic information:", error);
    return null;
  }
}

/**
 * Get specialty dishes from similar restaurants with ratings
 * @param restaurantId Restaurant ID to get specialty dishes for
 * @returns Array of specialty dishes with ratings and interpretations
 */
async function getSpecialtyDishesWithRatings(
  restaurantId: string
): Promise<SpecialtyDishDisplay[]> {
  const similarRestaurantRepository = new SimilarRestaurantDataRepository();

  try {
    const similarRestaurantData = await similarRestaurantRepository.getById(
      restaurantId
    );
    if (!similarRestaurantData) {
      return [];
    }

    // Process specialty dishes with ratings and interpretations
    const specialtyDishes: SpecialtyDishDisplay[] =
      similarRestaurantData.specialtyDishes.map((dish: SpecialtyDish) => {
        // Find the restaurant that has this specialty dish for additional context
        const restaurantWithDish =
          similarRestaurantData.similarRestaurants.find(
            (restaurant: SimilarRestaurant) =>
              restaurant.specialtyDishes.some(
                (restDish: SpecialtyDish) => restDish.tagId === dish.tagId
              )
          );

        return {
          dishName: dish.dishName,
          tagId: dish.tagId,
          restaurantCount: dish.restaurantCount,
          popularity: dish.popularity,
          qlooRating: dish.popularity * 5, // Convert popularity to 5-star rating
          tripAdvisorRating: restaurantWithDish?.businessRating,
          restaurantName: restaurantWithDish?.name,
          interpretation: generateSpecialtyDishInterpretation(
            dish,
            restaurantWithDish
          ),
        };
      });

    // Sort by popularity (highest first)
    return specialtyDishes.sort((a, b) => b.popularity - a.popularity);
  } catch (error) {
    console.error("Error getting specialty dishes with ratings:", error);
    return [];
  }
}

/**
 * Generate interpretation for age group data
 * @param ageGroup Age group data
 * @returns Human-readable interpretation
 */
function generateAgeGroupInterpretation(ageGroup: AgeGroupData): string {
  const percentage = ageGroup.percentage;
  const preferences = ageGroup.preferences.join(", ");

  let interpretation = `${percentage}% of your customers are in the ${ageGroup.ageRange} age range`;

  if (percentage > 30) {
    interpretation += " (major demographic)";
  } else if (percentage > 15) {
    interpretation += " (significant segment)";
  } else {
    interpretation += " (smaller segment)";
  }

  if (preferences) {
    interpretation += `. They prefer: ${preferences}`;
  }

  return interpretation;
}

/**
 * Generate interpretation for gender data
 * @param gender Gender data
 * @returns Human-readable interpretation
 */
function generateGenderInterpretation(gender: GenderData): string {
  const percentage = gender.percentage;
  const preferences = gender.preferences.join(", ");

  let interpretation = `${percentage}% of your customers identify as ${gender.gender}`;

  if (preferences) {
    interpretation += `. They tend to prefer: ${preferences}`;
  }

  return interpretation;
}

/**
 * Generate interpretation for dining pattern
 * @param pattern Dining pattern data
 * @returns Human-readable interpretation
 */
function generateDiningPatternInterpretation(pattern: any): string {
  const timeOfDayStr = pattern.timeOfDay.join(" and ");
  return `${pattern.pattern} occurs ${pattern.frequency} times per week, typically during ${timeOfDayStr}`;
}

/**
 * Generate overall demographic interpretation
 * @param ageGroups Age group displays
 * @param genderGroups Gender group displays
 * @param interests Customer interests
 * @returns Overall interpretation
 */
function generateOverallDemographicInterpretation(
  ageGroups: AgeGroupDisplay[],
  genderGroups: GenderGroupDisplay[],
  interests: string[]
): string {
  if (ageGroups.length === 0 && genderGroups.length === 0) {
    return "No demographic data available. Complete your restaurant profile setup to get demographic insights for menu optimization.";
  }

  let interpretation = "Your customer demographics: ";

  if (ageGroups.length > 0) {
    const primaryAgeGroup = ageGroups.reduce((prev, current) =>
      prev.percentage > current.percentage ? prev : current
    );
    interpretation += `Primary age group is ${primaryAgeGroup.ageRange} (${primaryAgeGroup.percentage}%)`;
  }

  if (genderGroups.length > 0) {
    const primaryGender = genderGroups.reduce((prev, current) =>
      prev.percentage > current.percentage ? prev : current
    );
    if (ageGroups.length > 0) {
      interpretation += `, with ${primaryGender.gender} customers making up ${primaryGender.percentage}% of your audience`;
    } else {
      interpretation += `${primaryGender.gender} customers make up ${primaryGender.percentage}% of your audience`;
    }
  }

  if (interests.length > 0) {
    const topInterests = interests.slice(0, 3).join(", ");
    interpretation += `. Top interests include: ${topInterests}`;
  }

  interpretation +=
    ". This demographic data can help optimize your menu descriptions and suggest new items that appeal to these preferences.";

  return interpretation;
}

/**
 * Generate interpretation for specialty dish
 * @param dish Specialty dish data
 * @param restaurant Restaurant that serves this dish
 * @returns Human-readable interpretation
 */
function generateSpecialtyDishInterpretation(
  dish: SpecialtyDish,
  restaurant?: SimilarRestaurant
): string {
  const popularityPercent = Math.round(dish.popularity * 100);
  let interpretation = `${dish.dishName} is popular at ${dish.restaurantCount} similar restaurants with ${popularityPercent}% popularity rating`;

  if (restaurant) {
    interpretation += ` (notably at ${restaurant.name} with ${restaurant.businessRating}/5 rating)`;
  }

  if (dish.popularity > 0.8) {
    interpretation +=
      ". This is a highly popular dish that could be a great addition to your menu.";
  } else if (dish.popularity > 0.6) {
    interpretation +=
      ". This dish has good popularity and could work well for your restaurant.";
  } else {
    interpretation +=
      ". This dish has moderate popularity - consider if it fits your restaurant's style.";
  }

  return interpretation;
}
/**
 * Handle POST request for optimization selection
 * @param event API Gateway event
 * @returns API Gateway response with routing information
 */
async function handleOptimizationSelection(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || "{}");
    const {
      restaurantId,
      selectedOption,
      selectedDemographics,
      selectedSpecialtyDishes,
    } = body;

    // Validate required fields
    if (!restaurantId || !selectedOption) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          message: "Missing required fields: restaurantId and selectedOption",
        }),
      };
    }

    // Validate selected option
    if (!["optimize-existing", "suggest-new-items"].includes(selectedOption)) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          message:
            "Invalid selectedOption. Must be 'optimize-existing' or 'suggest-new-items'",
        }),
      };
    }

    // Check if the selected option is available
    const readiness = await checkOptimizationReadiness(restaurantId);

    if (selectedOption === "optimize-existing") {
      if (!readiness.hasMenuItems || !readiness.hasDemographicsData) {
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            message:
              "Cannot optimize existing items: missing menu items or demographics data",
            readiness,
          }),
        };
      }
    }

    if (selectedOption === "suggest-new-items") {
      if (
        !readiness.hasSimilarRestaurantData ||
        readiness.specialtyDishCount === 0
      ) {
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            message:
              "Cannot suggest new items: missing similar restaurant data or specialty dishes",
            readiness,
          }),
        };
      }
    }

    // Prepare routing information based on selected option
    let nextEndpoint: string;
    let nextAction: string;
    let requiredData: any = {};

    if (selectedOption === "optimize-existing") {
      nextEndpoint = "/menu/optimize-existing-items";
      nextAction = "optimize_existing_items";

      // Validate selected demographics for optimization
      if (
        !selectedDemographics ||
        (!selectedDemographics.selectedAgeGroups?.length &&
          !selectedDemographics.selectedGenderGroups?.length)
      ) {
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            message:
              "Selected demographics are required for optimizing existing items",
          }),
        };
      }

      requiredData = {
        selectedDemographics,
        menuItemCount: readiness.menuItemCount,
      };
    } else {
      nextEndpoint = "/menu/suggest-new-items";
      nextAction = "suggest_new_items";

      // Validate selected specialty dishes for suggestions
      if (!selectedSpecialtyDishes?.length) {
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({
            message:
              "Selected specialty dishes are required for suggesting new items",
          }),
        };
      }

      requiredData = {
        selectedSpecialtyDishes,
        selectedDemographics: selectedDemographics || {},
        specialtyDishCount: readiness.specialtyDishCount,
      };
    }

    // Return routing information for the frontend
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: true,
        restaurantId,
        selectedOption,
        nextEndpoint,
        nextAction,
        requiredData,
        message: `Ready to proceed with ${
          selectedOption === "optimize-existing"
            ? "optimizing existing menu items"
            : "suggesting new menu items"
        }`,
      }),
    };
  } catch (error: any) {
    console.error("Error handling optimization selection:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Error processing optimization selection",
        error: error.message || String(error),
      }),
    };
  }
}
