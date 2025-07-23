/**
 * Tests for suggest-new-items Lambda function
 */

import { handler } from "./suggest-new-items";
import { SimilarRestaurantDataRepository } from "../../repositories/similar-restaurant-data-repository";
import { MenuItemRepository } from "../../repositories/menu-item-repository";
import { RestaurantRepository } from "../../repositories/restaurant-repository";
import { SuggestionRepository } from "../../repositories/suggestion-repository";
import { LLMService } from "../../services/llm-service";
import { APIGatewayProxyEvent } from "aws-lambda";

// Mock repositories and services
jest.mock("../../repositories/similar-restaurant-data-repository");
jest.mock("../../repositories/menu-item-repository");
jest.mock("../../repositories/restaurant-repository");
jest.mock("../../repositories/suggestion-repository");
jest.mock("../../services/llm-service");

describe("suggest-new-items handler", () => {
  // Mock data
  const mockRestaurant = {
    restaurantId: "restaurant-123",
    ownerId: "owner-123",
    name: "Test Restaurant",
    city: "Test City",
    state: "TS",
    qlooEntityId: "qloo-123",
    genreTags: ["urn:tag:genre:restaurant:italian"],
    priceLevel: 2,
    createdAt: "2023-01-01T00:00:00.000Z",
    profileSetupComplete: true,
  };

  const mockSimilarRestaurantData = {
    restaurantId: "restaurant-123",
    qlooEntityId: "qloo-123",
    similarRestaurants: [
      {
        name: "Similar Restaurant 1",
        entityId: "similar-1",
        address: "123 Test St",
        businessRating: 4.5,
        priceLevel: 2,
        specialtyDishes: ["Pasta Carbonara", "Tiramisu"],
        keywords: [{ name: "Italian", count: 5 }],
      },
    ],
    specialtyDishes: [
      {
        dishName: "Pasta Carbonara",
        tagId: "urn:tag:specialty_dish:place:pasta-carbonara",
        restaurantCount: 5,
        popularity: 0.8,
      },
      {
        dishName: "Tiramisu",
        tagId: "urn:tag:specialty_dish:place:tiramisu",
        restaurantCount: 4,
        popularity: 0.7,
      },
    ],
    minRatingFilter: 4,
    retrievedAt: "2023-01-01T00:00:00.000Z",
  };

  const mockMenuItems = [
    {
      itemId: "item-1",
      restaurantId: "restaurant-123",
      name: "Spaghetti Bolognese",
      description: "Classic pasta with meat sauce",
      price: 12.99,
      category: "pasta",
      ingredients: ["pasta", "beef", "tomato sauce"],
      dietaryTags: [],
      isActive: true,
      isAiGenerated: false,
      createdAt: "2023-01-01T00:00:00.000Z",
      updatedAt: "2023-01-01T00:00:00.000Z",
    },
  ];

  const mockLLMResponse = {
    text: JSON.stringify({
      suggestions: [
        {
          name: "Authentic Carbonara",
          description: "Creamy pasta with pancetta, eggs, and pecorino cheese",
          estimatedPrice: 14.99,
          category: "pasta",
          ingredients: ["pasta", "pancetta", "eggs", "pecorino"],
          dietaryTags: [],
          basedOnDish: "Pasta Carbonara",
        },
        {
          name: "Classic Tiramisu",
          description: "Coffee-soaked ladyfingers with mascarpone cream",
          estimatedPrice: 8.99,
          category: "dessert",
          ingredients: ["ladyfingers", "mascarpone", "coffee", "cocoa"],
          dietaryTags: ["vegetarian"],
          basedOnDish: "Tiramisu",
        },
      ],
    }),
  };

  const mockSavedSuggestions = [
    {
      suggestionId: "suggestion-1",
      restaurantId: "restaurant-123",
      name: "Authentic Carbonara",
      description: "Creamy pasta with pancetta, eggs, and pecorino cheese",
      estimatedPrice: 14.99,
      category: "pasta",
      suggestedIngredients: ["pasta", "pancetta", "eggs", "pecorino"],
      dietaryTags: [],
      inspirationSource: "Similar restaurants - Pasta Carbonara",
      basedOnSpecialtyDish: "Pasta Carbonara",
      status: "pending",
      createdAt: "2023-01-01T00:00:00.000Z",
    },
    {
      suggestionId: "suggestion-2",
      restaurantId: "restaurant-123",
      name: "Classic Tiramisu",
      description: "Coffee-soaked ladyfingers with mascarpone cream",
      estimatedPrice: 8.99,
      category: "dessert",
      suggestedIngredients: ["ladyfingers", "mascarpone", "coffee", "cocoa"],
      dietaryTags: ["vegetarian"],
      inspirationSource: "Similar restaurants - Tiramisu",
      basedOnSpecialtyDish: "Tiramisu",
      status: "pending",
      createdAt: "2023-01-01T00:00:00.000Z",
    },
  ];

  // Reset mocks before each test
  beforeEach(() => {
    jest.resetAllMocks();

    // Setup repository mocks
    RestaurantRepository.prototype.getById = jest
      .fn()
      .mockResolvedValue(mockRestaurant);
    SimilarRestaurantDataRepository.prototype.getById = jest
      .fn()
      .mockResolvedValue(mockSimilarRestaurantData);
    MenuItemRepository.prototype.getActiveByRestaurantId = jest
      .fn()
      .mockResolvedValue(mockMenuItems);
    SuggestionRepository.prototype.batchCreate = jest
      .fn()
      .mockResolvedValue(mockSavedSuggestions);

    // Setup LLM service mock
    LLMService.prototype.complete = jest
      .fn()
      .mockResolvedValue(mockLLMResponse);
  });

  it("should return 400 if request body is missing", async () => {
    const event = {
      body: null,
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).message).toBe("Request body is required");
  });

  it("should return 400 if restaurantId is missing", async () => {
    const event = {
      body: JSON.stringify({}),
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).message).toBe(
      "Missing required field: restaurantId"
    );
  });

  it("should return 404 if restaurant is not found", async () => {
    RestaurantRepository.prototype.getById = jest.fn().mockResolvedValue(null);

    const event = {
      body: JSON.stringify({ restaurantId: "non-existent" }),
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(event);

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body).message).toBe("Restaurant not found");
  });

  it("should return 400 if similar restaurant data is not found", async () => {
    SimilarRestaurantDataRepository.prototype.getById = jest
      .fn()
      .mockResolvedValue(null);

    const event = {
      body: JSON.stringify({ restaurantId: "restaurant-123" }),
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(event);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).message).toBe(
      "Similar restaurant data not found. Please complete restaurant profile setup first."
    );
  });

  it("should successfully generate and save menu item suggestions", async () => {
    const event = {
      body: JSON.stringify({
        restaurantId: "restaurant-123",
        maxSuggestions: 2,
        cuisineStyle: "authentic",
        priceRange: "moderate",
      }),
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(event);
    const responseBody = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(responseBody.restaurantId).toBe("restaurant-123");
    expect(responseBody.suggestions).toEqual(mockSavedSuggestions);
    expect(responseBody.totalSuggestions).toBe(2);
    expect(responseBody.basedOnSpecialtyDishes).toEqual([
      "Pasta Carbonara",
      "Tiramisu",
    ]);

    // Verify LLM service was called with appropriate parameters
    expect(LLMService.prototype.complete).toHaveBeenCalledTimes(1);
    const llmCallArgs = (LLMService.prototype.complete as jest.Mock).mock
      .calls[0][0];
    expect(llmCallArgs.prompt).toContain("Test Restaurant");
    expect(llmCallArgs.prompt).toContain("Pasta Carbonara");
    expect(llmCallArgs.prompt).toContain("Tiramisu");
    expect(llmCallArgs.prompt).toContain("Spaghetti Bolognese");
    expect(llmCallArgs.prompt).toContain("authentic");
    expect(llmCallArgs.prompt).toContain("moderate");

    // Verify suggestions were saved to the database
    expect(SuggestionRepository.prototype.batchCreate).toHaveBeenCalledTimes(1);
  });

  it("should handle LLM service errors gracefully", async () => {
    LLMService.prototype.complete = jest
      .fn()
      .mockRejectedValue(new Error("LLM service error"));

    const event = {
      body: JSON.stringify({ restaurantId: "restaurant-123" }),
    } as unknown as APIGatewayProxyEvent;

    const response = await handler(event);

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body).message).toBe(
      "Error suggesting new menu items"
    );
    expect(JSON.parse(response.body).error).toBe("LLM service error");
  });

  it("should apply default values when optional parameters are not provided", async () => {
    const event = {
      body: JSON.stringify({ restaurantId: "restaurant-123" }),
    } as unknown as APIGatewayProxyEvent;

    await handler(event);

    // Verify default maxSuggestions (5) was used
    const llmCallArgs = (LLMService.prototype.complete as jest.Mock).mock
      .calls[0][0];
    expect(llmCallArgs.prompt).toContain(
      "Generate 5 unique menu item suggestions"
    );
  });

  it("should respect excludeCategories parameter", async () => {
    const event = {
      body: JSON.stringify({
        restaurantId: "restaurant-123",
        excludeCategories: ["dessert"],
      }),
    } as unknown as APIGatewayProxyEvent;

    await handler(event);

    // Verify excludeCategories was included in the prompt
    const llmCallArgs = (LLMService.prototype.complete as jest.Mock).mock
      .calls[0][0];
    expect(llmCallArgs.prompt).toContain("CATEGORIES TO EXCLUDE: dessert");
  });
});
