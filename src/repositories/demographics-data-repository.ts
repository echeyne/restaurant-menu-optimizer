/**
 * Demographics Data repository for data access to the DemographicsData table
 */

import { AbstractRepository } from "./abstract-repository";
import { DemographicsData, TableNames, IndexNames } from "../models/database";

export class DemographicsDataRepository extends AbstractRepository<DemographicsData> {
  /**
   * Constructor for the demographics data repository
   */
  constructor() {
    super(TableNames.DEMOGRAPHICS_DATA, "restaurantId");
  }

  /**
   * Create or update demographics data
   * @param data The demographics data to create or update
   * @returns The created/updated demographics data
   */
  async createOrUpdate(data: DemographicsData): Promise<DemographicsData> {
    const dataWithTimestamp = {
      ...data,
      retrievedAt: new Date().toISOString(),
    };

    return super.create(dataWithTimestamp);
  }

  /**
   * Get demographics data by Qloo entity ID
   * @param qlooEntityId The Qloo entity ID
   * @returns The demographics data if found, null otherwise
   */
  async getByQlooEntityId(
    qlooEntityId: string
  ): Promise<DemographicsData | null> {
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

    return result.Items[0] as DemographicsData;
  }

  /**
   * Get age groups for a restaurant
   * @param restaurantId The restaurant ID
   * @returns Array of age group data
   */
  async getAgeGroups(restaurantId: string): Promise<any[]> {
    const data = await this.getById(restaurantId);
    return data?.ageGroups || [];
  }

  /**
   * Get interests for a restaurant
   * @param restaurantId The restaurant ID
   * @returns Array of interests
   */
  async getInterests(restaurantId: string): Promise<string[]> {
    const data = await this.getById(restaurantId);
    return data?.interests || [];
  }

  /**
   * Get dining patterns for a restaurant
   * @param restaurantId The restaurant ID
   * @returns Array of dining patterns
   */
  async getDiningPatterns(restaurantId: string): Promise<any[]> {
    const data = await this.getById(restaurantId);
    return data?.diningPatterns || [];
  }

  /**
   * Update demographics data for optimization purposes
   * @param restaurantId The restaurant ID
   * @param updates Partial demographics data to update
   * @returns The updated demographics data
   */
  async updateDemographics(
    restaurantId: string,
    updates: Partial<Omit<DemographicsData, "restaurantId" | "retrievedAt">>
  ): Promise<DemographicsData> {
    const updateExpressions: string[] = [];
    const expressionAttributeValues: Record<string, any> = {};

    Object.entries(updates).forEach(([key, value]) => {
      updateExpressions.push(`${key} = :${key}`);
      expressionAttributeValues[`:${key}`] = value;
    });

    updateExpressions.push("retrievedAt = :retrievedAt");
    expressionAttributeValues[":retrievedAt"] = new Date().toISOString();

    const params = {
      TableName: this.tableName,
      Key: {
        restaurantId,
      },
      UpdateExpression: "SET " + updateExpressions.join(", "),
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW",
    };

    const result = await this.docClient.update(params).promise();
    return result.Attributes as DemographicsData;
  }

  /**
   * List demographics data with optional filtering
   * @param filters Optional filters to apply
   * @returns Array of demographics data matching the filters
   */
  async list(filters?: Record<string, any>): Promise<DemographicsData[]> {
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
    return (result.Items || []) as DemographicsData[];
  }
}
