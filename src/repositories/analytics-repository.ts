/**
 * Analytics repository for data access to the Analytics table
 */

import { AbstractRepository } from "./abstract-repository";
import {
  MenuAnalytics,
  TableNames,
  IndexNames,
  TrendData,
} from "../models/database";
import { v4 as uuidv4 } from "uuid";

export class AnalyticsRepository extends AbstractRepository<MenuAnalytics> {
  /**
   * Constructor for the analytics repository
   */
  constructor() {
    super(TableNames.ANALYTICS, "analyticsId");
  }

  /**
   * Create a new analytics record
   * @param analytics The analytics data to create (without ID and lastUpdated)
   * @returns The created analytics record
   */
  async create(
    analytics: Omit<MenuAnalytics, "analyticsId" | "lastUpdated">
  ): Promise<MenuAnalytics> {
    const now = new Date().toISOString();
    const newAnalytics: MenuAnalytics = {
      ...analytics,
      analyticsId: uuidv4(),
      lastUpdated: now,
    };

    return super.create(newAnalytics);
  }

  /**
   * Get analytics by restaurant ID
   * @param restaurantId The ID of the restaurant
   * @returns Array of analytics records for the restaurant
   */
  async getByRestaurantId(restaurantId: string): Promise<MenuAnalytics[]> {
    const params = {
      TableName: this.tableName,
      IndexName: IndexNames.RESTAURANT_ID,
      KeyConditionExpression: "restaurantId = :restaurantId",
      ExpressionAttributeValues: {
        ":restaurantId": restaurantId,
      },
    };

    const result = await this.docClient.query(params).promise();
    return (result.Items || []) as MenuAnalytics[];
  }

  /**
   * Get analytics by menu item ID
   * @param itemId The ID of the menu item
   * @returns The analytics record for the menu item, or null if not found
   */
  async getByItemId(itemId: string): Promise<MenuAnalytics | null> {
    const params = {
      TableName: this.tableName,
      FilterExpression: "itemId = :itemId",
      ExpressionAttributeValues: {
        ":itemId": itemId,
      },
    };

    const result = await this.docClient.scan(params).promise();
    if (!result.Items || result.Items.length === 0) {
      return null;
    }

    return result.Items[0] as MenuAnalytics;
  }

  /**
   * Update analytics scores
   * @param analyticsId The ID of the analytics record
   * @param scores The scores to update
   * @returns The updated analytics record
   */
  async updateScores(
    analyticsId: string,
    scores: {
      popularityScore?: number;
      profitabilityScore?: number;
      recommendationScore?: number;
    }
  ): Promise<MenuAnalytics> {
    const updateExpressionParts: string[] = [];
    const expressionAttributeValues: Record<string, any> = {
      ":lastUpdated": new Date().toISOString(),
    };

    if (scores.popularityScore !== undefined) {
      updateExpressionParts.push("popularityScore = :popularityScore");
      expressionAttributeValues[":popularityScore"] = scores.popularityScore;
    }

    if (scores.profitabilityScore !== undefined) {
      updateExpressionParts.push("profitabilityScore = :profitabilityScore");
      expressionAttributeValues[":profitabilityScore"] =
        scores.profitabilityScore;
    }

    if (scores.recommendationScore !== undefined) {
      updateExpressionParts.push("recommendationScore = :recommendationScore");
      expressionAttributeValues[":recommendationScore"] =
        scores.recommendationScore;
    }

    updateExpressionParts.push("lastUpdated = :lastUpdated");

    const params = {
      TableName: this.tableName,
      Key: {
        analyticsId,
      },
      UpdateExpression: `SET ${updateExpressionParts.join(", ")}`,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW",
    };

    const result = await this.docClient.update(params).promise();
    return result.Attributes as MenuAnalytics;
  }

  /**
   * Add a trend data point to an analytics record
   * @param analyticsId The ID of the analytics record
   * @param trendData The trend data to add
   * @returns The updated analytics record
   */
  async addTrendData(
    analyticsId: string,
    trendData: TrendData
  ): Promise<MenuAnalytics> {
    const params = {
      TableName: this.tableName,
      Key: {
        analyticsId,
      },
      UpdateExpression:
        "SET trends = list_append(if_not_exists(trends, :empty_list), :trendData), lastUpdated = :lastUpdated",
      ExpressionAttributeValues: {
        ":trendData": [trendData],
        ":empty_list": [],
        ":lastUpdated": new Date().toISOString(),
      },
      ReturnValues: "ALL_NEW",
    };

    const result = await this.docClient.update(params).promise();
    return result.Attributes as MenuAnalytics;
  }

  /**
   * List analytics records with optional filtering
   * @param filters Optional filters to apply
   * @returns Array of analytics records matching the filters
   */
  async list(filters?: Record<string, any>): Promise<MenuAnalytics[]> {
    // If restaurantId is provided, use query with GSI
    if (filters && filters.restaurantId) {
      return this.getByRestaurantId(filters.restaurantId);
    }

    // Otherwise, use scan with filters
    const params: any = {
      TableName: this.tableName,
    };

    // Add filters if provided
    if (filters && Object.keys(filters).length > 0) {
      const filterExpressions: string[] = [];
      const expressionAttributeValues: Record<string, any> = {};

      Object.entries(filters).forEach(([key, value]) => {
        filterExpressions.push(`${key} = :${key}`);
        expressionAttributeValues[`:${key}`] = value;
      });

      params.FilterExpression = filterExpressions.join(" AND ");
      params.ExpressionAttributeValues = expressionAttributeValues;
    }

    const result = await this.docClient.scan(params).promise();
    return (result.Items || []) as MenuAnalytics[];
  }
}
