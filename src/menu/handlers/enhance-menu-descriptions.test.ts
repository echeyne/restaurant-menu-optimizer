/**
 * Unit tests for enhance-menu-descriptions handler
 */

import { handler } from "./enhance-menu-descriptions";
import { MenuItemRepository } from "../../repositories/menu-item-repository";
import { LLMService } from "../../services/llm-service";
import { MenuItem } from "../../models/database";
import { APIGatewayProxyEvent } from "aws-lambda";

// Mock the repositories and services
jest.mock("../../repositories/menu-item-repository");
jest.mock("../../services/llm-service");

describe("enhance-menu-descriptions handler", () => {
  let mockMenuItemRepository: jest.Mocked<MenuItemRepository>;
  let mockLLMService: jest.Mocked<LLMService>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock implementations
    mockMenuItemRepository = {
      getById: jest.fn(),
      getByRestaurantId: jest.fn(),
      updateEnhancedDescription: jest.fn(),
    } as unknown as jest.Mocked<MenuItemRepository>;

    mockLLMService = {
      complete: jest.fn(),
      completeWithProvider: jest.fn(),
    } as unknown as jest.Mocked<LLMService>;

    // Mock the constructors
    (MenuItemRepository as jest.Mock).mockImplementation(
      () => mockMenuItemRepository
    );
    (LLMService as jest.Mock).mockImplementation(() => mockLLMService);
  });

  describe("single item enhancement", () => {
    it("should enhance a single menu item description", async () => {
      // Arrange
      const itemId = "test-item-id";
      const menuItem: MenuItem = {
        itemId,
        restaurantId: "test-restaurant-id",
        name: "Test Item",
        description: "Original description",
        price: 12.99,
        category: "Appetizers",
        ingredients: ["ingredient1", "ingredient2"],
        dietaryTags: ["vegetarian"],
        isActive: true,
        isAiGenerated: false,
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
      };

      const enhancedDescription = "Enhanced description with vivid language";

      mockMenuItemRepository.getById.mockResolvedValue(menuItem);
      mockLLMService.complete.mockResolvedValue({ text: enhancedDescription });
      mockMenuItemRepository.updateEnhancedDescription.mockResolvedValue({
        ...menuItem,
        enhancedDescription,
      });

      const event = {
        body: JSON.stringify({
          itemId,
        }),
      } as APIGatewayProxyEvent;

      // Act
      const result = await handler(event);
      const body = JSON.parse(result.body);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(mockMenuItemRepository.getById).toHaveBeenCalledWith(itemId);
      expect(mockLLMService.complete).toHaveBeenCalled();
      expect(
        mockMenuItemRepository.updateEnhancedDescription
      ).toHaveBeenCalledWith(itemId, enhancedDescription);
      expect(body.results[0].enhancedDescription).toBe(enhancedDescription);
      expect(body.processed).toBe(1);
      expect(body.failed).toBe(0);
    });

    it("should return 404 if menu item is not found", async () => {
      // Arrange
      const itemId = "non-existent-id";

      mockMenuItemRepository.getById.mockResolvedValue(null);

      const event = {
        body: JSON.stringify({
          itemId,
        }),
      } as APIGatewayProxyEvent;

      // Act
      const result = await handler(event);
      const body = JSON.parse(result.body);

      // Assert
      expect(result.statusCode).toBe(404);
      expect(body.message).toContain("not found");
    });

    it("should handle errors during enhancement", async () => {
      // Arrange
      const itemId = "test-item-id";
      const menuItem: MenuItem = {
        itemId,
        restaurantId: "test-restaurant-id",
        name: "Test Item",
        description: "Original description",
        price: 12.99,
        category: "Appetizers",
        ingredients: ["ingredient1", "ingredient2"],
        dietaryTags: ["vegetarian"],
        isActive: true,
        isAiGenerated: false,
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
      };

      mockMenuItemRepository.getById.mockResolvedValue(menuItem);
      mockLLMService.complete.mockRejectedValue(new Error("LLM API error"));

      const event = {
        body: JSON.stringify({
          itemId,
        }),
      } as APIGatewayProxyEvent;

      // Act
      const result = await handler(event);
      const body = JSON.parse(result.body);

      // Assert
      expect(result.statusCode).toBe(500);
      expect(body.results[0].success).toBe(false);
      expect(body.results[0].error).toBeDefined();
      expect(body.processed).toBe(0);
      expect(body.failed).toBe(1);
    });
  });

  describe("batch enhancement", () => {
    it("should enhance multiple menu items for a restaurant", async () => {
      // Arrange
      const restaurantId = "test-restaurant-id";
      const menuItems: MenuItem[] = [
        {
          itemId: "item-1",
          restaurantId,
          name: "Item 1",
          description: "Original description 1",
          price: 12.99,
          category: "Appetizers",
          ingredients: ["ingredient1", "ingredient2"],
          dietaryTags: ["vegetarian"],
          isActive: true,
          isAiGenerated: false,
          createdAt: "2023-01-01T00:00:00Z",
          updatedAt: "2023-01-01T00:00:00Z",
        },
        {
          itemId: "item-2",
          restaurantId,
          name: "Item 2",
          description: "Original description 2",
          price: 15.99,
          category: "Main Course",
          ingredients: ["ingredient3", "ingredient4"],
          dietaryTags: ["gluten-free"],
          isActive: true,
          isAiGenerated: false,
          createdAt: "2023-01-01T00:00:00Z",
          updatedAt: "2023-01-01T00:00:00Z",
        },
      ];

      mockMenuItemRepository.getByRestaurantId.mockResolvedValue(menuItems);
      mockLLMService.complete.mockResolvedValueOnce({
        text: "Enhanced description 1",
      });
      mockLLMService.complete.mockResolvedValueOnce({
        text: "Enhanced description 2",
      });

      mockMenuItemRepository.updateEnhancedDescription.mockImplementation(
        async (itemId, description) => {
          const item = menuItems.find((item) => item.itemId === itemId);
          return { ...item!, enhancedDescription: description };
        }
      );

      const event = {
        body: JSON.stringify({
          restaurantId,
          batchSize: 2,
        }),
      } as APIGatewayProxyEvent;

      // Act
      const result = await handler(event);
      const body = JSON.parse(result.body);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(mockMenuItemRepository.getByRestaurantId).toHaveBeenCalledWith(
        restaurantId
      );
      expect(mockLLMService.complete).toHaveBeenCalledTimes(2);
      expect(
        mockMenuItemRepository.updateEnhancedDescription
      ).toHaveBeenCalledTimes(2);
      expect(body.processed).toBe(2);
      expect(body.failed).toBe(0);
      expect(body.results).toHaveLength(2);
    });

    it("should filter by category when provided", async () => {
      // Arrange
      const restaurantId = "test-restaurant-id";
      const category = "Appetizers";
      const menuItems: MenuItem[] = [
        {
          itemId: "item-1",
          restaurantId,
          name: "Item 1",
          description: "Original description 1",
          price: 12.99,
          category,
          ingredients: ["ingredient1", "ingredient2"],
          dietaryTags: ["vegetarian"],
          isActive: true,
          isAiGenerated: false,
          createdAt: "2023-01-01T00:00:00Z",
          updatedAt: "2023-01-01T00:00:00Z",
        },
      ];

      mockMenuItemRepository.getByRestaurantId.mockResolvedValue(menuItems);
      mockLLMService.complete.mockResolvedValue({
        text: "Enhanced description",
      });

      mockMenuItemRepository.updateEnhancedDescription.mockImplementation(
        async (itemId, description) => {
          const item = menuItems.find((item) => item.itemId === itemId);
          return { ...item!, enhancedDescription: description };
        }
      );

      const event = {
        body: JSON.stringify({
          restaurantId,
          category,
        }),
      } as APIGatewayProxyEvent;

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(mockMenuItemRepository.getByRestaurantId).toHaveBeenCalledWith(
        restaurantId,
        category
      );
    });

    it("should return 404 if no menu items found for restaurant", async () => {
      // Arrange
      const restaurantId = "test-restaurant-id";

      mockMenuItemRepository.getByRestaurantId.mockResolvedValue([]);

      const event = {
        body: JSON.stringify({
          restaurantId,
        }),
      } as APIGatewayProxyEvent;

      // Act
      const result = await handler(event);
      const body = JSON.parse(result.body);

      // Assert
      expect(result.statusCode).toBe(404);
      expect(body.message).toContain("No menu items found");
    });
  });

  describe("validation", () => {
    it("should return 400 if neither itemId nor restaurantId is provided", async () => {
      // Arrange
      const event = {
        body: JSON.stringify({}),
      } as APIGatewayProxyEvent;

      // Act
      const result = await handler(event);
      const body = JSON.parse(result.body);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(body.message).toContain(
        "Either itemId or restaurantId must be provided"
      );
    });
  });
});
