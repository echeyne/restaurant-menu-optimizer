/**
 * Recommendation repository for data access to the Recommendations table
 */

import { AbstractRepository } from "./abstract-repository";
import { LlmRecommendation, TableNames, IndexNames } from "../models/database";
import { v4 as uuidv4 } from "uuid";

export class RecommendationRepository extends AbstractRepository<LlmRecommendation> {
  /**
   * Constructor for the recommendation repository
   */
  constructor() {
    super(TableNames.RECOMMENDATIONS, "recommendationId");
  }

  /**
   * Create a new recommendation
   * @param recommendation The recommendation to create (without ID and timestamps)
   * @returns The created recommendation
   */
  async create(
    recommendation: Omit<
      LlmRecommendation,
      "recommendationId" | "createdAt" | "expiresAt"
    >
  ): Promise<LlmRecommendation> {
    const now = new Date();
    const createdAt = now.toISOString();

    // Set expiration to 30 days from now by default
    const expiresAt = new Date(now.setDate(now.getDate() + 30)).toISOString();

    const newRecommendation: LlmRecommendation = {
      ...recommendation,
      recommendationId: uuidv4(),
      createdAt,
      expiresAt,
    };

    return super.create(newRecommendation);
  }

  /**
   * Get recommendations by restaurant ID
   * @param restaurantId The ID of the restaurant
   * @returns Array of recommendations for the restaurant
   */
  async getByRestaurantId(restaurantId: string): Promise<LlmRecommendation[]> {
    const params = {
      TableName: this.tableName,
      IndexName: IndexNames.RESTAURANT_ID,
      KeyConditionExpression: "restaurantId = :restaurantId",
      ExpressionAttributeValues: {
        ":restaurantId": restaurantId,
      },
    };

    const result = await this.docClient.query(params).promise();
    return (result.Items || []) as LlmRecommendation[];
  }

  /**
   * Get active recommendations by restaurant ID (not expired)
   * @param restaurantId The ID of the restaurant
   * @returns Array of active recommendations for the restaurant
   */
  async getActiveByRestaurantId(
    restaurantId: string
  ): Promise<LlmRecommendation[]> {
    const now = new Date().toISOString();

    const params = {
      TableName: this.tableName,
      IndexName: IndexNames.RESTAURANT_ID,
      KeyConditionExpression: "restaurantId = :restaurantId",
      FilterExpression: "expiresAt > :now",
      ExpressionAttributeValues: {
        ":restaurantId": restaurantId,
        ":now": now,
      },
    };

    const result = await this.docClient.query(params).promise();
    return (result.Items || []) as LlmRecommendation[];
  }

  /**
   * Get recommendations by customer segment
   * @param restaurantId The ID of the restaurant
   * @param targetCustomerSegment The target customer segment
   * @returns Array of recommendations for the customer segment
   */
  async getByCustomerSegment(
    restaurantId: string,
    targetCustomerSegment: string
  ): Promise<LlmRecommendation[]> {
    const params = {
      TableName: this.tableName,
      IndexName: IndexNames.RESTAURANT_ID,
      KeyConditionExpression: "restaurantId = :restaurantId",
      FilterExpression: "targetCustomerSegment = :targetCustomerSegment",
      ExpressionAttributeValues: {
        ":restaurantId": restaurantId,
        ":targetCustomerSegment": targetCustomerSegment,
      },
    };

    const result = await this.docClient.query(params).promise();
    return (result.Items || []) as LlmRecommendation[];
  }

  /**
   * Update recommendation expiration
   * @param recommendationId The ID of the recommendation
   * @param expiresAt The new expiration date
   * @returns The updated recommendation
   */
  async updateExpiration(
    recommendationId: string,
    expiresAt: string
  ): Promise<LlmRecommendation> {
    const params = {
      TableName: this.tableName,
      Key: {
        recommendationId,
      },
      UpdateExpression: "SET expiresAt = :expiresAt",
      ExpressionAttributeValues: {
        ":expiresAt": expiresAt,
      },
      ReturnValues: "ALL_NEW",
    };

    const result = await this.docClient.update(params).promise();
    return result.Attributes as LlmRecommendation;
  }

  /**
   * List recommendations with optional filtering
   * @param filters Optional filters to apply
   * @returns Array of recommendations matching the filters
   */
  async list(filters?: Record<string, any>): Promise<LlmRecommendation[]> {
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
    return (result.Items || []) as LlmRecommendation[];
  }
}
