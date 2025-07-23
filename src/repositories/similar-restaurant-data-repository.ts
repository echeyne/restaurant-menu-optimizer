/**
 * Similar Restaurant Data repository for data access to the SimilarRestaurantData table
 */

import { AbstractRepository } from "./abstract-repository";
import {
  SimilarRestaurantData,
  TableNames,
  IndexNames,
} from "../models/database";

export class SimilarRestaurantDataRepository extends AbstractRepository<SimilarRestaurantData> {
  /**
   * Constructor for the similar restaurant data repository
   */
  constructor() {
    super(TableNames.SIMILAR_RESTAURANT_DATA, "restaurantId");
  }

  /**
   * Create or update similar restaurant data
   * @param data The similar restaurant data to create or update
   * @returns The created/updated similar restaurant data
   */
  async createOrUpdate(
    data: SimilarRestaurantData
  ): Promise<SimilarRestaurantData> {
    const dataWithTimestamp = {
      ...data,
      retrievedAt: new Date().toISOString(),
    };

    return super.create(dataWithTimestamp);
  }

  /**
   * Get similar restaurant data by Qloo entity ID
   * @param qlooEntityId The Qloo entity ID
   * @returns The similar restaurant data if found, null otherwise
   */
  async getByQlooEntityId(
    qlooEntityId: string
  ): Promise<SimilarRestaurantData | null> {
    const params = {
      TableName: this.tableName,
      IndexName: IndexNames.QLOO_ENTITY_ID,
      KeyConditionExpression: "qlooEntityId = :qlooEntityId",
      ExpressionAttributeValues: {
        ":qlooEntityId": qlooEntityId,
      },
    };

    const result = await this.docClient.query(params).promise();
    if (!result.Items || result.Items.length === 0) {
      return null;
    }

    return result.Items[0] as SimilarRestaurantData;
  }

  /**
   * Get specialty dishes for a restaurant
   * @param restaurantId The restaurant ID
   * @returns Array of specialty dishes
   */
  async getSpecialtyDishes(restaurantId: string): Promise<any[]> {
    const data = await this.getById(restaurantId);
    return data?.specialtyDishes || [];
  }

  /**
   * Get similar restaurants for a restaurant
   * @param restaurantId The restaurant ID
   * @returns Array of similar restaurants
   */
  async getSimilarRestaurants(restaurantId: string): Promise<any[]> {
    const data = await this.getById(restaurantId);
    return data?.similarRestaurants || [];
  }

  /**
   * Update specialty dishes for a restaurant
   * @param restaurantId The restaurant ID
   * @param specialtyDishes The specialty dishes to update
   * @returns The updated similar restaurant data
   */
  async updateSpecialtyDishes(
    restaurantId: string,
    specialtyDishes: any[]
  ): Promise<SimilarRestaurantData> {
    const params = {
      TableName: this.tableName,
      Key: {
        restaurantId,
      },
      UpdateExpression:
        "SET specialtyDishes = :specialtyDishes, retrievedAt = :retrievedAt",
      ExpressionAttributeValues: {
        ":specialtyDishes": specialtyDishes,
        ":retrievedAt": new Date().toISOString(),
      },
      ReturnValues: "ALL_NEW",
    };

    const result = await this.docClient.update(params).promise();
    return result.Attributes as SimilarRestaurantData;
  }

  /**
   * List similar restaurant data with optional filtering
   * @param filters Optional filters to apply
   * @returns Array of similar restaurant data matching the filters
   */
  async list(filters?: Record<string, any>): Promise<SimilarRestaurantData[]> {
    const params: any = {
      TableName: this.tableName,
    };

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
    return (result.Items || []) as SimilarRestaurantData[];
  }
}
