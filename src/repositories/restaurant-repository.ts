/**
 * Restaurant repository for data access to the Restaurants table
 */

import { AbstractRepository } from "./abstract-repository";
import { Restaurant, TableNames, QlooSearchResult } from "../models/database";
import { v4 as uuidv4 } from "uuid";

export class RestaurantRepository extends AbstractRepository<Restaurant> {
  /**
   * Constructor for the restaurant repository
   */
  constructor() {
    super(TableNames.RESTAURANTS, "restaurantId");
  }

  /**
   * Create a new restaurant
   * @param restaurant The restaurant to create
   * @param restaurantId The restaurantId to update
   * @returns The created restaurant
   */
  async create(
    restaurant: Omit<Restaurant, "createdAt">,
    restaurantId?: string
  ): Promise<Restaurant> {
    const now = new Date().toISOString();
    const newRestaurant: Restaurant = {
      ...restaurant,
      restaurantId: restaurantId ?? uuidv4(),
      createdAt: now,
      profileSetupComplete: false,
    };

    return super.create(newRestaurant);
  }

  /**
   * Get a restaurant by owner ID
   * @param ownerId The Cognito user ID of the restaurant owner
   * @returns The restaurant if found, null otherwise
   */
  async getByOwnerId(ownerId: string): Promise<Restaurant | null> {
    const params = {
      TableName: this.tableName,
      FilterExpression: "ownerId = :ownerId",
      ExpressionAttributeValues: {
        ":ownerId": ownerId,
      },
    };

    const result = await this.docClient.scan(params).promise();
    if (!result.Items || result.Items.length === 0) {
      return null;
    }

    return result.Items[0] as Restaurant;
  }

  /**
   * List restaurants with optional filtering
   * @param filters Optional filters to apply
   * @returns Array of restaurants matching the filters
   */
  async list(filters?: Record<string, any>): Promise<Restaurant[]> {
    // Start with a basic scan operation
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
    return (result.Items || []) as Restaurant[];
  }

  /**
   * Update restaurant settings
   * @param restaurantId The ID of the restaurant
   * @param settings The settings to update
   * @returns The updated restaurant
   */
  async updateSettings(
    restaurantId: string,
    settings: Restaurant["settings"]
  ): Promise<Restaurant> {
    const params = {
      TableName: this.tableName,
      Key: {
        restaurantId,
      },
      UpdateExpression: "SET settings = :settings",
      ExpressionAttributeValues: {
        ":settings": settings,
      },
      ReturnValues: "ALL_NEW",
    };

    const result = await this.docClient.update(params).promise();
    return result.Attributes as Restaurant;
  }

  /**
   * Update restaurant with Qloo data
   * @param restaurantId The ID of the restaurant
   * @param qlooData The Qloo search result data to update
   * @returns The updated restaurant
   */
  async updateWithQlooData(
    restaurantId: string,
    qlooData: QlooSearchResult
  ): Promise<Restaurant> {
    const params = {
      TableName: this.tableName,
      Key: {
        restaurantId,
      },
      UpdateExpression:
        "SET qlooEntityId = :qlooEntityId, entityId = :entityId, address = :address, priceLevel = :priceLevel, cuisine = :cuisine, popularity = :popularity, description = :description, specialtyDishes = :specialtyDishes, businessRating = :businessRating",
      ExpressionAttributeValues: {
        ":qlooEntityId": qlooData.entityId,
        ":entityId": qlooData.entityId,
        ":address": qlooData.address,
        ":priceLevel": qlooData.priceLevel,
        ":cuisine": qlooData.cuisine,
        ":popularity": qlooData.popularity,
        ":description": qlooData.description,
        ":specialtyDishes": qlooData.specialtyDishes || [],
        ":businessRating": qlooData.businessRating,
      },
      ReturnValues: "ALL_NEW",
    };

    const result = await this.docClient.update(params).promise();
    return result.Attributes as Restaurant;
  }

  /**
   * Mark restaurant profile setup as complete
   * @param restaurantId The ID of the restaurant
   * @returns The updated restaurant
   */
  async markProfileSetupComplete(restaurantId: string): Promise<Restaurant> {
    const params = {
      TableName: this.tableName,
      Key: {
        restaurantId,
      },
      UpdateExpression: "SET profileSetupComplete = :complete",
      ExpressionAttributeValues: {
        ":complete": true,
      },
      ReturnValues: "ALL_NEW",
    };

    const result = await this.docClient.update(params).promise();
    return result.Attributes as Restaurant;
  }
}
