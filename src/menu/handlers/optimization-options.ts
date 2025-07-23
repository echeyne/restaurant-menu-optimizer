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
 * Handler for optimization options requests
 * @param event API Gateway event
 * @returns API Gateway response with optimization options
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
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

    // Return optimization options with readiness information
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        restaurantId,
        optimizationOptions: options,
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
};

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
