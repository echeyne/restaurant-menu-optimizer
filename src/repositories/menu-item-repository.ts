/**
 * Menu item repository for data access to the MenuItems table
 */

import { AbstractRepository } from "./abstract-repository";
import { MenuItem, TableNames, IndexNames } from "../models/database";
import { v4 as uuidv4 } from "uuid";

export class MenuItemRepository extends AbstractRepository<MenuItem> {
  /**
   * Constructor for the menu item repository
   */
  constructor() {
    super(TableNames.MENU_ITEMS, "itemId");
  }

  /**
   * Create a new menu item
   * @param menuItem The menu item to create
   * @returns The created menu item
   */
  async create(
    menuItem: Omit<MenuItem, "itemId" | "createdAt" | "updatedAt">
  ): Promise<MenuItem> {
    const now = new Date().toISOString();
    const newMenuItem: MenuItem = {
      ...menuItem,
      itemId: uuidv4(),
      createdAt: now,
      updatedAt: now,
      isActive: menuItem.isActive !== undefined ? menuItem.isActive : true,
      isAiGenerated:
        menuItem.isAiGenerated !== undefined ? menuItem.isAiGenerated : false,
    };

    return super.create(newMenuItem);
  }

  /**
   * Update a menu item
   * @param itemId The ID of the menu item
   * @param updates The updates to apply
   * @returns The updated menu item
   */
  async update(itemId: string, updates: Partial<MenuItem>): Promise<MenuItem> {
    // Add updatedAt timestamp to updates
    const updatesWithTimestamp = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return super.update(itemId, updatesWithTimestamp);
  }

  /**
   * Get menu items by restaurant ID
   * @param restaurantId The ID of the restaurant
   * @param category Optional category filter
   * @returns Array of menu items for the restaurant
   */
  async getByRestaurantId(
    restaurantId: string,
    category?: string
  ): Promise<MenuItem[]> {
    const params: any = {
      TableName: this.tableName,
      IndexName: IndexNames.RESTAURANT_ID,
      KeyConditionExpression: "restaurantId = :restaurantId",
      ExpressionAttributeValues: {
        ":restaurantId": restaurantId,
      },
    };

    // Add category filter if provided
    if (category) {
      params.FilterExpression = "category = :category";
      params.ExpressionAttributeValues[":category"] = category;
    }

    const result = await this.docClient.query(params).promise();
    return (result.Items || []) as MenuItem[];
  }

  /**
   * Get active menu items by restaurant ID
   * @param restaurantId The ID of the restaurant
   * @param category Optional category filter
   * @returns Array of active menu items for the restaurant
   */
  async getActiveByRestaurantId(
    restaurantId: string,
    category?: string
  ): Promise<MenuItem[]> {
    const params: any = {
      TableName: this.tableName,
      IndexName: IndexNames.RESTAURANT_ID,
      KeyConditionExpression: "restaurantId = :restaurantId",
      FilterExpression: "isActive = :isActive",
      ExpressionAttributeValues: {
        ":restaurantId": restaurantId,
        ":isActive": true,
      },
    };

    // Add category filter if provided
    if (category) {
      params.FilterExpression += " AND category = :category";
      params.ExpressionAttributeValues[":category"] = category;
    }

    const result = await this.docClient.query(params).promise();
    return (result.Items || []) as MenuItem[];
  }

  /**
   * List menu items with optional filtering
   * @param filters Optional filters to apply
   * @returns Array of menu items matching the filters
   */
  async list(filters?: Record<string, any>): Promise<MenuItem[]> {
    // If restaurantId is provided, use query with GSI
    if (filters && filters.restaurantId) {
      return this.getByRestaurantId(filters.restaurantId, filters.category);
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
    return (result.Items || []) as MenuItem[];
  }

  /**
   * Batch create menu items
   * @param menuItems Array of menu items to create
   * @returns Array of created menu items
   */
  async batchCreate(
    menuItems: Omit<MenuItem, "itemId" | "createdAt" | "updatedAt">[]
  ): Promise<MenuItem[]> {
    const now = new Date().toISOString();
    const createdItems: MenuItem[] = [];

    // Process in batches of 25 (DynamoDB batch write limit)
    for (let i = 0; i < menuItems.length; i += 25) {
      const batch = menuItems.slice(i, i + 25);

      const newItems = batch.map((item) => {
        const newItem: MenuItem = {
          ...item,
          itemId: uuidv4(),
          createdAt: now,
          updatedAt: now,
          isActive: item.isActive !== undefined ? item.isActive : true,
          isAiGenerated:
            item.isAiGenerated !== undefined ? item.isAiGenerated : false,
        };
        createdItems.push(newItem);
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

    return createdItems;
  }

  /**
   * Update menu item taste profile
   * @param itemId The ID of the menu item
   * @param tasteProfile The taste profile data from Qloo API
   * @returns The updated menu item
   */
  async updateTasteProfile(
    itemId: string,
    tasteProfile: any
  ): Promise<MenuItem> {
    const params = {
      TableName: this.tableName,
      Key: {
        itemId,
      },
      UpdateExpression:
        "SET qlooTasteProfile = :tasteProfile, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":tasteProfile": tasteProfile,
        ":updatedAt": new Date().toISOString(),
      },
      ReturnValues: "ALL_NEW",
    };

    const result = await this.docClient.update(params).promise();
    return result.Attributes as MenuItem;
  }

  /**
   * Update menu item enhanced description
   * @param itemId The ID of the menu item
   * @param enhancedDescription The LLM-generated enhanced description
   * @param options Additional options for the enhancement
   * @returns The updated menu item
   */
  async updateEnhancedDescription(
    itemId: string,
    enhancedDescription: string,
    options?: {
      enhancementStyle?: string;
      targetAudience?: string;
      llmProvider?: string;
    }
  ): Promise<MenuItem> {
    const now = new Date().toISOString();

    // Get the current menu item to access its history
    const currentItem = await this.getById(itemId);
    if (!currentItem) {
      throw new Error(`Menu item with ID ${itemId} not found`);
    }

    // Create a new version for the history
    const newVersion = {
      description: enhancedDescription,
      createdAt: now,
      enhancementStyle: options?.enhancementStyle,
      targetAudience: options?.targetAudience,
      llmProvider: options?.llmProvider,
    };

    // Initialize or update the history array
    const history = currentItem.enhancedDescriptionHistory || [];
    history.push(newVersion);

    const params = {
      TableName: this.tableName,
      Key: {
        itemId,
      },
      UpdateExpression:
        "SET enhancedDescription = :enhancedDescription, enhancedDescriptionStatus = :status, enhancedDescriptionHistory = :history, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":enhancedDescription": enhancedDescription,
        ":status": "pending",
        ":history": history,
        ":updatedAt": now,
      },
      ReturnValues: "ALL_NEW",
    };

    const result = await this.docClient.update(params).promise();
    return result.Attributes as MenuItem;
  }

  /**
   * Update the approval status of an enhanced description
   * @param itemId The ID of the menu item
   * @param status The approval status (approved or rejected)
   * @param feedback Optional feedback about the decision
   * @returns The updated menu item
   */
  async updateEnhancedDescriptionStatus(
    itemId: string,
    status: "approved" | "rejected",
    feedback?: string
  ): Promise<MenuItem> {
    const params = {
      TableName: this.tableName,
      Key: {
        itemId,
      },
      UpdateExpression:
        "SET enhancedDescriptionStatus = :status, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":status": status,
        ":updatedAt": new Date().toISOString(),
      },
      ReturnValues: "ALL_NEW",
    };

    const result = await this.docClient.update(params).promise();
    return result.Attributes as MenuItem;
  }

  /**
   * Get menu items with pending enhanced descriptions
   * @param restaurantId The ID of the restaurant
   * @returns Array of menu items with pending enhanced descriptions
   */
  async getPendingEnhancedDescriptions(
    restaurantId: string
  ): Promise<MenuItem[]> {
    const params = {
      TableName: this.tableName,
      IndexName: IndexNames.RESTAURANT_ID,
      KeyConditionExpression: "restaurantId = :restaurantId",
      FilterExpression: "enhancedDescriptionStatus = :status",
      ExpressionAttributeValues: {
        ":restaurantId": restaurantId,
        ":status": "pending",
      },
    };

    const result = await this.docClient.query(params).promise();
    return (result.Items || []) as MenuItem[];
  }
}
