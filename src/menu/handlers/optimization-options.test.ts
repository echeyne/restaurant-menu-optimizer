/**
 * Unit tests for optimization-options handler
 */

import { handler } from "./optimization-options";
import { MenuItemRepository } from "../../repositories/menu-item-repository";
import { DemographicsDataRepository } from "../../repositories/demographics-data-repository";
import { SimilarRestaurantDataRepository } from "../../repositories/similar-restaurant-data-repository";
import {
  MenuItem,
  DemographicsData,
  SimilarRestaurantData,
} from "../../models/database";
import { APIGatewayProxyEvent } from "aws-lambda";

// Mock the repositories
jest.mock("../../repositories/menu-item-repository");
jest.mock("../../repositories/demographics-data-repository");
jest.mock("../../repositories/similar-restaurant-data-repository");

describe("optimization-options handler", () => {
  let mockMenuItemRepository: jest.Mocked<MenuItemRepository>;
  let mockDemographicsRepository: jest.Mocked<DemographicsDataRepository>;
  let mockSimilarRestaurantRepository: jest.Mocked<SimilarRestaurantDataRepository>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock implementations
    mockMenuItemRepository = {
      list: jest.fn(),
    } as unknown as jest.Mocked<MenuItemRepository>;

    mockDemographicsRepository = {
      getById: jest.fn(),
    } as unknown as jest.Mocked<DemographicsDataRepository>;

    mockSimilarRestaurantRepository = {
      getById: jest.fn(),
    } as unknown as jest.Mocked<SimilarRestaurantDataRepository>;

    // Mock the constructors
    (MenuItemRepository as jest.Mock).mockImplementation(
      () => mockMenuItemRepository
    );
    (DemographicsDataRepository as jest.Mock).mockImplementation(
      () => mockDemographicsRepository
    );
    (SimilarRestaurantDataRepository as jest.Mock).mockImplementation(
      () => mockSimilarRestaurantRepository
    );
  });

  describe("successful optimization options retrieval", () => {
    it("should return both optimization options when all data is available", async () => {
      // Arrange
      const restaurantId = "test-restaurant-id";
      const menuItems: MenuItem[] = [
        {
          itemId: "item-1",
          restaurantId,
          name: "Test Item",
          description: "Test description",
          price: 12.99,
          category: "Appetizers",
          ingredients: ["ingredient1"],
          dietaryTags: ["vegetarian"],
          isActive: true,
          isAiGenerated: false,
          createdAt: "2023-01-01T00:00:00Z",
          updatedAt: "2023-01-01T00:00:00Z",
        },
      ];

      const demographicsData: DemographicsData = {
        restaurantId,
        qlooEntityId: "qloo-entity-123",
        ageGroups: [
          {
            ageRange: "25-34",
            percentage: 40,
            preferences: ["healthy", "organic"],
          },
        ],
        interests: ["food", "dining"],
        diningPatterns: [
          {
            pattern: "casual dining",
            frequency: 3,
            timeOfDay: ["lunch", "dinner"],
          },
        ],
        retrievedAt: "2023-01-01T00:00:00Z",
      };

      const similarRestaurantData: SimilarRestaurantData = {
        restaurantId,
        qlooEntityId: "qloo-entity-123",
        similarRestaurants: [],
        specialtyDishes: [
          {
            dishName: "Specialty Pasta",
            tagId: "urn:tag:specialty_dish:place:pasta",
            restaurantCount: 5,
            popularity: 0.8,
          },
          {
            dishName: "Gourmet Burger",
            tagId: "urn:tag:specialty_dish:place:burger",
            restaurantCount: 3,
            popularity: 0.7,
          },
        ],
        minRatingFilter: 4.0,
        retrievedAt: "2023-01-01T00:00:00Z",
      };

      mockMenuItemRepository.list.mockResolvedValue(menuItems);
      mockDemographicsRepository.getById.mockResolvedValue(demographicsData);
      mockSimilarRestaurantRepository.getById.mockResolvedValue(
        similarRestaurantData
      );

      const event = {
        queryStringParameters: {
          restaurantId,
        },
      } as unknown as APIGatewayProxyEvent;

      // Act
      const result = await handler(event);
      const body = JSON.parse(result.body);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(body.restaurantId).toBe(restaurantId);
      expect(body.optimizationOptions).toHaveLength(2);

      // Check first option (optimize existing)
      const optimizeExistingOption = body.optimizationOptions.find(
        (opt: any) => opt.id === "optimize-existing"
      );
      expect(optimizeExistingOption).toBeDefined();
      expect(optimizeExistingOption.available).toBe(true);
      expect(optimizeExistingOption.title).toBe("Optimize Existing Menu Items");

      // Check second option (suggest new items)
      const suggestNewOption = body.optimizationOptions.find(
        (opt: any) => opt.id === "suggest-new-items"
      );
      expect(suggestNewOption).toBeDefined();
      expect(suggestNewOption.available).toBe(true);
      expect(suggestNewOption.title).toBe("Suggest New Menu Items");

      // Check readiness information
      expect(body.readiness.menuItemCount).toBe(1);
      expect(body.readiness.specialtyDishCount).toBe(2);
      expect(body.readiness.hasAllRequiredData).toBe(true);
    });
  });

  describe("validation", () => {
    it("should return 400 if restaurantId is not provided", async () => {
      // Arrange
      const event = {
        queryStringParameters: null,
      } as unknown as APIGatewayProxyEvent;

      // Act
      const result = await handler(event);
      const body = JSON.parse(result.body);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(body.message).toContain(
        "Missing required parameter: restaurantId"
      );
    });

    it("should return options with unavailable status when menu items are missing", async () => {
      // Arrange
      const restaurantId = "test-restaurant-id";

      mockMenuItemRepository.list.mockResolvedValue([]);
      mockDemographicsRepository.getById.mockResolvedValue({
        restaurantId,
        qlooEntityId: "qloo-entity-123",
        ageGroups: [],
        interests: [],
        diningPatterns: [],
        retrievedAt: "2023-01-01T00:00:00Z",
      });
      mockSimilarRestaurantRepository.getById.mockResolvedValue({
        restaurantId,
        qlooEntityId: "qloo-entity-123",
        similarRestaurants: [],
        specialtyDishes: [],
        minRatingFilter: 4.0,
        retrievedAt: "2023-01-01T00:00:00Z",
      });

      const event = {
        queryStringParameters: {
          restaurantId,
        },
      } as unknown as APIGatewayProxyEvent;

      // Act
      const result = await handler(event);
      const body = JSON.parse(result.body);

      // Assert
      expect(result.statusCode).toBe(200);
      const optimizeExistingOption = body.optimizationOptions.find(
        (opt: any) => opt.id === "optimize-existing"
      );
      expect(optimizeExistingOption.available).toBe(false);
      expect(optimizeExistingOption.reason).toContain("No menu items found");
    });
  });
});
