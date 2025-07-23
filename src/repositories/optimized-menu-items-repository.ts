/**
 * Optimized Menu Items repository for data access to the OptimizedMenuItems table
 */

import { AbstractRepository } from "./abstract-repository";
import { OptimizedMenuItem, TableNames, IndexNames } from "../models/database";

export class OptimizedMenuItemsRepository extends AbstractRepository<OptimizedMenuItem> {
  /**
   * Constructor for the optimized menu items repository
   */
  constructor() {
    super(TableNames.OPTIMIZED_MENU_ITEMS, "itemId");
  }

  /**
   * Create a new optimized menu item
   * @param optimizedItem The optimized menu item to create
   * @returns The created optimized menu item
   */
  async create(optimizedItem: OptimizedMenuItem): Promise<OptimizedMenuItem> {
    const itemWithTimestamp = {
      ...optimizedItem,
      createdAt: new Date().toISOString(),
    };

    return super.create(itemWithTimestamp);
  }

  /**
   * Get optimized menu items by restaurant ID
   * @param restaurantId The restaurant ID
   * @param status Optional status filter
   * @returns Array of optimized menu items
   */
  async getByRestaurantId(
    restaurantId: string,
    status?: "pending" | "approved" | "rejected"
  ): Promise<OptimizedMenuItem[]> {
    const params: any = {
      TableName: this.tableName,
      IndexName: IndexNames.RESTAURANT_ID,
      KeyConditionExpression: "restaurantId = :restaurantId",
      ExpressionAttributeValues: {
        ":restaurantId": restaurantId,
      },
    };

    if (status) {
      params.FilterExpression = "#status = :status";
      params.ExpressionAttributeNames = {
        "#status": "status",
      };
      params.ExpressionAttributeValues[":status"] = status;
    }

    const result = await this.docClient.query(params).promise();
    return (result.Items || []) as OptimizedMenuItem[];
  }

  /**
   * Update the status of an optimized menu item
   * @param itemId The item ID
   * @param status The new status
   * @returns The updated optimized menu item
   */
  async updateStatus(
    itemId: string,
    status: "pending" | "approved" | "rejected"
  ): Promise<OptimizedMenuItem> {
    const params = {
      TableName: this.tableName,
      Key: {
        itemId,
      },
      UpdateExpression: "SET #status = :status",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":status": status,
      },
      ReturnValues: "ALL_NEW",
    };

    const result = await this.docClient.update(params).promise();
    return result.Attributes as OptimizedMenuItem;
  }

  /**
   * Get pending optimizations for a restaurant
   * @param restaurantId The restaurant ID
   * @returns Array of pending optimized menu items
   */
  async getPendingOptimizations(
    restaurantId: string
  ): Promise<OptimizedMenuItem[]> {
    return this.getByRestaurantId(restaurantId, "pending");
  }

  /**
   * Get approved optimizations for a restaurant
   * @param restaurantId The restaurant ID
   * @returns Array of approved optimized menu items
   */
  async getApprovedOptimizations(
    restaurantId: string
  ): Promise<OptimizedMenuItem[]> {
    return this.getByRestaurantId(restaurantId, "approved");
  }

  /**
   * Batch create optimized menu items
   * @param optimizedItems Array of optimized menu items to create
   * @returns Array of created optimized menu items
   */
  async batchCreate(
    optimizedItems: OptimizedMenuItem[]
  ): Promise<OptimizedMenuItem[]> {
    const itemsWithTimestamp = optimizedItems.map((item) => ({
      ...item,
      createdAt: new Date().toISOString(),
    }));

    // DynamoDB batch write has a limit of 25 items
    const batchSize = 25;
    const results: OptimizedMenuItem[] = [];

    for (let i = 0; i < itemsWithTimestamp.length; i += batchSize) {
      const batch = itemsWithTimestamp.slice(i, i + batchSize);
      const writeRequests = batch.map((item) => ({
        PutRequest: {
          Item: item,
        },
      }));

      const params = {
        RequestItems: {
          [this.tableName]: writeRequests,
        },
      };

      await this.docClient.batchWrite(params).promise();
      results.push(...batch);
    }

    return results;
  }

  /**
   * Delete optimized menu item
   * @param itemId The item ID to delete
   * @returns Promise that resolves when deletion is complete
   */
  async deleteOptimization(itemId: string): Promise<void> {
    await this.delete(itemId);
  }

  /**
   * List optimized menu items with optional filtering
   * @param filters Optional filters to apply
   * @returns Array of optimized menu items matching the filters
   */
  async list(filters?: Record<string, any>): Promise<OptimizedMenuItem[]> {
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
    return (result.Items || []) as OptimizedMenuItem[];
  }
}
