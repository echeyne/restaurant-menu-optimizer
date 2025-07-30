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
import { RestaurantRepository } from "../../repositories/restaurant-repository";

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
  weight: number; // Average weight from all restaurants
  totalWeight: number; // Sum of all weights
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

    // Get restaurant data to include cuisine
    const restaurantRepository = new RestaurantRepository();
    const restaurant = await restaurantRepository.getById(restaurantId);

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
        cuisine: restaurant?.cuisine,
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
          weight: dish.weight, // Assuming weight is part of the SpecialtyDish object
          totalWeight: dish.totalWeight, // Assuming totalWeight is part of the SpecialtyDish object
          qlooRating: dish.popularity * 5, // Convert popularity to 5-star rating
          tripAdvisorRating: restaurantWithDish?.businessRating,
          restaurantName: restaurantWithDish?.name,
          interpretation: generateSpecialtyDishInterpretation(
            dish,
            restaurantWithDish
          ),
        };
      });

    // Sort by popularity and weight (highest first)
    return specialtyDishes.sort((a, b) => {
      // Primary sort by popularity, secondary sort by weight
      if (b.popularity !== a.popularity) {
        return b.popularity - a.popularity;
      }
      return b.weight - a.weight;
    });
  } catch (error) {
    console.error("Error getting specialty dishes with ratings:", error);
    return [];
  }
}

/**
 * Generate interpretation for age group affinity data
 * @param ageGroup Age group data
 * @returns Human-readable interpretation
 */
function generateAgeGroupInterpretation(ageGroup: AgeGroupData): string {
  const score = ageGroup.percentage;
  const preferences = ageGroup.preferences.join(", ");
  const percentage = Math.abs(score * 100).toFixed(1);
  const direction =
    score > 0 ? "more likely" : score < 0 ? "less likely" : "equally likely";

  let interpretation = `People aged ${ageGroup.ageRange} are ${percentage}% ${direction} than average to visit your restaurant`;

  if (score > 0.2) {
    interpretation += " (strong positive alignment)";
  } else if (score < -0.2) {
    interpretation += " (strong negative alignment)";
  } else if (Math.abs(score) < 0.05) {
    interpretation += " (neutral alignment)";
  }

  if (preferences) {
    interpretation += `. Top preferences: ${preferences}`;
  }

  return interpretation;
}

/**
 * Generate interpretation for gender affinity data
 * @param gender Gender data
 * @returns Human-readable interpretation
 */
function generateGenderInterpretation(gender: GenderData): string {
  const score = gender.percentage;
  const preferences = gender.preferences.join(", ");
  const percentage = Math.abs(score * 100).toFixed(1);
  const direction =
    score > 0 ? "more likely" : score < 0 ? "less likely" : "equally likely";

  let interpretation = `${gender.gender}s are ${percentage}% ${direction} than average to visit your restaurant`;

  if (score > 0.2) {
    interpretation += " (strong positive alignment)";
  } else if (score < -0.2) {
    interpretation += " (strong negative alignment)";
  } else if (Math.abs(score) < 0.05) {
    interpretation += " (neutral alignment)";
  }

  if (preferences) {
    interpretation += `. Top preferences: ${preferences}`;
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

  let interpretation = "Your customer demographic affinities: ";

  if (ageGroups.length > 0) {
    // Find the most positively aligned age group
    const mostAlignedAgeGroup = ageGroups.reduce((prev, current) =>
      prev.percentage > current.percentage ? prev : current
    );

    // Find the most negatively aligned age group
    const leastAlignedAgeGroup = ageGroups.reduce((prev, current) =>
      prev.percentage < current.percentage ? prev : current
    );

    if (mostAlignedAgeGroup.percentage > 0.1) {
      interpretation += `Strongest alignment with ${
        mostAlignedAgeGroup.ageRange
      } age group (${Math.round(
        mostAlignedAgeGroup.percentage * 100
      )}% above average)`;
    } else {
      interpretation += `No strong age group alignment (all groups within 10% of average)`;
    }

    if (leastAlignedAgeGroup.percentage < -0.1) {
      interpretation += `, weakest alignment with ${
        leastAlignedAgeGroup.ageRange
      } (${Math.abs(
        Math.round(leastAlignedAgeGroup.percentage * 100)
      )}% below average)`;
    }
  }

  if (genderGroups.length > 0) {
    const maleGroup = genderGroups.find(
      (g) => g.gender.toLowerCase() === "male"
    );
    const femaleGroup = genderGroups.find(
      (g) => g.gender.toLowerCase() === "female"
    );

    if (maleGroup && femaleGroup) {
      const maleAffinity = maleGroup.percentage;
      const femaleAffinity = femaleGroup.percentage;

      if (Math.abs(maleAffinity - femaleAffinity) > 0.05) {
        if (femaleAffinity > maleAffinity) {
          interpretation += `. Females show ${Math.round(
            femaleAffinity * 100
          )}% stronger interest than males`;
        } else {
          interpretation += `. Males show ${Math.round(
            maleAffinity * 100
          )}% stronger interest than females`;
        }
      } else {
        interpretation += `. Similar interest levels between genders`;
      }
    }
  }

  if (interests.length > 0) {
    const topInterests = interests.slice(0, 3).join(", ");
    interpretation += `. Top interests include: ${topInterests}`;
  }

  interpretation +=
    ". These affinity scores show which demographic groups are most likely to be interested in your restaurant concept, helping optimize menu descriptions and suggest new items.";

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
  const weightPercent = Math.round(dish.weight * 100);
  let interpretation = `${dish.dishName} is popular at ${dish.restaurantCount} similar restaurants with ${popularityPercent}% popularity rating and ${weightPercent}% preference weight`;

  if (restaurant) {
    interpretation += ` (notably at ${restaurant.name} with ${restaurant.businessRating}/5 rating)`;
  }

  // Enhanced interpretation based on both popularity and weight
  if (dish.popularity > 0.8 && dish.weight > 0.8) {
    interpretation +=
      ". This is a highly popular dish with strong customer preference that could be an excellent addition to your menu.";
  } else if (dish.popularity > 0.6 && dish.weight > 0.6) {
    interpretation +=
      ". This dish has good popularity and strong customer preference - it could work very well for your restaurant.";
  } else if (dish.popularity > 0.6 || dish.weight > 0.6) {
    interpretation +=
      ". This dish shows promise - either through popularity or customer preference - consider if it fits your restaurant's style.";
  } else {
    interpretation +=
      ". This dish has moderate popularity and preference - evaluate carefully if it aligns with your restaurant's concept.";
  }

  // Add weight-specific insights
  if (dish.weight > 0.9) {
    interpretation +=
      " High weight indicates strong customer affinity for this dish.";
  } else if (dish.weight < 0.3) {
    interpretation +=
      " Lower weight suggests this dish may not resonate strongly with customers.";
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
        cuisineType: body.cuisineType,
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
        cuisineType: body.cuisineType,
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
