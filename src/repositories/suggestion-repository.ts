/**
 * Suggestion repository for data access to the Suggestions table
 */

import { AbstractRepository } from "./abstract-repository";
import { MenuItemSuggestion, TableNames, IndexNames } from "../models/database";
import { v4 as uuidv4 } from "uuid";

export class SuggestionRepository extends AbstractRepository<MenuItemSuggestion> {
  /**
   * Constructor for the suggestion repository
   */
  constructor() {
    super(TableNames.SUGGESTIONS, "suggestionId");
  }

  /**
   * Create a new menu item suggestion
   * @param suggestion The suggestion to create (without ID and createdAt)
   * @returns The created suggestion
   */
  async create(
    suggestion: Omit<MenuItemSuggestion, "suggestionId" | "createdAt">
  ): Promise<MenuItemSuggestion> {
    const now = new Date().toISOString();
    const newSuggestion: MenuItemSuggestion = {
      ...suggestion,
      suggestionId: uuidv4(),
      createdAt: now,
      status: suggestion.status || "pending",
    };

    return super.create(newSuggestion);
  }

  /**
   * Get suggestions by restaurant ID
   * @param restaurantId The ID of the restaurant
   * @returns Array of suggestions for the restaurant
   */
  async getByRestaurantId(restaurantId: string): Promise<MenuItemSuggestion[]> {
    const params = {
      TableName: this.tableName,
      IndexName: IndexNames.RESTAURANT_ID,
      KeyConditionExpression: "restaurantId = :restaurantId",
      ExpressionAttributeValues: {
        ":restaurantId": restaurantId,
      },
    };

    const result = await this.docClient.query(params).promise();
    return (result.Items || []) as MenuItemSuggestion[];
  }

  /**
   * Get suggestions by status
   * @param restaurantId The ID of the restaurant
   * @param status The status to filter by (pending, approved, rejected)
   * @returns Array of suggestions with the specified status
   */
  async getByStatus(
    restaurantId: string,
    status: "pending" | "approved" | "rejected"
  ): Promise<MenuItemSuggestion[]> {
    const params = {
      TableName: this.tableName,
      IndexName: IndexNames.RESTAURANT_ID,
      KeyConditionExpression: "restaurantId = :restaurantId",
      FilterExpression: "#status = :status",
      ExpressionAttributeNames: {
        "#status": "status", // 'status' is a reserved word in DynamoDB
      },
      ExpressionAttributeValues: {
        ":restaurantId": restaurantId,
        ":status": status,
      },
    };

    const result = await this.docClient.query(params).promise();
    return (result.Items || []) as MenuItemSuggestion[];
  }

  /**
   * Update suggestion status
   * @param suggestionId The ID of the suggestion
   * @param status The new status (pending, approved, rejected)
   * @returns The updated suggestion
   */
  async updateStatus(
    suggestionId: string,
    status: "pending" | "approved" | "rejected"
  ): Promise<MenuItemSuggestion> {
    const params = {
      TableName: this.tableName,
      Key: {
        suggestionId,
      },
      UpdateExpression: "SET #status = :status",
      ExpressionAttributeNames: {
        "#status": "status", // 'status' is a reserved word in DynamoDB
      },
      ExpressionAttributeValues: {
        ":status": status,
      },
      ReturnValues: "ALL_NEW",
    };

    const result = await this.docClient.update(params).promise();
    return result.Attributes as MenuItemSuggestion;
  }

  /**
   * Convert an approved suggestion to a menu item
   * This method doesn't actually create the menu item, it just prepares the data
   * @param suggestionId The ID of the suggestion
   * @returns The suggestion data formatted as a menu item (without itemId)
   */
  async convertToMenuItem(
    suggestionId: string
  ): Promise<
    Omit<MenuItemSuggestion, "suggestionId" | "status" | "createdAt">
  > {
    const suggestion = await this.getById(suggestionId);
    if (!suggestion) {
      throw new Error(`Suggestion with ID ${suggestionId} not found`);
    }

    if (suggestion.status !== "approved") {
      throw new Error(`Suggestion with ID ${suggestionId} is not approved`);
    }

    // Extract the relevant fields for a menu item
    const {
      suggestionId: _,
      status: __,
      createdAt: ___,
      ...menuItemData
    } = suggestion;

    return menuItemData;
  }

  /**
   * Batch create menu item suggestions
   * @param suggestions Array of suggestions to create
   * @returns Array of created suggestions
   */
  async batchCreate(
    suggestions: Omit<MenuItemSuggestion, "suggestionId" | "createdAt">[]
  ): Promise<MenuItemSuggestion[]> {
    const now = new Date().toISOString();
    const createdSuggestions: MenuItemSuggestion[] = [];

    // Process in batches of 25 (DynamoDB batch write limit)
    for (let i = 0; i < suggestions.length; i += 25) {
      const batch = suggestions.slice(i, i + 25);

      const newItems = batch.map((item) => {
        const newItem: MenuItemSuggestion = {
          ...item,
          suggestionId: uuidv4(),
          createdAt: now,
          status: item.status || "pending",
        };
        createdSuggestions.push(newItem);
        return newItem;
      });

      const params = {
        RequestItems: {
          [this.tableName]: newItems.map((item) => ({
            PutRequest: {
              Item: item,
            },
          })),
        },
      };

      await this.docClient.batchWrite(params).promise();
    }

    return createdSuggestions;
  }

  /**
   * List suggestions with optional filtering
   * @param filters Optional filters to apply
   * @returns Array of suggestions matching the filters
   */
  async list(filters?: Record<string, any>): Promise<MenuItemSuggestion[]> {
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
      const expressionAttributeNames: Record<string, string> = {};

      Object.entries(filters).forEach(([key, value]) => {
        // Handle reserved words
        if (key === "status") {
          filterExpressions.push(`#${key} = :${key}`);
          expressionAttributeNames[`#${key}`] = key;
        } else {
          filterExpressions.push(`${key} = :${key}`);
        }
        expressionAttributeValues[`:${key}`] = value;
      });

      params.FilterExpression = filterExpressions.join(" AND ");
      params.ExpressionAttributeValues = expressionAttributeValues;

      if (Object.keys(expressionAttributeNames).length > 0) {
        params.ExpressionAttributeNames = expressionAttributeNames;
      }
    }

    const result = await this.docClient.scan(params).promise();
    return (result.Items || []) as MenuItemSuggestion[];
  }
}
