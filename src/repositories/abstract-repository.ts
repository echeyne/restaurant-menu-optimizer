/**
 * Abstract base repository implementation for DynamoDB
 * Provides common CRUD operations for DynamoDB tables
 */

import { DynamoDB } from "aws-sdk";
import { BaseRepository } from "./base-repository";

export abstract class AbstractRepository<T> implements BaseRepository<T> {
  protected readonly docClient: DynamoDB.DocumentClient;
  protected readonly tableName: string;
  protected readonly primaryKey: string;

  /**
   * Constructor for the abstract repository
   * @param tableName The name of the DynamoDB table
   * @param primaryKey The name of the primary key attribute
   */
  constructor(tableName: string, primaryKey: string) {
    this.docClient = new DynamoDB.DocumentClient({
      region: process.env.REGION || "us-east-1",
    });
    this.tableName = tableName;
    this.primaryKey = primaryKey;
  }

  /**
   * Create a new item in the database
   * @param item The item to create
   * @returns The created item
   */
  async create(item: T): Promise<T> {
    await this.docClient
      .put({
        TableName: this.tableName,
        Item: item as Record<string, any>,
      })
      .promise();

    return item;
  }

  /**
   * Get an item by its primary key
   * @param id The primary key of the item
   * @returns The item if found, null otherwise
   */
  async getById(id: string): Promise<T | null> {
    const params = {
      TableName: this.tableName,
      Key: {
        [this.primaryKey]: id,
      },
    };

    const result = await this.docClient.get(params).promise();
    return (result.Item as T) || null;
  }

  /**
   * Update an existing item
   * @param id The primary key of the item
   * @param updates Partial updates to apply to the item
   * @returns The updated item
   */
  async update(id: string, updates: Partial<T>): Promise<T> {
    // Create update expression and attribute values
    const updateExpressionParts: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== this.primaryKey) {
        updateExpressionParts.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    });

    if (updateExpressionParts.length === 0) {
      // No updates to apply
      const item = await this.getById(id);
      if (!item) {
        throw new Error(`Item with ${this.primaryKey} ${id} not found`);
      }
      return item;
    }

    const params = {
      TableName: this.tableName,
      Key: {
        [this.primaryKey]: id,
      },
      UpdateExpression: `SET ${updateExpressionParts.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW",
    };

    const result = await this.docClient.update(params).promise();
    return result.Attributes as T;
  }

  /**
   * Delete an item by its primary key
   * @param id The primary key of the item
   * @returns True if the item was deleted, false otherwise
   */
  async delete(id: string): Promise<boolean> {
    const params = {
      TableName: this.tableName,
      Key: {
        [this.primaryKey]: id,
      },
    };

    await this.docClient.delete(params).promise();
    return true;
  }

  /**
   * List items with optional filtering
   * This is a base implementation that needs to be extended by child classes
   * @param filters Optional filters to apply
   * @returns Array of items matching the filters
   */
  abstract list(filters?: Record<string, any>): Promise<T[]>;
}
