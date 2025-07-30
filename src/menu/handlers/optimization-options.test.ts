/**
 * Unit tests for optimization-options handler
 */

import { handler } from "./optimization-options";
import { MenuItemRepository } from "../../repositories/menu-item-repository";
import { DemographicsDataRepository } from "../../repositories/demographics-data-repository";
import { SimilarRestaurantDataRepository } from "../../repositories/similar-restaurant-data-repository";
import { RestaurantRepository } from "../../repositories/restaurant-repository";
import {
  MenuItem,
  DemographicsData,
  SimilarRestaurantData,
  Restaurant,
} from "../../models/database";
import { APIGatewayProxyEvent } from "aws-lambda";

// Mock the repositories
jest.mock("../../repositories/menu-item-repository");
jest.mock("../../repositories/demographics-data-repository");
jest.mock("../../repositories/similar-restaurant-data-repository");
jest.mock("../../repositories/restaurant-repository");

// Mock the auth utils
jest.mock("../../utils/auth-utils", () => ({
  getUserIdFromToken: jest.fn().mockResolvedValue("test-user-id"),
}));

describe("optimization-options handler", () => {
  let mockMenuItemRepository: jest.Mocked<MenuItemRepository>;
  let mockDemographicsRepository: jest.Mocked<DemographicsDataRepository>;
  let mockSimilarRestaurantRepository: jest.Mocked<SimilarRestaurantDataRepository>;
  let mockRestaurantRepository: jest.Mocked<RestaurantRepository>;

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

    mockRestaurantRepository = {
      getById: jest.fn(),
    } as unknown as jest.Mocked<RestaurantRepository>;

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
    (RestaurantRepository as jest.Mock).mockImplementation(
      () => mockRestaurantRepository
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
        genders: [
          {
            gender: "female",
            percentage: 60,
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
        similarRestaurants: [
          {
            name: "Test Restaurant 1",
            entityId: "test-entity-123",
            address: "123 Test St",
            businessRating: 4.5,
            priceLevel: 2,
            popularity: 0.8,
            specialtyDishes: [
              {
                dishName: "Specialty Pasta",
                tagId: "urn:tag:specialty_dish:place:pasta",
                restaurantCount: 5,
                popularity: 0.8,
                weight: 0.9,
                totalWeight: 4.5,
              },
            ],
            keywords: [],
          },
        ],
        specialtyDishes: [
          {
            dishName: "Specialty Pasta",
            tagId: "urn:tag:specialty_dish:place:pasta",
            restaurantCount: 5,
            popularity: 0.8,
            weight: 0.9,
            totalWeight: 4.5,
          },
          {
            dishName: "Gourmet Burger",
            tagId: "urn:tag:specialty_dish:place:burger",
            restaurantCount: 3,
            popularity: 0.7,
            weight: 0.8,
            totalWeight: 2.4,
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

      // Mock restaurant data
      const restaurantData: Restaurant = {
        restaurantId,
        ownerId: "test-owner-id",
        name: "Test Restaurant",
        city: "Test City",
        state: "Test State",
        entityId: "test-entity-id",
        cuisine: "Italian",
        popularity: 0.8,
        description: "A test restaurant",
        specialtyDishes: [],
        businessRating: 4.5,
        createdAt: "2023-01-01T00:00:00Z",
        profileSetupComplete: true,
      };
      mockRestaurantRepository.getById.mockResolvedValue(restaurantData);

      const event = {
        httpMethod: "GET",
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

      // Check demographic information is included
      expect(body.demographicInformation).toBeDefined();
      expect(body.demographicInformation.ageGroups).toHaveLength(1);
      expect(body.demographicInformation.genderGroups).toHaveLength(1);
      expect(body.demographicInformation.interpretation).toBeDefined();

      // Check specialty dishes are included
      expect(body.specialtyDishes).toBeDefined();
      expect(body.specialtyDishes).toHaveLength(2);
      expect(body.specialtyDishes[0].interpretation).toBeDefined();
    });
  });

  describe("validation", () => {
    it("should return 400 if restaurantId is not provided", async () => {
      // Arrange
      const event = {
        httpMethod: "GET",
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
        genders: [],
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
        httpMethod: "GET",
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

  describe("optimization selection handling", () => {
    it("should handle optimize-existing selection with valid demographics", async () => {
      // Arrange
      const restaurantId = "test-restaurant-id";
      const selectedDemographics = {
        selectedAgeGroups: ["25-34"],
        selectedGenderGroups: ["female"],
      };

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
        genders: [
          {
            gender: "female",
            percentage: 60,
            preferences: ["healthy", "organic"],
          },
        ],
        interests: ["food", "dining"],
        diningPatterns: [],
        retrievedAt: "2023-01-01T00:00:00Z",
      };

      mockMenuItemRepository.list.mockResolvedValue(menuItems);
      mockDemographicsRepository.getById.mockResolvedValue(demographicsData);
      mockSimilarRestaurantRepository.getById.mockResolvedValue({
        restaurantId,
        qlooEntityId: "qloo-entity-123",
        similarRestaurants: [],
        specialtyDishes: [],
        minRatingFilter: 4.0,
        retrievedAt: "2023-01-01T00:00:00Z",
      });

      const event = {
        httpMethod: "POST",
        body: JSON.stringify({
          restaurantId,
          selectedOption: "optimize-existing",
          selectedDemographics,
        }),
      } as unknown as APIGatewayProxyEvent;

      // Act
      const result = await handler(event);
      const body = JSON.parse(result.body);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(body.success).toBe(true);
      expect(body.selectedOption).toBe("optimize-existing");
      expect(body.nextEndpoint).toBe("/menu/optimize-existing-items");
      expect(body.nextAction).toBe("optimize_existing_items");
      expect(body.requiredData.selectedDemographics).toEqual(
        selectedDemographics
      );
    });

    it("should handle suggest-new-items selection with valid specialty dishes", async () => {
      // Arrange
      const restaurantId = "test-restaurant-id";
      const selectedSpecialtyDishes = [
        {
          dishName: "Specialty Pasta",
          tagId: "urn:tag:specialty_dish:place:pasta",
          popularity: 0.8,
        },
      ];

      const similarRestaurantData: SimilarRestaurantData = {
        restaurantId,
        qlooEntityId: "qloo-entity-123",
        similarRestaurants: [
          {
            name: "Test Restaurant 1",
            entityId: "test-entity-123",
            address: "123 Test St",
            businessRating: 4.5,
            priceLevel: 2,
            popularity: 0.8,
            specialtyDishes: [
              {
                dishName: "Specialty Pasta",
                tagId: "urn:tag:specialty_dish:place:pasta",
                restaurantCount: 5,
                popularity: 0.8,
                weight: 0.9,
                totalWeight: 4.5,
              },
            ],
            keywords: [],
          },
        ],
        specialtyDishes: [
          {
            dishName: "Specialty Pasta",
            tagId: "urn:tag:specialty_dish:place:pasta",
            restaurantCount: 5,
            popularity: 0.8,
            weight: 0.9,
            totalWeight: 4.5,
          },
        ],
        minRatingFilter: 4.0,
        retrievedAt: "2023-01-01T00:00:00Z",
      };

      mockMenuItemRepository.list.mockResolvedValue([]);
      mockDemographicsRepository.getById.mockResolvedValue(null);
      mockSimilarRestaurantRepository.getById.mockResolvedValue(
        similarRestaurantData
      );

      const event = {
        httpMethod: "POST",
        body: JSON.stringify({
          restaurantId,
          selectedOption: "suggest-new-items",
          selectedSpecialtyDishes,
        }),
      } as unknown as APIGatewayProxyEvent;

      // Act
      const result = await handler(event);
      const body = JSON.parse(result.body);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(body.success).toBe(true);
      expect(body.selectedOption).toBe("suggest-new-items");
      expect(body.nextEndpoint).toBe("/menu/suggest-new-items");
      expect(body.nextAction).toBe("suggest_new_items");
      expect(body.requiredData.selectedSpecialtyDishes).toEqual(
        selectedSpecialtyDishes
      );
    });

    it("should return 400 for invalid selectedOption", async () => {
      // Arrange
      const event = {
        httpMethod: "POST",
        body: JSON.stringify({
          restaurantId: "test-restaurant-id",
          selectedOption: "invalid-option",
        }),
      } as unknown as APIGatewayProxyEvent;

      // Act
      const result = await handler(event);
      const body = JSON.parse(result.body);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(body.message).toContain("Invalid selectedOption");
    });

    it("should return 400 when optimize-existing is selected without demographics", async () => {
      // Arrange
      const restaurantId = "test-restaurant-id";

      mockMenuItemRepository.list.mockResolvedValue([
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
      ]);
      mockDemographicsRepository.getById.mockResolvedValue({
        restaurantId,
        qlooEntityId: "qloo-entity-123",
        ageGroups: [],
        genders: [],
        interests: [],
        diningPatterns: [],
        retrievedAt: "2023-01-01T00:00:00Z",
      });

      const event = {
        httpMethod: "POST",
        body: JSON.stringify({
          restaurantId,
          selectedOption: "optimize-existing",
          // Missing selectedDemographics
        }),
      } as unknown as APIGatewayProxyEvent;

      // Act
      const result = await handler(event);
      const body = JSON.parse(result.body);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(body.message).toContain("Selected demographics are required");
    });

    it("should return 400 when suggest-new-items is selected without specialty dishes", async () => {
      // Arrange
      const restaurantId = "test-restaurant-id";

      // Mock the repositories to ensure readiness check passes
      mockMenuItemRepository.list.mockResolvedValue([]);
      mockDemographicsRepository.getById.mockResolvedValue(null);
      mockSimilarRestaurantRepository.getById.mockResolvedValue({
        restaurantId,
        qlooEntityId: "qloo-entity-123",
        similarRestaurants: [
          {
            name: "Test Restaurant 1",
            entityId: "test-entity-123",
            address: "123 Test St",
            businessRating: 4.5,
            priceLevel: 2,
            popularity: 0.8,
            specialtyDishes: [
              {
                dishName: "Specialty Pasta",
                tagId: "urn:tag:specialty_dish:place:pasta",
                restaurantCount: 5,
                popularity: 0.8,
                weight: 0.9,
                totalWeight: 4.5,
              },
            ],
            keywords: [],
          },
        ],
        specialtyDishes: [
          {
            dishName: "Specialty Pasta",
            tagId: "urn:tag:specialty_dish:place:pasta",
            restaurantCount: 5,
            popularity: 0.8,
            weight: 0.9,
            totalWeight: 4.5,
          },
        ],
        minRatingFilter: 4.0,
        retrievedAt: "2023-01-01T00:00:00Z",
      });

      // Mock restaurant data
      const restaurantData: Restaurant = {
        restaurantId,
        ownerId: "test-owner-id",
        name: "Test Restaurant",
        city: "Test City",
        state: "Test State",
        entityId: "test-entity-id",
        cuisine: "Italian",
        popularity: 0.8,
        description: "A test restaurant",
        specialtyDishes: [],
        businessRating: 4.5,
        createdAt: "2023-01-01T00:00:00Z",
        profileSetupComplete: true,
      };
      mockRestaurantRepository.getById.mockResolvedValue(restaurantData);

      const event = {
        httpMethod: "POST",
        body: JSON.stringify({
          restaurantId,
          selectedOption: "suggest-new-items",
          // Missing selectedSpecialtyDishes
        }),
      } as unknown as APIGatewayProxyEvent;

      // Act
      const result = await handler(event);
      const body = JSON.parse(result.body);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(body.message).toContain("Selected specialty dishes are required");
    });
  });
});
