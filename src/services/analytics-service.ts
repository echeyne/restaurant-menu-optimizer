/**
 * Analytics service for collecting and aggregating menu performance data
 */

import { AnalyticsRepository } from "../repositories/analytics-repository";
import { MenuItemRepository } from "../repositories/menu-item-repository";
import { RestaurantRepository } from "../repositories/restaurant-repository";
import {
  MenuAnalytics,
  MenuItem,
  Restaurant,
  TrendData,
} from "../models/database";

export interface AnalyticsMetrics {
  popularityScore: number;
  profitabilityScore: number;
  recommendationScore: number;
}

export interface DashboardData {
  totalMenuItems: number;
  averagePopularityScore: number;
  averageProfitabilityScore: number;
  averageRecommendationScore: number;
  topPerformingItems: MenuItem[];
  lowPerformingItems: MenuItem[];
  recentTrends: TrendData[];
  categoryBreakdown: CategoryMetrics[];
  monthlyTrends: MonthlyTrend[];
}

export interface CategoryMetrics {
  category: string;
  itemCount: number;
  averageScore: number;
  totalRevenue?: number;
}

export interface MonthlyTrend {
  month: string;
  averagePopularity: number;
  averageProfitability: number;
  averageRecommendation: number;
}

export interface ScoreCalculationParams {
  menuItem: MenuItem;
  restaurant: Restaurant;
  historicalData?: TrendData[];
}

export class AnalyticsService {
  private analyticsRepository: AnalyticsRepository;
  private menuItemRepository: MenuItemRepository;
  private restaurantRepository: RestaurantRepository;

  constructor() {
    this.analyticsRepository = new AnalyticsRepository();
    this.menuItemRepository = new MenuItemRepository();
    this.restaurantRepository = new RestaurantRepository();
  }

  /**
   * Calculate analytics scores for a menu item
   * @param params Parameters for score calculation
   * @returns Calculated analytics metrics
   */
  async calculateScores(
    params: ScoreCalculationParams
  ): Promise<AnalyticsMetrics> {
    const { menuItem, restaurant } = params;

    // Calculate popularity score based on various factors
    const popularityScore = this.calculatePopularityScore(menuItem, restaurant);

    // Calculate profitability score based on price and estimated costs
    const profitabilityScore = this.calculateProfitabilityScore(
      menuItem,
      restaurant
    );

    // Calculate recommendation score based on AI enhancements and taste profiles
    const recommendationScore = this.calculateRecommendationScore(menuItem);

    return {
      popularityScore,
      profitabilityScore,
      recommendationScore,
    };
  }

  /**
   * Calculate popularity score for a menu item
   * @param menuItem The menu item to analyze
   * @param restaurant The restaurant context
   * @returns Popularity score (0-100)
   */
  private calculatePopularityScore(
    menuItem: MenuItem,
    restaurant: Restaurant
  ): number {
    let score = 50; // Base score

    // Factor in AI-generated enhancements
    if (
      menuItem.enhancedDescription &&
      menuItem.enhancedDescriptionStatus === "approved"
    ) {
      score += 15;
    }

    // Factor in dietary tags (broader appeal)
    if (menuItem.dietaryTags && menuItem.dietaryTags.length > 0) {
      score += Math.min(menuItem.dietaryTags.length * 5, 20);
    }

    // Factor in category popularity (some categories are generally more popular)
    const popularCategories = [
      "appetizers",
      "burgers",
      "pizza",
      "pasta",
      "desserts",
    ];
    if (popularCategories.includes(menuItem.category.toLowerCase())) {
      score += 10;
    }

    // Factor in price point relative to restaurant's price level
    if (restaurant.priceLevel) {
      const expectedPriceRange = this.getExpectedPriceRange(
        restaurant.priceLevel
      );
      if (
        menuItem.price >= expectedPriceRange.min &&
        menuItem.price <= expectedPriceRange.max
      ) {
        score += 10;
      }
    }

    // Factor in LLM-generated tags
    if (menuItem.llmGeneratedTags && menuItem.llmGeneratedTags.length > 0) {
      score += 5;
    }

    return Math.min(Math.max(score, 0), 100);
  }

  /**
   * Calculate profitability score for a menu item
   * @param menuItem The menu item to analyze
   * @param restaurant The restaurant context
   * @returns Profitability score (0-100)
   */
  private calculateProfitabilityScore(
    menuItem: MenuItem,
    restaurant: Restaurant
  ): number {
    let score = 50; // Base score

    // Estimate food cost based on ingredients (simplified calculation)
    const estimatedFoodCost = this.estimateFoodCost(menuItem);
    const grossMargin = (menuItem.price - estimatedFoodCost) / menuItem.price;

    // Score based on gross margin
    if (grossMargin > 0.7) {
      score += 30;
    } else if (grossMargin > 0.6) {
      score += 20;
    } else if (grossMargin > 0.5) {
      score += 10;
    } else if (grossMargin < 0.3) {
      score -= 20;
    }

    // Factor in price competitiveness
    if (restaurant.priceLevel) {
      const expectedPriceRange = this.getExpectedPriceRange(
        restaurant.priceLevel
      );
      const pricePosition =
        (menuItem.price - expectedPriceRange.min) /
        (expectedPriceRange.max - expectedPriceRange.min);

      // Sweet spot is around 60-80% of the price range
      if (pricePosition >= 0.6 && pricePosition <= 0.8) {
        score += 15;
      } else if (pricePosition > 0.9) {
        score -= 10; // Too expensive
      }
    }

    return Math.min(Math.max(score, 0), 100);
  }

  /**
   * Calculate recommendation score for a menu item
   * @param menuItem The menu item to analyze
   * @returns Recommendation score (0-100)
   */
  private calculateRecommendationScore(menuItem: MenuItem): number {
    let score = 50; // Base score

    // Factor in AI enhancements
    if (
      menuItem.enhancedDescription &&
      menuItem.enhancedDescriptionStatus === "approved"
    ) {
      score += 20;
    }

    // Factor in Qloo taste profile availability
    if (menuItem.qlooTasteProfile) {
      score += 15;
    }

    // Factor in LLM-generated tags
    if (menuItem.llmGeneratedTags && menuItem.llmGeneratedTags.length > 0) {
      score += 10;
    }

    // Factor in dietary accommodations
    if (menuItem.dietaryTags && menuItem.dietaryTags.length > 0) {
      score += 10;
    }

    // Factor in description quality (length and detail)
    const descriptionLength = menuItem.description.length;
    if (descriptionLength > 100) {
      score += 10;
    } else if (descriptionLength < 30) {
      score -= 10;
    }

    // Factor in ingredient count (more ingredients can indicate complexity/value)
    if (menuItem.ingredients && menuItem.ingredients.length > 5) {
      score += 5;
    }

    return Math.min(Math.max(score, 0), 100);
  }

  /**
   * Estimate food cost for a menu item (simplified calculation)
   * @param menuItem The menu item to analyze
   * @returns Estimated food cost
   */
  private estimateFoodCost(menuItem: MenuItem): number {
    // Simplified cost estimation based on category and ingredients
    const baseCosts: Record<string, number> = {
      appetizers: 3,
      salads: 4,
      soups: 3,
      sandwiches: 5,
      burgers: 6,
      pizza: 4,
      pasta: 4,
      seafood: 12,
      steaks: 15,
      chicken: 7,
      pork: 8,
      beef: 10,
      vegetarian: 4,
      desserts: 3,
      beverages: 1,
    };

    const baseCost = baseCosts[menuItem.category.toLowerCase()] || 5;

    // Add cost based on ingredient count (premium ingredients)
    const ingredientCost = menuItem.ingredients
      ? menuItem.ingredients.length * 0.5
      : 0;

    return baseCost + ingredientCost;
  }

  /**
   * Get expected price range for a restaurant's price level
   * @param priceLevel The restaurant's price level
   * @returns Expected price range
   */
  private getExpectedPriceRange(priceLevel: number): {
    min: number;
    max: number;
  } {
    const ranges = {
      1: { min: 5, max: 15 }, // Budget
      2: { min: 12, max: 25 }, // Moderate
      3: { min: 20, max: 40 }, // Upscale
      4: { min: 35, max: 80 }, // Luxury
    };

    return ranges[priceLevel as keyof typeof ranges] || { min: 10, max: 30 };
  }

  /**
   * Collect and update analytics data for a restaurant
   * @param restaurantId The restaurant ID
   * @returns Updated analytics records
   */
  async collectAnalyticsData(restaurantId: string): Promise<MenuAnalytics[]> {
    // Get restaurant and menu items
    const restaurant = await this.restaurantRepository.getById(restaurantId);
    if (!restaurant) {
      throw new Error(`Restaurant not found: ${restaurantId}`);
    }

    const menuItems = await this.menuItemRepository.getByRestaurantId(
      restaurantId
    );
    const analyticsRecords: MenuAnalytics[] = [];

    // Process each menu item
    for (const menuItem of menuItems) {
      // Calculate scores
      const scores = await this.calculateScores({ menuItem, restaurant });

      // Check if analytics record exists
      let existingAnalytics = await this.analyticsRepository.getByItemId(
        menuItem.itemId
      );

      if (existingAnalytics) {
        // Update existing record
        const updatedAnalytics = await this.analyticsRepository.updateScores(
          existingAnalytics.analyticsId,
          scores
        );

        // Add trend data
        const trendData: TrendData = {
          date: new Date().toISOString(),
          metric: "composite",
          value:
            (scores.popularityScore +
              scores.profitabilityScore +
              scores.recommendationScore) /
            3,
        };

        await this.analyticsRepository.addTrendData(
          existingAnalytics.analyticsId,
          trendData
        );
        analyticsRecords.push(updatedAnalytics);
      } else {
        // Create new analytics record
        const newAnalytics = await this.analyticsRepository.create({
          restaurantId,
          itemId: menuItem.itemId,
          popularityScore: scores.popularityScore,
          profitabilityScore: scores.profitabilityScore,
          recommendationScore: scores.recommendationScore,
          trends: [
            {
              date: new Date().toISOString(),
              metric: "composite",
              value:
                (scores.popularityScore +
                  scores.profitabilityScore +
                  scores.recommendationScore) /
                3,
            },
          ],
        });

        analyticsRecords.push(newAnalytics);
      }
    }

    return analyticsRecords;
  }

  /**
   * Get dashboard data for a restaurant
   * @param restaurantId The restaurant ID
   * @param timeframe Optional timeframe filter
   * @returns Dashboard data
   */
  async getDashboardData(
    restaurantId: string,
    timeframe?: string
  ): Promise<DashboardData> {
    const analyticsRecords = await this.analyticsRepository.getByRestaurantId(
      restaurantId
    );
    const menuItems = await this.menuItemRepository.getByRestaurantId(
      restaurantId
    );

    // Calculate aggregate metrics
    const totalMenuItems = menuItems.length;
    const averagePopularityScore = this.calculateAverage(
      analyticsRecords,
      "popularityScore"
    );
    const averageProfitabilityScore = this.calculateAverage(
      analyticsRecords,
      "profitabilityScore"
    );
    const averageRecommendationScore = this.calculateAverage(
      analyticsRecords,
      "recommendationScore"
    );

    // Get top and low performing items
    const sortedByComposite = analyticsRecords.sort((a, b) => {
      const aComposite =
        (a.popularityScore + a.profitabilityScore + a.recommendationScore) / 3;
      const bComposite =
        (b.popularityScore + b.profitabilityScore + b.recommendationScore) / 3;
      return bComposite - aComposite;
    });

    const topPerformingItems = await this.getMenuItemsByAnalytics(
      sortedByComposite.slice(0, 5)
    );
    const lowPerformingItems = await this.getMenuItemsByAnalytics(
      sortedByComposite.slice(-5).reverse()
    );

    // Get recent trends
    const recentTrends = this.extractRecentTrends(analyticsRecords, 30); // Last 30 days

    // Calculate category breakdown
    const categoryBreakdown = this.calculateCategoryBreakdown(
      menuItems,
      analyticsRecords
    );

    // Calculate monthly trends
    const monthlyTrends = this.calculateMonthlyTrends(analyticsRecords);

    return {
      totalMenuItems,
      averagePopularityScore,
      averageProfitabilityScore,
      averageRecommendationScore,
      topPerformingItems,
      lowPerformingItems,
      recentTrends,
      categoryBreakdown,
      monthlyTrends,
    };
  }

  /**
   * Calculate average score for a specific metric
   * @param records Analytics records
   * @param metric Metric to calculate average for
   * @returns Average score
   */
  private calculateAverage(
    records: MenuAnalytics[],
    metric: keyof Pick<
      MenuAnalytics,
      "popularityScore" | "profitabilityScore" | "recommendationScore"
    >
  ): number {
    if (records.length === 0) return 0;
    const sum = records.reduce((acc, record) => acc + record[metric], 0);
    return Math.round((sum / records.length) * 100) / 100;
  }

  /**
   * Get menu items by their analytics records
   * @param analyticsRecords Analytics records
   * @returns Menu items
   */
  private async getMenuItemsByAnalytics(
    analyticsRecords: MenuAnalytics[]
  ): Promise<MenuItem[]> {
    const menuItems: MenuItem[] = [];
    for (const analytics of analyticsRecords) {
      const menuItem = await this.menuItemRepository.getById(analytics.itemId);
      if (menuItem) {
        menuItems.push(menuItem);
      }
    }
    return menuItems;
  }

  /**
   * Extract recent trends from analytics records
   * @param records Analytics records
   * @param days Number of days to look back
   * @returns Recent trend data
   */
  private extractRecentTrends(
    records: MenuAnalytics[],
    days: number
  ): TrendData[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentTrends: TrendData[] = [];

    records.forEach((record) => {
      if (record.trends) {
        const recentRecordTrends = record.trends.filter(
          (trend) => new Date(trend.date) >= cutoffDate
        );
        recentTrends.push(...recentRecordTrends);
      }
    });

    return recentTrends.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  /**
   * Calculate category breakdown metrics
   * @param menuItems Menu items
   * @param analyticsRecords Analytics records
   * @returns Category metrics
   */
  private calculateCategoryBreakdown(
    menuItems: MenuItem[],
    analyticsRecords: MenuAnalytics[]
  ): CategoryMetrics[] {
    const categoryMap = new Map<
      string,
      { items: MenuItem[]; analytics: MenuAnalytics[] }
    >();

    // Group items by category
    menuItems.forEach((item) => {
      if (!categoryMap.has(item.category)) {
        categoryMap.set(item.category, { items: [], analytics: [] });
      }
      categoryMap.get(item.category)!.items.push(item);
    });

    // Add analytics to categories
    analyticsRecords.forEach((analytics) => {
      const menuItem = menuItems.find(
        (item) => item.itemId === analytics.itemId
      );
      if (menuItem) {
        const categoryData = categoryMap.get(menuItem.category);
        if (categoryData) {
          categoryData.analytics.push(analytics);
        }
      }
    });

    // Calculate metrics for each category
    const categoryMetrics: CategoryMetrics[] = [];
    categoryMap.forEach((data, category) => {
      const averageScore =
        data.analytics.length > 0
          ? data.analytics.reduce(
              (sum, a) =>
                sum +
                (a.popularityScore +
                  a.profitabilityScore +
                  a.recommendationScore) /
                  3,
              0
            ) / data.analytics.length
          : 0;

      categoryMetrics.push({
        category,
        itemCount: data.items.length,
        averageScore: Math.round(averageScore * 100) / 100,
      });
    });

    return categoryMetrics.sort((a, b) => b.averageScore - a.averageScore);
  }

  /**
   * Calculate monthly trends from analytics records
   * @param records Analytics records
   * @returns Monthly trend data
   */
  private calculateMonthlyTrends(records: MenuAnalytics[]): MonthlyTrend[] {
    const monthlyData = new Map<
      string,
      {
        popularity: number[];
        profitability: number[];
        recommendation: number[];
      }
    >();

    // Group trends by month
    records.forEach((record) => {
      if (record.trends) {
        record.trends.forEach((trend) => {
          const date = new Date(trend.date);
          const monthKey = `${date.getFullYear()}-${String(
            date.getMonth() + 1
          ).padStart(2, "0")}`;

          if (!monthlyData.has(monthKey)) {
            monthlyData.set(monthKey, {
              popularity: [],
              profitability: [],
              recommendation: [],
            });
          }
        });
      }

      // Add current scores to the latest month
      const currentMonth = new Date().toISOString().substring(0, 7);
      if (!monthlyData.has(currentMonth)) {
        monthlyData.set(currentMonth, {
          popularity: [],
          profitability: [],
          recommendation: [],
        });
      }

      const currentData = monthlyData.get(currentMonth)!;
      currentData.popularity.push(record.popularityScore);
      currentData.profitability.push(record.profitabilityScore);
      currentData.recommendation.push(record.recommendationScore);
    });

    // Calculate averages for each month
    const monthlyTrends: MonthlyTrend[] = [];
    monthlyData.forEach((data, month) => {
      const averagePopularity =
        data.popularity.length > 0
          ? data.popularity.reduce((sum, val) => sum + val, 0) /
            data.popularity.length
          : 0;
      const averageProfitability =
        data.profitability.length > 0
          ? data.profitability.reduce((sum, val) => sum + val, 0) /
            data.profitability.length
          : 0;
      const averageRecommendation =
        data.recommendation.length > 0
          ? data.recommendation.reduce((sum, val) => sum + val, 0) /
            data.recommendation.length
          : 0;

      monthlyTrends.push({
        month,
        averagePopularity: Math.round(averagePopularity * 100) / 100,
        averageProfitability: Math.round(averageProfitability * 100) / 100,
        averageRecommendation: Math.round(averageRecommendation * 100) / 100,
      });
    });

    return monthlyTrends.sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Schedule analytics updates for all restaurants
   * This method would typically be called by a scheduled Lambda function
   */
  async scheduleAnalyticsUpdates(): Promise<void> {
    try {
      // Get all restaurants
      const restaurants = await this.restaurantRepository.list();

      // Process each restaurant
      for (const restaurant of restaurants) {
        try {
          await this.collectAnalyticsData(restaurant.restaurantId);
          console.log(
            `Analytics updated for restaurant: ${restaurant.restaurantId}`
          );
        } catch (error) {
          console.error(
            `Failed to update analytics for restaurant ${restaurant.restaurantId}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error("Failed to schedule analytics updates:", error);
      throw error;
    }
  }
}
