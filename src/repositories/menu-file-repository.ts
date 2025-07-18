/**
 * Menu file repository for tracking uploaded menu files
 */

import { AbstractRepository } from "./abstract-repository";
import { v4 as uuidv4 } from "uuid";

/**
 * MenuFile interface representing a menu file uploaded to S3
 */
export interface MenuFile {
  fileId: string; // PK
  restaurantId: string; // GSI
  fileName: string;
  fileKey: string; // S3 object key
  fileType: string;
  fileSize: number;
  status: "pending" | "processed" | "failed";
  processingError?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Table name for the MenuFiles table
 */
export const MENU_FILES_TABLE = process.env.STAGE + "-menu-files";

/**
 * Repository for managing menu file metadata
 */
export class MenuFileRepository extends AbstractRepository<MenuFile> {
  /**
   * Constructor for the menu file repository
   */
  constructor() {
    super(MENU_FILES_TABLE, "fileId");
  }

  /**
   * Create a new menu file record
   * @param menuFile The menu file metadata to create
   * @returns The created menu file record
   */
  async create(
    menuFile: Omit<MenuFile, "fileId" | "createdAt" | "updatedAt" | "status">
  ): Promise<MenuFile> {
    const now = new Date().toISOString();
    const newMenuFile: MenuFile = {
      ...menuFile,
      fileId: uuidv4(),
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };

    return super.create(newMenuFile);
  }

  /**
   * Update a menu file record
   * @param fileId The ID of the menu file
   * @param updates The updates to apply
   * @returns The updated menu file record
   */
  async update(fileId: string, updates: Partial<MenuFile>): Promise<MenuFile> {
    // Add updatedAt timestamp to updates
    const updatesWithTimestamp = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return super.update(fileId, updatesWithTimestamp);
  }

  /**
   * Get menu files by restaurant ID
   * @param restaurantId The ID of the restaurant
   * @returns Array of menu files for the restaurant
   */
  async getByRestaurantId(restaurantId: string): Promise<MenuFile[]> {
    const params: any = {
      TableName: this.tableName,
      IndexName: "restaurantId-index",
      KeyConditionExpression: "restaurantId = :restaurantId",
      ExpressionAttributeValues: {
        ":restaurantId": restaurantId,
      },
    };

    const result = await this.docClient.query(params).promise();
    return (result.Items || []) as MenuFile[];
  }

  /**
   * Update menu file status
   * @param fileId The ID of the menu file
   * @param status The new status
   * @param error Optional error message if status is 'failed'
   * @returns The updated menu file record
   */
  async updateStatus(
    fileId: string,
    status: "pending" | "processed" | "failed",
    error?: string
  ): Promise<MenuFile> {
    const updates: Partial<MenuFile> = { status };

    if (error && status === "failed") {
      updates.processingError = error;
    }

    return this.update(fileId, updates);
  }

  /**
   * List menu files with optional filtering
   * @param filters Optional filters to apply
   * @returns Array of menu files matching the filters
   */
  async list(filters?: Record<string, any>): Promise<MenuFile[]> {
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
    return (result.Items || []) as MenuFile[];
  }
}
