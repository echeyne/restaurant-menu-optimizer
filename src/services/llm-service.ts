/**
 * LLM Service for high-level LLM operations
 */

import { LLMClientFactory, LLMClientFactoryConfig } from "./llm-client-factory";
import {
  LLMClient,
  LLMProvider,
  CompletionRequest,
  CompletionResponse,
} from "./llm-client";

/**
 * Service for interacting with LLMs
 */
export class LLMService {
  private clientFactory: LLMClientFactory;
  private clientCache: Map<string, LLMClient> = new Map();

  /**
   * Create a new LLM service
   * @param config Configuration for the LLM client factory
   */
  constructor(config: LLMClientFactoryConfig = {}) {
    this.clientFactory = new LLMClientFactory(config);
  }

  /**
   * Complete a prompt using the default LLM provider
   * @param request Completion request
   * @returns Completion response
   */
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const client = await this.getDefaultClient();
    return client.complete(request);
  }

  /**
   * Complete a prompt using a specific LLM provider
   * @param provider LLM provider to use
   * @param request Completion request
   * @param model Optional model to use
   * @returns Completion response
   */
  async completeWithProvider(
    provider: LLMProvider,
    request: CompletionRequest,
    model?: string
  ): Promise<CompletionResponse> {
    const client = await this.getClient(provider, model);
    return client.complete(request);
  }

  /**
   * Get the default LLM client (cached)
   * @returns LLM client
   */
  private async getDefaultClient(): Promise<LLMClient> {
    const cacheKey = "default";

    if (!this.clientCache.has(cacheKey)) {
      const client = await this.clientFactory.createClient();
      this.clientCache.set(cacheKey, client);
    }

    return this.clientCache.get(cacheKey)!;
  }

  /**
   * Get an LLM client for a specific provider (cached)
   * @param provider LLM provider
   * @param model Optional model to use
   * @returns LLM client
   */
  private async getClient(
    provider: LLMProvider,
    model?: string
  ): Promise<LLMClient> {
    const cacheKey = `${provider}:${model || "default"}`;

    if (!this.clientCache.has(cacheKey)) {
      const client = await this.clientFactory.createClientWithProvider(
        provider,
        model
      );
      this.clientCache.set(cacheKey, client);
    }

    return this.clientCache.get(cacheKey)!;
  }

  /**
   * Clear the client cache
   */
  clearCache(): void {
    this.clientCache.clear();
  }
}
