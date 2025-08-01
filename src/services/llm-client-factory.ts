/**
 * LLM Client Factory for creating LLM clients with secure API key handling
 */

import { SSM } from "aws-sdk";
import { LLMClient, LLMProvider, LLMClientConfig } from "./llm-client";

/**
 * Configuration for the LLM client factory
 */
export interface LLMClientFactoryConfig {
  provider?: LLMProvider;
  model?: string;
  stage?: string;
  maxRetries?: number;
  timeout?: number;
}

/**
 * Factory for creating LLM clients with secure API key handling
 */
export class LLMClientFactory {
  private ssm: SSM;
  private config: LLMClientFactoryConfig;

  /**
   * Create a new LLM client factory
   * @param config Factory configuration
   */
  constructor(config: LLMClientFactoryConfig = {}) {
    this.ssm = new SSM();

    // Set default configuration values
    this.config = {
      provider:
        (process.env.LLM_PROVIDER as LLMProvider) || LLMProvider.ANTHROPIC,
      model: process.env.LLM_MODEL,
      stage: process.env.STAGE || "dev",
      maxRetries: 2,
      timeout: 120000, // 2 minutes
      ...config,
    };
  }

  /**
   * Create a new LLM client with the configured provider
   * @returns Promise resolving to an LLM client
   */
  async createClient(): Promise<LLMClient> {
    const apiKey = await this.getApiKey(this.config.provider!);

    const clientConfig: LLMClientConfig = {
      provider: this.config.provider!,
      apiKey,
      model: this.config.model,
      maxRetries: this.config.maxRetries,
      timeout: this.config.timeout,
    };

    return new LLMClient(clientConfig);
  }

  /**
   * Create a new LLM client with a specific provider
   * @param provider LLM provider to use
   * @param model Optional model to use
   * @returns Promise resolving to an LLM client
   */
  async createClientWithProvider(
    provider: LLMProvider,
    model?: string
  ): Promise<LLMClient> {
    const apiKey = await this.getApiKey(provider);

    const clientConfig: LLMClientConfig = {
      provider,
      apiKey,
      model: model || this.getDefaultModel(provider),
      maxRetries: this.config.maxRetries,
      timeout: this.config.timeout,
    };

    return new LLMClient(clientConfig);
  }

  /**
   * Get the API key for the specified provider from AWS Parameter Store
   * @param provider LLM provider
   * @returns Promise resolving to the API key
   */
  private async getApiKey(provider: LLMProvider): Promise<string> {
    try {
      // For local development, check environment variables first
      if (process.env.LLM_API_KEY && process.env.NODE_ENV === "development") {
        return process.env.LLM_API_KEY;
      }

      const paramName = `/${this.config.stage}/llm/${provider}/api-key`;

      const response = await this.ssm
        .getParameter({
          Name: paramName,
          WithDecryption: true,
        })
        .promise();

      if (!response.Parameter?.Value) {
        throw new Error(`API key not found for provider: ${provider}`);
      }

      return response.Parameter.Value;
    } catch (error: any) {
      console.error(`Error retrieving API key for ${provider}:`, error.message);
      throw new Error(
        `Failed to retrieve API key for ${provider}: ${error.message}`
      );
    }
  }

  /**
   * Get the default model for the specified provider
   * @param provider LLM provider
   * @returns Default model name
   */
  private getDefaultModel(provider: LLMProvider): string {
    switch (provider) {
      case LLMProvider.OPENAI:
        return "gpt-4-turbo";
      case LLMProvider.ANTHROPIC:
        return "claude-sonnet-4-20250514";
      case LLMProvider.GOOGLE:
        return "gemini-pro";
      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }
}
