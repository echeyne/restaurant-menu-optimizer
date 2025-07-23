import { handler } from "./review-optimizations";
import { OptimizedMenuItemsRepository } from "../../repositories/optimized-menu-items-repository";
import { SuggestionRepository } from "../../repositories/suggestion-repository";
import { MenuItemRepository } from "../../repositories/menu-item-repository";
import {
  OptimizedMenuItem,
  MenuItemSuggestion,
  MenuItem,
} from "../../models/database";

// Mock repositories
jest.mock("../../repositories/optimized-menu-items-repository");
jest.mock("../../repositories/suggestion-repository");
jest.mock("../../repositories/menu-item-repository");

describe("Review Optimizations Handler", () => {
  let mockOptimizedItemsRepo: jest.Mocked<OptimizedMenuItemsRepository>;
  let mockSuggestionRepo: jest.Mocked<SuggestionRepository>;
  let mockMenuItemRepo: jest.Mocked<MenuItemRepository>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup mock repositories
    mockOptimizedItemsRepo =
      new OptimizedMenuItemsRepository() as jest.Mocked<OptimizedMenuItemsRepository>;
    mockSuggestionRepo =
      new SuggestionRepository() as jest.Mocked<SuggestionRepository>;
    mockMenuItemRepo =
      new MenuItemRepository() as jest.Mocked<MenuItemRepository>;

    // Mock constructor
    (OptimizedMenuItemsRepository as jest.Mock).mockImplementation(
      () => mockOptimizedItemsRepo
    );
    (SuggestionRepository as jest.Mock).mockImplementation(
      () => mockSuggestionRepo
    );
    (MenuItemRepository as jest.Mock).mockImplementation(
      () => mockMenuItemRepo
    );
  });

  describe("GET request", () => {
    it("should return optimized menu items when type is existing_items", async () => {
      // Mock data
      const restaurantId = "restaurant123";
      const pendingItems: OptimizedMenuItem[] = [
        {
          itemId: "item1",
          restaurantId,
          originalName: "Original Dish",
          optimizedName: "Enhanced Dish",
          originalDescription: "Basic description",
          optimizedDescription: "Enhanced description with appealing details",
          optimizationReason: "Enhanced for target demographic",
          demographicInsights: ["Primary age group: 25-34"],
          status: "pending",
          createdAt: "2023-01-01T00:00:00Z",
        },
      ];
      const approvedItems: OptimizedMenuItem[] = [];
      const rejectedItems: OptimizedMenuItem[] = [];

      // Setup mocks
      mockOptimizedItemsRepo.getByRestaurantId.mockImplementation(
        (id, status) => {
          if (status === "pending") return Promise.resolve(pendingItems);
          if (status === "approved") return Promise.resolve(approvedItems);
          if (status === "rejected") return Promise.resolve(rejectedItems);
          return Promise.resolve([]);
        }
      );

      // Create mock event
      const event = {
        httpMethod: "GET",
        queryStringParameters: {
          restaurantId,
          type: "existing_items",
        },
      } as any;

      // Call handler
      const response = await handler(event);
      const body = JSON.parse(response.body);

      // Assertions
      expect(response.statusCode).toBe(200);
      expect(mockOptimizedItemsRepo.getByRestaurantId).toHaveBeenCalledTimes(3);
      expect(body.pendingItems).toEqual(pendingItems);
      expect(body.approvedItems).toEqual(approvedItems);
      expect(body.rejectedItems).toEqual(rejectedItems);
    });

    it("should return menu item suggestions when type is new_items", async () => {
      // Mock data
      const restaurantId = "restaurant123";
      const pendingItems: MenuItemSuggestion[] = [
        {
          suggestionId: "suggestion1",
          restaurantId,
          name: "New Dish Suggestion",
          description: "A delicious new dish idea",
          estimatedPrice: 15.99,
          category: "entree",
          suggestedIngredients: ["ingredient1", "ingredient2"],
          dietaryTags: ["vegetarian"],
          inspirationSource: "Similar restaurants",
          status: "pending",
          createdAt: "2023-01-01T00:00:00Z",
        },
      ];
      const approvedItems: MenuItemSuggestion[] = [];
      const rejectedItems: MenuItemSuggestion[] = [];

      // Setup mocks
      mockSuggestionRepo.getByStatus.mockImplementation((id, status) => {
        if (status === "pending") return Promise.resolve(pendingItems);
        if (status === "approved") return Promise.resolve(approvedItems);
        if (status === "rejected") return Promise.resolve(rejectedItems);
        return Promise.resolve([]);
      });

      // Create mock event
      const event = {
        httpMethod: "GET",
        queryStringParameters: {
          restaurantId,
          type: "new_items",
        },
      } as any;

      // Call handler
      const response = await handler(event);
      const body = JSON.parse(response.body);

      // Assertions
      expect(response.statusCode).toBe(200);
      expect(mockSuggestionRepo.getByStatus).toHaveBeenCalledTimes(3);
      expect(body.pendingItems).toEqual(pendingItems);
      expect(body.approvedItems).toEqual(approvedItems);
      expect(body.rejectedItems).toEqual(rejectedItems);
    });

    it("should return 400 if restaurantId is missing", async () => {
      // Create mock event
      const event = {
        httpMethod: "GET",
        queryStringParameters: {
          type: "existing_items",
        },
      } as any;

      // Call handler
      const response = await handler(event);

      // Assertions
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).message).toContain("restaurantId");
    });

    it("should return 400 if type is invalid", async () => {
      // Create mock event
      const event = {
        httpMethod: "GET",
        queryStringParameters: {
          restaurantId: "restaurant123",
          type: "invalid_type",
        },
      } as any;

      // Call handler
      const response = await handler(event);

      // Assertions
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).message).toContain("type");
    });
  });

  describe("POST request", () => {
    it("should approve an optimized menu item and update the original menu item", async () => {
      // Mock data
      const restaurantId = "restaurant123";
      const itemId = "item1";
      const optimizedItem: OptimizedMenuItem = {
        itemId,
        restaurantId,
        originalName: "Original Dish",
        optimizedName: "Enhanced Dish",
        originalDescription: "Basic description",
        optimizedDescription: "Enhanced description with appealing details",
        optimizationReason: "Enhanced for target demographic",
        demographicInsights: ["Primary age group: 25-34"],
        status: "approved", // Updated status
        createdAt: "2023-01-01T00:00:00Z",
      };

      const originalMenuItem: MenuItem = {
        itemId,
        restaurantId,
        name: "Original Dish",
        description: "Basic description",
        price: 12.99,
        category: "entree",
        ingredients: ["ingredient1", "ingredient2"],
        dietaryTags: [],
        isActive: true,
        isAiGenerated: false,
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
      };

      // Setup mocks
      mockOptimizedItemsRepo.updateStatus.mockResolvedValue(optimizedItem);
      mockMenuItemRepo.getById.mockResolvedValue(originalMenuItem);
      mockMenuItemRepo.update.mockResolvedValue({
        ...originalMenuItem,
        name: optimizedItem.optimizedName,
        description: optimizedItem.optimizedDescription,
        updatedAt: expect.any(String),
      });

      mockOptimizedItemsRepo.getByRestaurantId.mockImplementation(
        (id, status) => {
          if (status === "pending") return Promise.resolve([]);
          if (status === "approved") return Promise.resolve([optimizedItem]);
          if (status === "rejected") return Promise.resolve([]);
          return Promise.resolve([]);
        }
      );

      // Create mock event
      const event = {
        httpMethod: "POST",
        body: JSON.stringify({
          restaurantId,
          type: "existing_items",
          itemId,
          status: "approved",
        }),
      } as any;

      // Call handler
      const response = await handler(event);
      const body = JSON.parse(response.body);

      // Assertions
      expect(response.statusCode).toBe(200);
      expect(mockOptimizedItemsRepo.updateStatus).toHaveBeenCalledWith(
        itemId,
        "approved"
      );
      expect(mockMenuItemRepo.getById).toHaveBeenCalledWith(itemId);
      expect(mockMenuItemRepo.update).toHaveBeenCalled();
      expect(body.message).toContain("approved and applied");
      expect(body.updatedItem).toEqual(optimizedItem);
    });

    it("should approve a menu item suggestion and create a new menu item", async () => {
      // Mock data
      const restaurantId = "restaurant123";
      const suggestionId = "suggestion1";
      const suggestion: MenuItemSuggestion = {
        suggestionId,
        restaurantId,
        name: "New Dish Suggestion",
        description: "A delicious new dish idea",
        estimatedPrice: 15.99,
        category: "entree",
        suggestedIngredients: ["ingredient1", "ingredient2"],
        dietaryTags: ["vegetarian"],
        inspirationSource: "Similar restaurants",
        status: "approved", // Updated status
        createdAt: "2023-01-01T00:00:00Z",
      };

      const convertedMenuItem = {
        restaurantId,
        name: suggestion.name,
        description: suggestion.description,
        estimatedPrice: suggestion.estimatedPrice,
        category: suggestion.category,
        suggestedIngredients: suggestion.suggestedIngredients,
        dietaryTags: suggestion.dietaryTags,
        inspirationSource: suggestion.inspirationSource,
      };

      // Setup mocks
      mockSuggestionRepo.updateStatus.mockResolvedValue(suggestion);
      mockSuggestionRepo.convertToMenuItem.mockResolvedValue(convertedMenuItem);
      mockMenuItemRepo.create.mockResolvedValue({
        itemId: "newItem1",
        restaurantId,
        name: suggestion.name,
        description: suggestion.description,
        price: suggestion.estimatedPrice,
        category: suggestion.category,
        ingredients: suggestion.suggestedIngredients,
        dietaryTags: suggestion.dietaryTags,
        isActive: true,
        isAiGenerated: true,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });

      mockSuggestionRepo.getByStatus.mockImplementation((id, status) => {
        if (status === "pending") return Promise.resolve([]);
        if (status === "approved") return Promise.resolve([suggestion]);
        if (status === "rejected") return Promise.resolve([]);
        return Promise.resolve([]);
      });

      // Create mock event
      const event = {
        httpMethod: "POST",
        body: JSON.stringify({
          restaurantId,
          type: "new_items",
          itemId: suggestionId,
          status: "approved",
        }),
      } as any;

      // Call handler
      const response = await handler(event);
      const body = JSON.parse(response.body);

      // Assertions
      expect(response.statusCode).toBe(200);
      expect(mockSuggestionRepo.updateStatus).toHaveBeenCalledWith(
        suggestionId,
        "approved"
      );
      expect(mockSuggestionRepo.convertToMenuItem).toHaveBeenCalledWith(
        suggestionId
      );
      expect(mockMenuItemRepo.create).toHaveBeenCalled();
      expect(body.message).toContain("approved and added");
      expect(body.updatedItem).toEqual(suggestion);
    });

    it("should reject an optimized menu item", async () => {
      // Mock data
      const restaurantId = "restaurant123";
      const itemId = "item1";
      const optimizedItem: OptimizedMenuItem = {
        itemId,
        restaurantId,
        originalName: "Original Dish",
        optimizedName: "Enhanced Dish",
        originalDescription: "Basic description",
        optimizedDescription: "Enhanced description with appealing details",
        optimizationReason: "Enhanced for target demographic",
        demographicInsights: ["Primary age group: 25-34"],
        status: "rejected", // Updated status
        createdAt: "2023-01-01T00:00:00Z",
      };

      // Setup mocks
      mockOptimizedItemsRepo.updateStatus.mockResolvedValue(optimizedItem);
      mockOptimizedItemsRepo.getByRestaurantId.mockImplementation(
        (id, status) => {
          if (status === "pending") return Promise.resolve([]);
          if (status === "approved") return Promise.resolve([]);
          if (status === "rejected") return Promise.resolve([optimizedItem]);
          return Promise.resolve([]);
        }
      );

      // Create mock event
      const event = {
        httpMethod: "POST",
        body: JSON.stringify({
          restaurantId,
          type: "existing_items",
          itemId,
          status: "rejected",
          feedback: "Not aligned with our brand voice",
        }),
      } as any;

      // Call handler
      const response = await handler(event);
      const body = JSON.parse(response.body);

      // Assertions
      expect(response.statusCode).toBe(200);
      expect(mockOptimizedItemsRepo.updateStatus).toHaveBeenCalledWith(
        itemId,
        "rejected"
      );
      expect(mockMenuItemRepo.update).not.toHaveBeenCalled();
      expect(body.message).toContain("rejected");
      expect(body.updatedItem).toEqual(optimizedItem);
    });

    it("should return 400 if required fields are missing", async () => {
      // Create mock event with missing fields
      const event = {
        httpMethod: "POST",
        body: JSON.stringify({
          restaurantId: "restaurant123",
          // Missing type, itemId, and status
        }),
      } as any;

      // Call handler
      const response = await handler(event);

      // Assertions
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).message).toContain(
        "Missing required fields"
      );
    });

    it("should return 400 if status is invalid", async () => {
      // Create mock event with invalid status
      const event = {
        httpMethod: "POST",
        body: JSON.stringify({
          restaurantId: "restaurant123",
          type: "existing_items",
          itemId: "item1",
          status: "invalid_status", // Invalid status
        }),
      } as any;

      // Call handler
      const response = await handler(event);

      // Assertions
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).message).toContain("Invalid status");
    });
  });

  it("should return 405 for unsupported HTTP methods", async () => {
    // Create mock event with unsupported method
    const event = {
      httpMethod: "PUT",
      body: JSON.stringify({}),
    } as any;

    // Call handler
    const response = await handler(event);

    // Assertions
    expect(response.statusCode).toBe(405);
    expect(JSON.parse(response.body).message).toContain("Method not allowed");
  });

  it("should return 500 if an error occurs", async () => {
    // Setup mock to throw error
    mockOptimizedItemsRepo.getByRestaurantId.mockRejectedValue(
      new Error("Database error")
    );

    // Create mock event
    const event = {
      httpMethod: "GET",
      queryStringParameters: {
        restaurantId: "restaurant123",
        type: "existing_items",
      },
    } as any;

    // Call handler
    const response = await handler(event);

    // Assertions
    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body).message).toContain(
      "Error reviewing optimizations"
    );
    expect(JSON.parse(response.body).error).toContain("Database error");
  });
});
