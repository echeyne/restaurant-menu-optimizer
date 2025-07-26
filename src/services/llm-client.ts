/**
 * LLM Client for interacting with various LLM providers
 * Supports OpenAI, Anthropic, and Google AI
 */

import axios, { AxiosInstance, AxiosRequestConfig } from "axios";

/**
 * LLM Provider options
 */
export enum LLMProvider {
  OPENAI = "openai",
  ANTHROPIC = "anthropic",
  GOOGLE = "google",
}

/**
 * LLM Client configuration
 */
export interface LLMClientConfig {
  provider: LLMProvider;
  apiKey: string;
  model?: string;
  baseUrl?: string;
  maxRetries?: number;
  timeout?: number;
}

/**
 * Completion request parameters
 */
export interface CompletionRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stop?: string[];
  systemPrompt?: string;
}

/**
 * Completion response
 */
export interface CompletionResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * LLM Client for interacting with various LLM providers
 */
export class LLMClient {
  private config: LLMClientConfig;
  private client: AxiosInstance;
  private retryCount: number = 0;

  /**
   * Create a new LLM client
   * @param config Client configuration
   */
  constructor(config: LLMClientConfig) {
    // Set default configuration values
    this.config = {
      maxRetries: 3,
      timeout: 30000, // 30 seconds
      ...config,
    };

    // Set default model based on provider
    if (!this.config.model) {
      switch (this.config.provider) {
        case LLMProvider.OPENAI:
          this.config.model = "gpt-4-turbo";
          break;
        case LLMProvider.ANTHROPIC:
          this.config.model = "claude-3-5-sonnet-20241022";
          break;
        case LLMProvider.GOOGLE:
          this.config.model = "gemini-pro";
          break;
      }
    }

    // Set default base URL based on provider
    if (!this.config.baseUrl) {
      switch (this.config.provider) {
        case LLMProvider.OPENAI:
          this.config.baseUrl = "https://api.openai.com/v1";
          break;
        case LLMProvider.ANTHROPIC:
          this.config.baseUrl = "https://api.anthropic.com/v1";
          break;
        case LLMProvider.GOOGLE:
          this.config.baseUrl =
            "https://generativelanguage.googleapis.com/v1beta";
          break;
      }
    }

    // Create axios client
    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: this.getAuthHeaders(),
    });
  }

  /**
   * Get authentication headers based on provider
   * @returns Authentication headers
   */
  private getAuthHeaders(): Record<string, string> {
    switch (this.config.provider) {
      case LLMProvider.OPENAI:
        return {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        };
      case LLMProvider.ANTHROPIC:
        return {
          "x-api-key": this.config.apiKey,
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
        };
      case LLMProvider.GOOGLE:
        return {
          "Content-Type": "application/json",
        };
      default:
        return {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        };
    }
  }

  /**
   * Complete a prompt using the configured LLM provider
   * @param request Completion request
   * @returns Completion response
   */
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    try {
      const requestData = this.formatRequestData(request);
      const endpoint = this.getCompletionEndpoint();

      // Add API key as query parameter for Google AI
      const config: AxiosRequestConfig = {};
      if (this.config.provider === LLMProvider.GOOGLE) {
        config.params = { key: this.config.apiKey };
      }

      const response = await this.client.post(endpoint, requestData, config);
      return this.parseResponse(response.data);
    } catch (error: any) {
      console.error("LLM API error:", error.response?.data || error.message);

      // Retry on rate limit or server errors
      if (
        this.retryCount < (this.config.maxRetries || 3) &&
        (error.response?.status === 429 || error.response?.status >= 500)
      ) {
        this.retryCount++;
        const delay = Math.pow(2, this.retryCount) * 1000; // Exponential backoff
        console.log(
          `Retrying LLM request in ${delay}ms (attempt ${this.retryCount})`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.complete(request);
      }

      // Reset retry count
      this.retryCount = 0;
      throw new Error(`LLM API error: ${error.message}`);
    }
  }

  /**
   * Format request data based on provider
   * @param request Completion request
   * @returns Formatted request data
   */
  private formatRequestData(request: CompletionRequest): any {
    switch (this.config.provider) {
      case LLMProvider.OPENAI:
        return {
          model: this.config.model,
          messages: [
            ...(request.systemPrompt
              ? [{ role: "system", content: request.systemPrompt }]
              : []),
            { role: "user", content: request.prompt },
          ],
          max_tokens: request.maxTokens || 1000,
          temperature: request.temperature || 0.7,
          top_p: request.topP || 1,
          stop: request.stop || null,
        };
      case LLMProvider.ANTHROPIC:
        return {
          model: this.config.model,
          messages: [
            ...(request.systemPrompt
              ? [{ role: "system", content: request.systemPrompt }]
              : []),
            { role: "user", content: request.prompt },
          ],
          max_tokens: request.maxTokens || 1000,
          temperature: request.temperature || 0.7,
          top_p: request.topP || 1,
          stop_sequences: request.stop || [],
        };
      case LLMProvider.GOOGLE:
        return {
          model: this.config.model,
          contents: [
            ...(request.systemPrompt
              ? [{ role: "system", parts: [{ text: request.systemPrompt }] }]
              : []),
            { role: "user", parts: [{ text: request.prompt }] },
          ],
          generationConfig: {
            maxOutputTokens: request.maxTokens || 1000,
            temperature: request.temperature || 0.7,
            topP: request.topP || 1,
            stopSequences: request.stop || [],
          },
        };
      default:
        throw new Error(`Unsupported LLM provider: ${this.config.provider}`);
    }
  }

  /**
   * Get completion endpoint based on provider
   * @returns Completion endpoint
   */
  private getCompletionEndpoint(): string {
    switch (this.config.provider) {
      case LLMProvider.OPENAI:
        return "/chat/completions";
      case LLMProvider.ANTHROPIC:
        return "/messages";
      case LLMProvider.GOOGLE:
        return `/models/${this.config.model}:generateContent`;
      default:
        throw new Error(`Unsupported LLM provider: ${this.config.provider}`);
    }
  }

  /**
   * Parse response based on provider
   * @param data Response data
   * @returns Parsed completion response
   */
  private parseResponse(data: any): CompletionResponse {
    switch (this.config.provider) {
      case LLMProvider.OPENAI:
        return {
          text: data.choices[0].message.content,
          usage: data.usage
            ? {
                promptTokens: data.usage.prompt_tokens,
                completionTokens: data.usage.completion_tokens,
                totalTokens: data.usage.total_tokens,
              }
            : undefined,
        };
      case LLMProvider.ANTHROPIC:
        return {
          text: data.content[0].text,
          usage: data.usage
            ? {
                promptTokens: data.usage.input_tokens,
                completionTokens: data.usage.output_tokens,
                totalTokens: data.usage.input_tokens + data.usage.output_tokens,
              }
            : undefined,
        };
      case LLMProvider.GOOGLE:
        return {
          text: data.candidates[0].content.parts[0].text,
          usage: undefined, // Google doesn't provide token usage in the response
        };
      default:
        throw new Error(`Unsupported LLM provider: ${this.config.provider}`);
    }
  }
}
