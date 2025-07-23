/**
 * Tests for the get-dashboard-data handler
 */

import { APIGatewayProxyEvent, Context } from "aws-lambda";
import { handler } from "./get-dashboard-data";

// Mock the AnalyticsService
jest.mock("../../services/analytics-service");

import { AnalyticsService } from "../../services/analytics-service";

const mockAnalyticsService = {
  getDashboardData: jest.fn(),
};

(AnalyticsService as jest.Mock).mockImplementation(() => mockAnalyticsService);

describe("get-dashboard-data handler", () => {
  let mockEvent: APIGatewayProxyEvent;
  let mockContext: Context;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Reset the mock implementation
    (AnalyticsService as jest.Mock).mockImplementation(
      () => mockAnalyticsService
    );

    // Create mock event
    mockEvent = {
      queryStringParameters: {
        restaurantId: "restaurant-123",
      },
      headers: {},
      body: null,
      isBase64Encoded: false,
    } as unknown as APIGatewayProxyEvent;

    // Create mock context
    mockContext = {
      awsRequestId: "test-request-id",
    } as unknown as Context;
  });

  describe("successful requests", () => {
    it("should return dashboard data for valid restaurant ID", async () => {
      // Arrange
      const mockDashboardData = {
        totalMenuItems: 25,
        averagePopularityScore: 75.5,
        averageProfitabilityScore: 68.2,
        averageRecommendationScore: 82.1,
        topPerformingItems: [
          { itemId: "item-1", name: "Grilled Salmon" },
          { itemId: "item-2", name: "Caesar Salad" },
        ],
        lowPerformingItems: [{ itemId: "item-3", name: "Old Pasta" }],
        recentTrends: [],
        categoryBreakdown: [],
        monthlyTrends: [],
      };

      mockAnalyticsService.getDashboardData.mockResolvedValue(
        mockDashboardData
      );

      // Act
      const result = await handler(mockEvent, mockContext);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(mockAnalyticsService.getDashboardData).toHaveBeenCalledWith(
        "restaurant-123",
        undefined
      );

      const responseBody = JSON.parse(result.body);
      expect(responseBody.totalMenuItems).toBe(25);
      expect(responseBody.averagePopularityScore).toBe(75.5);
      expect(responseBody.pagination).toBeDefined();
      expect(responseBody.pagination.page).toBe(1);
      expect(responseBody.pagination.limit).toBe(50);
    });
  });

  describe("error handling", () => {
    it("should return 400 for missing restaurant ID", async () => {
      // Arrange
      mockEvent.queryStringParameters = {};

      // Act
      const result = await handler(mockEvent, mockContext);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(mockAnalyticsService.getDashboardData).not.toHaveBeenCalled();

      const responseBody = JSON.parse(result.body);
      expect(responseBody.error).toBe(
        "Missing required parameter: restaurantId"
      );
    });

    it("should return 400 for invalid pagination parameters", async () => {
      // Arrange
      mockEvent.queryStringParameters = {
        restaurantId: "restaurant-123",
        page: "0",
        limit: "150",
      };

      // Act
      const result = await handler(mockEvent, mockContext);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(mockAnalyticsService.getDashboardData).not.toHaveBeenCalled();

      const responseBody = JSON.parse(result.body);
      expect(responseBody.error).toContain("Invalid pagination parameters");
    });

    it("should return 500 for service errors", async () => {
      // Arrange
      mockAnalyticsService.getDashboardData.mockRejectedValue(
        new Error("Database connection failed")
      );

      // Act
      const result = await handler(mockEvent, mockContext);

      // Assert
      expect(result.statusCode).toBe(500);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.error).toBe("Internal server error");
      expect(responseBody.message).toBe("Database connection failed");
    });
  });

  describe("CORS headers", () => {
    it("should include CORS headers in responses", async () => {
      // Arrange
      mockEvent.queryStringParameters = {};

      // Act
      const result = await handler(mockEvent, mockContext);

      // Assert
      expect(result.headers).toEqual({
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
      });
    });
  });
});
