/**
 * Tests for the Analytics Service
 */

import { AnalyticsService } from "./analytics-service";
import { MenuItem, Restaurant, MenuAnalytics } from "../models/database";

// Mock the repositories
jest.mock("../repositories/analytics-repository");
jest.mock("../repositories/menu-item-repository");
jest.mock("../repositories/restaurant-repository");

describe("AnalyticsService", () => {
  let analyticsService: AnalyticsService;
  let mockMenuItem: MenuItem;
  let mockRestaurant: Restaurant;

  beforeEach(() => {
    analyticsService = new AnalyticsService();

    mockMenuItem = {
      itemId: "item-1",
      restaurantId: "restaurant-1",
      name: "Grilled Salmon",
      description: "Fresh Atlantic salmon grilled to perfection with herbs",
      enhancedDescription:
        "Succulent Atlantic salmon, expertly grilled and seasoned with aromatic herbs, served with seasonal vegetables",
      enhancedDescriptionStatus: "approved",
      price: 24.99,
      category: "seafood",
      ingredients: ["salmon", "herbs", "olive oil", "lemon", "vegetables"],
      dietaryTags: ["gluten-free", "high-protein"],
      imageUrl: "https://example.com/salmon.jpg",
      qlooTasteProfile: { umami: 0.8, saltiness: 0.6 },
      llmGeneratedTags: ["premium", "healthy"],
      isActive: true,
      isAiGenerated: false,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };

    mockRestaurant = {
      restaurantId: "restaurant-1",
      ownerId: "owner-1",
      name: "Ocean View Restaurant",
      city: "Miami",
      state: "FL",
      qlooEntityId: "qloo-123",
      address: "123 Ocean Drive, Miami, FL",
      priceLevel: 3,
      genreTags: ["urn:tag:genre:restaurant:seafood"],
      createdAt: "2024-01-01T00:00:00Z",
      profileSetupComplete: true,
    };
  });

  describe("calculateScores", () => {
    it("should calculate popularity score correctly", async () => {
      const scores = await analyticsService.calculateScores({
        menuItem: mockMenuItem,
        restaurant: mockRestaurant,
      });

      expect(scores.popularityScore).toBeGreaterThan(50);
      expect(scores.popularityScore).toBeLessThanOrEqual(100);
    });

    it("should calculate profitability score correctly", async () => {
      const scores = await analyticsService.calculateScores({
        menuItem: mockMenuItem,
        restaurant: mockRestaurant,
      });

      expect(scores.profitabilityScore).toBeGreaterThan(0);
      expect(scores.profitabilityScore).toBeLessThanOrEqual(100);
    });

    it("should calculate recommendation score correctly", async () => {
      const scores = await analyticsService.calculateScores({
        menuItem: mockMenuItem,
        restaurant: mockRestaurant,
      });

      expect(scores.recommendationScore).toBeGreaterThan(50);
      expect(scores.recommendationScore).toBeLessThanOrEqual(100);
    });

    it("should give higher scores for enhanced items", async () => {
      const enhancedItem = { ...mockMenuItem };
      const basicItem = {
        ...mockMenuItem,
        enhancedDescription: undefined,
        enhancedDescriptionStatus: undefined,
        llmGeneratedTags: undefined,
        qlooTasteProfile: undefined,
      };

      const enhancedScores = await analyticsService.calculateScores({
        menuItem: enhancedItem,
        restaurant: mockRestaurant,
      });

      const basicScores = await analyticsService.calculateScores({
        menuItem: basicItem as MenuItem,
        restaurant: mockRestaurant,
      });

      expect(enhancedScores.popularityScore).toBeGreaterThan(
        basicScores.popularityScore
      );
      expect(enhancedScores.recommendationScore).toBeGreaterThan(
        basicScores.recommendationScore
      );
    });
  });

  describe("score calculation edge cases", () => {
    it("should handle items with no dietary tags", async () => {
      const itemWithoutTags = { ...mockMenuItem, dietaryTags: [] };

      const scores = await analyticsService.calculateScores({
        menuItem: itemWithoutTags,
        restaurant: mockRestaurant,
      });

      expect(scores.popularityScore).toBeGreaterThan(0);
      expect(scores.popularityScore).toBeLessThanOrEqual(100);
    });

    it("should handle restaurants without price level", async () => {
      const restaurantWithoutPrice = {
        ...mockRestaurant,
        priceLevel: undefined,
      };

      const scores = await analyticsService.calculateScores({
        menuItem: mockMenuItem,
        restaurant: restaurantWithoutPrice,
      });

      expect(scores.profitabilityScore).toBeGreaterThan(0);
      expect(scores.profitabilityScore).toBeLessThanOrEqual(100);
    });

    it("should handle items with very short descriptions", async () => {
      const itemWithShortDescription = { ...mockMenuItem, description: "Fish" };
      const normalItem = { ...mockMenuItem };

      const shortDescScores = await analyticsService.calculateScores({
        menuItem: itemWithShortDescription,
        restaurant: mockRestaurant,
      });

      const normalScores = await analyticsService.calculateScores({
        menuItem: normalItem,
        restaurant: mockRestaurant,
      });

      // Short descriptions should get penalized
      expect(shortDescScores.recommendationScore).toBeLessThan(
        normalScores.recommendationScore
      );
    });

    it("should handle expensive items correctly", async () => {
      const expensiveItem = { ...mockMenuItem, price: 80 };
      const budgetRestaurant = { ...mockRestaurant, priceLevel: 1 };

      const scores = await analyticsService.calculateScores({
        menuItem: expensiveItem,
        restaurant: budgetRestaurant,
      });

      // Should still return valid scores
      expect(scores.profitabilityScore).toBeGreaterThan(0);
      expect(scores.profitabilityScore).toBeLessThanOrEqual(100);
    });
  });

  describe("category-based scoring", () => {
    it("should give higher popularity scores to popular categories", async () => {
      const burgerItem = { ...mockMenuItem, category: "burgers" };
      const obscureItem = { ...mockMenuItem, category: "molecular-gastronomy" };

      const burgerScores = await analyticsService.calculateScores({
        menuItem: burgerItem,
        restaurant: mockRestaurant,
      });

      const obscureScores = await analyticsService.calculateScores({
        menuItem: obscureItem,
        restaurant: mockRestaurant,
      });

      expect(burgerScores.popularityScore).toBeGreaterThan(
        obscureScores.popularityScore
      );
    });
  });

  describe("price-based scoring", () => {
    it("should handle different price points", async () => {
      // For price level 3 (upscale), expected range is $20-40
      const sweetSpotItem = { ...mockMenuItem, price: 30 };
      const expensiveItem = { ...mockMenuItem, price: 50 };

      const sweetSpotScores = await analyticsService.calculateScores({
        menuItem: sweetSpotItem,
        restaurant: mockRestaurant,
      });

      const expensiveScores = await analyticsService.calculateScores({
        menuItem: expensiveItem,
        restaurant: mockRestaurant,
      });

      // Both should return valid scores
      expect(sweetSpotScores.profitabilityScore).toBeGreaterThan(0);
      expect(sweetSpotScores.profitabilityScore).toBeLessThanOrEqual(100);
      expect(expensiveScores.profitabilityScore).toBeGreaterThan(0);
      expect(expensiveScores.profitabilityScore).toBeLessThanOrEqual(100);
    });
  });
});
