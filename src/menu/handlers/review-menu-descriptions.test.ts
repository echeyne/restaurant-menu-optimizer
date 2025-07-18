/**
 * Tests for the review-menu-descriptions handler
 */

import { handler } from "./review-menu-descriptions";
import { MenuItemRepository } from "../../repositories/menu-item-repository";
import { MenuItem } from "../../models/database";

// Mock the MenuItemRepository
jest.mock("../../repositories/menu-item-repository");

describe("review-menu-descriptions handler", () => {
  // Mock data
  const mockMenuItem: MenuItem = {
    itemId: "test-item-1",
    restaurantId: "test-restaurant-1",
    name: "Test Item",
    description: "Original description",
    enhancedDescription: "Enhanced description",
    enhancedDescriptionStatus: "pending",
    price: 9.99,
    category: "Appetizers",
    ingredients: ["ingredient1", "ingredient2"],
    dietaryTags: ["vegetarian"],
    isActive: true,
    isAiGenerated: false,
    createdAt: "2023-01-01T00:00:00Z",
    updatedAt: "2023-01-01T00:00:00Z",
  };

  // Reset mocks before each test
  beforeEach(() => {
    jest.resetAllMocks();

    // Setup mock implementation
    (MenuItemRepository as jest.Mock).mockImplementation(() => ({
      getById: jest.fn().mockResolvedValue(mockMenuItem),
      updateEnhancedDescriptionStatus: jest.fn().mockResolvedValue({
        ...mockMenuItem,
        enhancedDescriptionStatus: "approved",
      }),
    }));
  });

  it("should approve a menu item description", async () => {
    // Create mock event
    const event = {
      body: JSON.stringify({
        itemId: "test-item-1",
        status: "approved",
      }),
    };

    // Call the handler
    const response = await handler(event as any);

    // Parse the response body
    const body = JSON.parse(response.body);

    // Verify the response
    expect(response.statusCode).toBe(200);
    expect(body.processed).toBe(1);
    expect(body.failed).toBe(0);
    expect(body.results[0].status).toBe("approved");
    expect(body.results[0].success).toBe(true);

    // Verify the repository was called correctly
    const mockRepo = (MenuItemRepository as jest.Mock).mock.instances[0];
    expect(mockRepo.getById).toHaveBeenCalledWith("test-item-1");
    expect(mockRepo.updateEnhancedDescriptionStatus).toHaveBeenCalledWith(
      "test-item-1",
      "approved",
      undefined
    );
  });

  it("should reject a menu item description", async () => {
    // Create mock event
    const event = {
      body: JSON.stringify({
        itemId: "test-item-1",
        status: "rejected",
        feedback: "Not descriptive enough",
      }),
    };

    // Setup mock implementation for rejection
    (MenuItemRepository as jest.Mock).mockImplementation(() => ({
      getById: jest.fn().mockResolvedValue(mockMenuItem),
      updateEnhancedDescriptionStatus: jest.fn().mockResolvedValue({
        ...mockMenuItem,
        enhancedDescriptionStatus: "rejected",
      }),
    }));

    // Call the handler
    const response = await handler(event as any);

    // Parse the response body
    const body = JSON.parse(response.body);

    // Verify the response
    expect(response.statusCode).toBe(200);
    expect(body.processed).toBe(1);
    expect(body.failed).toBe(0);
    expect(body.results[0].status).toBe("rejected");
    expect(body.results[0].success).toBe(true);

    // Verify the repository was called correctly
    const mockRepo = (MenuItemRepository as jest.Mock).mock.instances[0];
    expect(mockRepo.getById).toHaveBeenCalledWith("test-item-1");
    expect(mockRepo.updateEnhancedDescriptionStatus).toHaveBeenCalledWith(
      "test-item-1",
      "rejected",
      "Not descriptive enough"
    );
  });

  it("should process a batch of menu item descriptions", async () => {
    // Create mock event for batch processing
    const event = {
      body: JSON.stringify({
        items: [
          {
            itemId: "test-item-1",
            status: "approved",
          },
          {
            itemId: "test-item-2",
            status: "rejected",
            feedback: "Too verbose",
          },
        ],
      }),
    };

    // Setup mock implementation for batch processing
    const mockRepo = {
      getById: jest.fn(),
      updateEnhancedDescriptionStatus: jest.fn(),
    };

    mockRepo.getById.mockImplementation((itemId) => {
      if (itemId === "test-item-1") {
        return Promise.resolve(mockMenuItem);
      } else {
        return Promise.resolve({
          ...mockMenuItem,
          itemId: "test-item-2",
          name: "Test Item 2",
        });
      }
    });

    mockRepo.updateEnhancedDescriptionStatus.mockImplementation(
      (itemId, status) => {
        return Promise.resolve({
          ...mockMenuItem,
          itemId,
          enhancedDescriptionStatus: status,
        });
      }
    );

    (MenuItemRepository as jest.Mock).mockImplementation(() => mockRepo);

    // Call the handler
    const response = await handler(event as any);

    // Parse the response body
    const body = JSON.parse(response.body);

    // Verify the response
    expect(response.statusCode).toBe(200);
    expect(body.processed).toBe(2);
    expect(body.failed).toBe(0);
    expect(body.results.length).toBe(2);
    expect(body.results[0].status).toBe("approved");
    expect(body.results[1].status).toBe("rejected");

    // Verify the repository was called correctly
    expect(mockRepo.getById).toHaveBeenCalledTimes(2);
    expect(mockRepo.updateEnhancedDescriptionStatus).toHaveBeenCalledTimes(2);
    expect(mockRepo.updateEnhancedDescriptionStatus).toHaveBeenCalledWith(
      "test-item-1",
      "approved",
      undefined
    );
    expect(mockRepo.updateEnhancedDescriptionStatus).toHaveBeenCalledWith(
      "test-item-2",
      "rejected",
      "Too verbose"
    );
  });

  it("should handle errors when menu item is not found", async () => {
    // Setup mock implementation for item not found
    (MenuItemRepository as jest.Mock).mockImplementation(() => ({
      getById: jest.fn().mockResolvedValue(null),
      updateEnhancedDescriptionStatus: jest.fn(),
    }));

    // Create mock event
    const event = {
      body: JSON.stringify({
        itemId: "non-existent-item",
        status: "approved",
      }),
    };

    // Call the handler
    const response = await handler(event as any);

    // Parse the response body
    const body = JSON.parse(response.body);

    // Verify the response
    expect(response.statusCode).toBe(200);
    expect(body.processed).toBe(0);
    expect(body.failed).toBe(1);
    expect(body.results[0].success).toBe(false);
    expect(body.results[0].error).toContain("not found");

    // Verify the repository was called correctly
    const mockRepo = (MenuItemRepository as jest.Mock).mock.instances[0];
    expect(mockRepo.getById).toHaveBeenCalledWith("non-existent-item");
    expect(mockRepo.updateEnhancedDescriptionStatus).not.toHaveBeenCalled();
  });

  it("should handle invalid request body", async () => {
    // Create mock event with invalid body
    const event = {
      body: JSON.stringify({
        // Missing required fields
      }),
    };

    // Call the handler
    const response = await handler(event as any);

    // Verify the response
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).message).toContain("required");
  });
});
