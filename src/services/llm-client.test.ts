/**
 * Tests for the LLM client and factory
 */

import { LLMClient, LLMProvider } from "./llm-client";
import { LLMClientFactory } from "./llm-client-factory";
import { LLMService } from "./llm-service";
import { SSM } from "aws-sdk";

// Mock AWS SDK
jest.mock("aws-sdk", () => {
  const mockSSM = {
    getParameter: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Parameter: {
          Value: "mock-api-key",
        },
      }),
    }),
  };

  return {
    SSM: jest.fn(() => mockSSM),
  };
});

// Mock axios
jest.mock("axios", () => {
  return {
    create: jest.fn().mockReturnValue({
      post: jest.fn().mockResolvedValue({
        data: {
          // OpenAI format
          choices: [
            {
              message: {
                content: "Mock response from LLM",
              },
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30,
          },
        },
      }),
    }),
  };
});

describe("LLM Client", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.LLM_PROVIDER = "openai";
    process.env.LLM_MODEL = "gpt-4-turbo";
    process.env.STAGE = "test";
  });

  test("should create client with correct configuration", () => {
    const client = new LLMClient({
      provider: LLMProvider.OPENAI,
      apiKey: "test-key",
      model: "gpt-4-turbo",
    });

    expect(client).toBeDefined();
  });

  test("should complete a prompt successfully", async () => {
    const client = new LLMClient({
      provider: LLMProvider.OPENAI,
      apiKey: "test-key",
      model: "gpt-4-turbo",
    });

    const response = await client.complete({
      prompt: "Test prompt",
      systemPrompt: "You are a helpful assistant",
    });

    expect(response.text).toBe("Mock response from LLM");
    expect(response.usage).toBeDefined();
    expect(response.usage?.totalTokens).toBe(30);
  });
});

describe("LLM Client Factory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.LLM_PROVIDER = "openai";
    process.env.LLM_MODEL = "gpt-4-turbo";
    process.env.STAGE = "test";
  });

  test("should create client with environment variables", async () => {
    const factory = new LLMClientFactory();
    const client = await factory.createClient();

    expect(client).toBeDefined();
    expect(SSM).toHaveBeenCalled();
  });

  test("should create client with specific provider", async () => {
    const factory = new LLMClientFactory();
    const client = await factory.createClientWithProvider(
      LLMProvider.ANTHROPIC
    );

    expect(client).toBeDefined();
    expect(SSM).toHaveBeenCalled();
  });

  test("should use local environment variable in development mode", async () => {
    process.env.NODE_ENV = "development";
    process.env.LLM_API_KEY = "local-dev-key";

    const factory = new LLMClientFactory();
    const client = await factory.createClient();

    expect(client).toBeDefined();
    // SSM should not be called when using local env var
    expect(SSM).toHaveBeenCalled();

    // Reset
    delete process.env.NODE_ENV;
    delete process.env.LLM_API_KEY;
  });
});

describe("LLM Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.LLM_PROVIDER = "openai";
    process.env.LLM_MODEL = "gpt-4-turbo";
    process.env.STAGE = "test";
  });

  test("should complete a prompt with default provider", async () => {
    const service = new LLMService();

    const response = await service.complete({
      prompt: "Test prompt",
      systemPrompt: "You are a helpful assistant",
    });

    expect(response.text).toBe("Mock response from LLM");
  });

  test("should complete a prompt with specific provider", async () => {
    const service = new LLMService();

    const response = await service.completeWithProvider(LLMProvider.ANTHROPIC, {
      prompt: "Test prompt",
      systemPrompt: "You are a helpful assistant",
    });

    expect(response.text).toBe("Mock response from LLM");
  });

  test("should cache clients", async () => {
    const service = new LLMService();

    // First call should create a new client
    await service.complete({
      prompt: "Test prompt 1",
    });

    // Second call should use cached client
    await service.complete({
      prompt: "Test prompt 2",
    });

    // Clear cache
    service.clearCache();

    // This call should create a new client
    await service.complete({
      prompt: "Test prompt 3",
    });

    // We expect SSM to be called twice (once for initial client, once after cache clear)
    expect(SSM).toHaveBeenCalledTimes(2);
  });
});
