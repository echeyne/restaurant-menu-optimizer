/**
 * Repository for taste profile visualization data
 * Handles storage and retrieval of visualization data for taste profiles
 */

import { AbstractRepository } from "./abstract-repository";
import { v4 as uuidv4 } from "uuid";
import {
  TasteProfileVisualizationData,
  TasteProfileComparison,
  TasteProfileSummary,
} from "../services/taste-profile-visualization-service";

/**
 * Table name for taste profile visualization data
 */
const TABLE_NAME = process.env.STAGE + "-taste-profile-visualizations";

/**
 * Visualization data record stored in the database
 */
interface TasteProfileVisualizationRecord {
  visualizationId: string; // PK
  itemId: string; // GSI
  restaurantId: string; // GSI
  visualizationData: TasteProfileVisualizationData;
  createdAt: string;
  updatedAt: string;
}

/**
 * Comparison record stored in the database
 */
interface TasteProfileComparisonRecord {
  comparisonId: string; // PK
  item1Id: string; // GSI
  item2Id: string; // GSI
  restaurantId: string; // GSI
  comparisonData: TasteProfileComparison;
  createdAt: string;
  updatedAt: string;
}

/**
 * Repository for taste profile visualization data
 */
export class TasteProfileVisualizationRepository extends AbstractRepository<TasteProfileVisualizationRecord> {
  /**
   * Constructor for the taste profile visualization repository
   */
  constructor() {
    super(TABLE_NAME, "visualizationId");
  }

  /**
   * Save visualization data for a menu item
   *
   * @param visualizationData Visualization data to save
   * @returns Saved visualization record
   */
  async saveVisualizationData(
    visualizationData: TasteProfileVisualizationData
  ): Promise<TasteProfileVisualizationRecord> {
    const now = new Date().toISOString();

    const record: TasteProfileVisualizationRecord = {
      visualizationId: uuidv4(),
      itemId: visualizationData.itemId,
      restaurantId: visualizationData.restaurantId,
      visualizationData,
      createdAt: now,
      updatedAt: now,
    };

    return super.create(record);
  }

  /**
   * Get visualization data for a menu item
   *
   * @param itemId Menu item ID
   * @returns Visualization data record or null if not found
   */
  async getByItemId(
    itemId: string
  ): Promise<TasteProfileVisualizationRecord | null> {
    const params = {
      TableName: this.tableName,
      IndexName: "itemId-index",
      KeyConditionExpression: "itemId = :itemId",
      ExpressionAttributeValues: {
        ":itemId": itemId,
      },
      Limit: 1, // Get the most recent one
      ScanIndexForward: false, // Sort by sort key in descending order (newest first)
    };

    const result = await this.docClient.query(params).promise();

    if (result.Items && result.Items.length > 0) {
      return result.Items[0] as TasteProfileVisualizationRecord;
    }

    return null;
  }

  /**
   * Get all visualization data for a restaurant
   *
   * @param restaurantId Restaurant ID
   * @returns Array of visualization data records
   */
  async getByRestaurantId(
    restaurantId: string
  ): Promise<TasteProfileVisualizationRecord[]> {
    const params = {
      TableName: this.tableName,
      IndexName: "restaurantId-index",
      KeyConditionExpression: "restaurantId = :restaurantId",
      ExpressionAttributeValues: {
        ":restaurantId": restaurantId,
      },
    };

    const result = await this.docClient.query(params).promise();
    return (result.Items || []) as TasteProfileVisualizationRecord[];
  }

  /**
   * Save a taste profile comparison
   *
   * @param comparisonData Comparison data to save
   * @returns Saved comparison record
   */
  async saveComparison(
    comparisonData: TasteProfileComparison,
    restaurantId: string
  ): Promise<TasteProfileComparisonRecord> {
    const now = new Date().toISOString();

    const record: TasteProfileComparisonRecord = {
      comparisonId: uuidv4(),
      item1Id: comparisonData.item1Id,
      item2Id: comparisonData.item2Id,
      restaurantId,
      comparisonData,
      createdAt: now,
      updatedAt: now,
    };

    const params = {
      TableName: TABLE_NAME.replace("visualizations", "comparisons"),
      Item: record,
    };

    await this.docClient.put(params).promise();
    return record;
  }

  /**
   * Get comparison data for two menu items
   *
   * @param item1Id First menu item ID
   * @param item2Id Second menu item ID
   * @returns Comparison data record or null if not found
   */
  async getComparison(
    item1Id: string,
    item2Id: string
  ): Promise<TasteProfileComparisonRecord | null> {
    // Try both item order combinations
    const params1 = {
      TableName: TABLE_NAME.replace("visualizations", "comparisons"),
      IndexName: "item-pair-index",
      KeyConditionExpression: "item1Id = :item1Id AND item2Id = :item2Id",
      ExpressionAttributeValues: {
        ":item1Id": item1Id,
        ":item2Id": item2Id,
      },
      Limit: 1,
    };

    const params2 = {
      TableName: TABLE_NAME.replace("visualizations", "comparisons"),
      IndexName: "item-pair-index",
      KeyConditionExpression: "item1Id = :item1Id AND item2Id = :item2Id",
      ExpressionAttributeValues: {
        ":item1Id": item2Id,
        ":item2Id": item1Id,
      },
      Limit: 1,
    };

    const result1 = await this.docClient.query(params1).promise();

    if (result1.Items && result1.Items.length > 0) {
      return result1.Items[0] as TasteProfileComparisonRecord;
    }

    const result2 = await this.docClient.query(params2).promise();

    if (result2.Items && result2.Items.length > 0) {
      return result2.Items[0] as TasteProfileComparisonRecord;
    }

    return null;
  }

  /**
   * Get all comparisons for a restaurant
   *
   * @param restaurantId Restaurant ID
   * @returns Array of comparison records
   */
  async getComparisonsByRestaurantId(
    restaurantId: string
  ): Promise<TasteProfileComparisonRecord[]> {
    const params = {
      TableName: TABLE_NAME.replace("visualizations", "comparisons"),
      IndexName: "restaurantId-index",
      KeyConditionExpression: "restaurantId = :restaurantId",
      ExpressionAttributeValues: {
        ":restaurantId": restaurantId,
      },
    };

    const result = await this.docClient.query(params).promise();
    return (result.Items || []) as TasteProfileComparisonRecord[];
  }

  /**
   * List visualization records with optional filtering
   * @param filters Optional filters (restaurantId, itemId)
   * @returns Array of visualization records
   */
  async list(
    filters?: Record<string, any>
  ): Promise<TasteProfileVisualizationRecord[]> {
    let params: any = {
      TableName: this.tableName,
    };

    if (filters?.restaurantId) {
      params.IndexName = "restaurantId-index";
      params.KeyConditionExpression = "restaurantId = :restaurantId";
      params.ExpressionAttributeValues = {
        ":restaurantId": filters.restaurantId,
      };
      const result = await this.docClient.query(params).promise();
      return (result.Items || []) as TasteProfileVisualizationRecord[];
    }

    if (filters?.itemId) {
      params.IndexName = "itemId-index";
      params.KeyConditionExpression = "itemId = :itemId";
      params.ExpressionAttributeValues = { ":itemId": filters.itemId };
      const result = await this.docClient.query(params).promise();
      return (result.Items || []) as TasteProfileVisualizationRecord[];
    }

    // No filters: scan all
    const result = await this.docClient.scan(params).promise();
    return (result.Items || []) as TasteProfileVisualizationRecord[];
  }
}
