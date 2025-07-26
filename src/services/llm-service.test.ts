/**
 * Unit tests for LLM Service
 */

import { LLMService } from "./llm-service";
import {
  LLMClient,
  LLMProvider,
  CompletionRequest,
  CompletionResponse,
} from "./llm-client";
import { LLMClientFactory } from "./llm-client-factory";

// Mock the LLM client and factory
jest.mock("./llm-client");
jest.mock("./llm-client-factory");

describe("LLMService", () => {
  let llmService: LLMService;
  let mockClient: jest.Mocked<LLMClient>;
  let mockFactory: jest.Mocked<LLMClientFactory>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock implementations
    mockClient = {
      complete: jest.fn(),
    } as unknown as jest.Mocked<LLMClient>;

    mockFactory = {
      createClient: jest.fn().mockResolvedValue(mockClient),
      createClientWithProvider: jest.fn().mockResolvedValue(mockClient),
    } as unknown as jest.Mocked<LLMClientFactory>;

    // Mock the factory constructor
    (LLMClientFactory as jest.Mock).mockImplementation(() => mockFactory);

    // Create the service
    llmService = new LLMService();
  });

  describe("complete", () => {
    it("should call the default client to complete a prompt", async () => {
      // Arrange
      const request: CompletionRequest = {
        prompt: "Test prompt",
        systemPrompt: "Test system prompt",
      };

      const expectedResponse: CompletionResponse = {
        text: "Generated text",
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
      };

      mockClient.complete.mockResolvedValue(expectedResponse);

      // Act
      const result = await llmService.complete(request);

      // Assert
      expect(mockFactory.createClient).toHaveBeenCalledTimes(1);
      expect(mockClient.complete).toHaveBeenCalledWith(request);
      expect(result).toEqual(expectedResponse);
    });

    it("should cache the client for subsequent calls", async () => {
      // Arrange
      const request1: CompletionRequest = { prompt: "Test prompt 1" };
      const request2: CompletionRequest = { prompt: "Test prompt 2" };

      mockClient.complete.mockResolvedValue({ text: "Generated text" });

      // Act
      await llmService.complete(request1);
      await llmService.complete(request2);

      // Assert
      expect(mockFactory.createClient).toHaveBeenCalledTimes(1);
      expect(mockClient.complete).toHaveBeenCalledTimes(2);
      expect(mockClient.complete).toHaveBeenNthCalledWith(1, request1);
      expect(mockClient.complete).toHaveBeenNthCalledWith(2, request2);
    });
  });

  describe("completeWithProvider", () => {
    it("should call the specified provider client to complete a prompt", async () => {
      // Arrange
      const provider = LLMProvider.ANTHROPIC;
      const model = "claude-3-5-sonnet-20241022";
      const request: CompletionRequest = {
        prompt: "Test prompt",
        systemPrompt: "Test system prompt",
      };

      const expectedResponse: CompletionResponse = {
        text: "Generated text from Anthropic",
      };

      mockClient.complete.mockResolvedValue(expectedResponse);

      // Act
      const result = await llmService.completeWithProvider(
        provider,
        request,
        model
      );

      // Assert
      expect(mockFactory.createClientWithProvider).toHaveBeenCalledWith(
        provider,
        model
      );
      expect(mockClient.complete).toHaveBeenCalledWith(request);
      expect(result).toEqual(expectedResponse);
    });

    it("should cache the provider client for subsequent calls", async () => {
      // Arrange
      const provider = LLMProvider.OPENAI;
      const model = "gpt-4-turbo";
      const request1: CompletionRequest = { prompt: "Test prompt 1" };
      const request2: CompletionRequest = { prompt: "Test prompt 2" };

      mockClient.complete.mockResolvedValue({ text: "Generated text" });

      // Act
      await llmService.completeWithProvider(provider, request1, model);
      await llmService.completeWithProvider(provider, request2, model);

      // Assert
      expect(mockFactory.createClientWithProvider).toHaveBeenCalledTimes(1);
      expect(mockFactory.createClientWithProvider).toHaveBeenCalledWith(
        provider,
        model
      );
      expect(mockClient.complete).toHaveBeenCalledTimes(2);
      expect(mockClient.complete).toHaveBeenNthCalledWith(1, request1);
      expect(mockClient.complete).toHaveBeenNthCalledWith(2, request2);
    });

    it("should create different clients for different providers", async () => {
      // Arrange
      const provider1 = LLMProvider.OPENAI;
      const provider2 = LLMProvider.GOOGLE;
      const request: CompletionRequest = { prompt: "Test prompt" };

      mockClient.complete.mockResolvedValue({ text: "Generated text" });

      // Act
      await llmService.completeWithProvider(provider1, request);
      await llmService.completeWithProvider(provider2, request);

      // Assert
      expect(mockFactory.createClientWithProvider).toHaveBeenCalledTimes(2);
      expect(mockFactory.createClientWithProvider).toHaveBeenNthCalledWith(
        1,
        provider1,
        undefined
      );
      expect(mockFactory.createClientWithProvider).toHaveBeenNthCalledWith(
        2,
        provider2,
        undefined
      );
    });
  });

  describe("clearCache", () => {
    it("should clear the client cache", async () => {
      // Arrange
      const request: CompletionRequest = { prompt: "Test prompt" };
      mockClient.complete.mockResolvedValue({ text: "Generated text" });

      // Act - First call should create and cache the client
      await llmService.complete(request);

      // Clear the cache
      llmService.clearCache();

      // Second call should create a new client
      await llmService.complete(request);

      // Assert
      expect(mockFactory.createClient).toHaveBeenCalledTimes(2);
    });
  });
});
