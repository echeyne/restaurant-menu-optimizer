/**
 * Tests for optimize-existing-items Lambda function
 */

import { handler } from "./optimize-existing-items";
import { APIGatewayProxyEvent } from "aws-lambda";

// Mock the dependencies
jest.mock("../../repositories/menu-item-repository");
jest.mock("../../repositories/demographics-data-repository");
jest.mock("../../repositories/optimized-menu-items-repository");
jest.mock("../../services/llm-service");
jest.mock("../../utils/auth-utils");

describe("optimize-existing-items handler", () => {
  it("should be defined", () => {
    expect(handler).toBeDefined();
  });

  it("should return 400 when selectedDemographics is missing", async () => {
    const event: Partial<APIGatewayProxyEvent> = {
      httpMethod: "POST",
      body: JSON.stringify({
        restaurantId: "test-restaurant-id",
      }),
      headers: {
        Authorization: "Bearer test-token",
      },
    };

    // Mock auth to return a valid user ID
    const { getUserIdFromToken } = require("../../utils/auth-utils");
    getUserIdFromToken.mockResolvedValue("test-user-id");

    const result = await handler(event as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).message).toBe(
      "Missing required field: selectedDemographics"
    );
  });

  it("should return 400 when no demographic groups are selected", async () => {
    const event: Partial<APIGatewayProxyEvent> = {
      httpMethod: "POST",
      body: JSON.stringify({
        restaurantId: "test-restaurant-id",
        selectedDemographics: {
          selectedAgeGroups: [],
          selectedGenders: [],
          selectedInterests: [],
        },
      }),
      headers: {
        Authorization: "Bearer test-token",
      },
    };

    // Mock auth to return a valid user ID
    const { getUserIdFromToken } = require("../../utils/auth-utils");
    getUserIdFromToken.mockResolvedValue("test-user-id");

    const result = await handler(event as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).message).toBe(
      "At least one demographic group must be selected for optimization"
    );
  });

  it("should handle OPTIONS request for CORS", async () => {
    const event: Partial<APIGatewayProxyEvent> = {
      httpMethod: "OPTIONS",
    };

    const result = await handler(event as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(200);
  });
});
