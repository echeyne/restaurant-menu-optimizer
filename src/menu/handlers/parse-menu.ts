/**
 * Lambda function for parsing menu files
 * Extracts text from uploaded files and uses LLM to structure menu items
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import { TextExtractionService } from "../../services/text-extraction-service";
import { LLMClient, LLMProvider } from "../../services/llm-client";
import { MenuItem } from "../../models/database";
import { MenuItemRepository } from "../../repositories/menu-item-repository";
import { MenuFileRepository } from "../../repositories/menu-file-repository";
import { SSM } from "aws-sdk";
import { createResponse } from "../../models/api";
import { getUserIdFromToken } from "../../utils/auth-utils";

/**
 * Handler for menu parsing requests
 * @param event API Gateway event
 * @returns API Gateway response
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Handle OPTIONS request for CORS
    if (event.httpMethod === "OPTIONS") {
      return createResponse(200, {});
    }

    // Validate user authentication
    const userId = await getUserIdFromToken(event);
    if (!userId) {
      return createResponse(401, {
        message: "Unauthorized",
      });
    }

    // Parse request body
    const body = JSON.parse(event.body || "{}");
    const { restaurantId, fileKey, fileType, fileId } = body;

    // Validate request parameters
    if (!restaurantId || !fileKey || !fileType) {
      return createResponse(400, {
        message: "Missing required parameters: restaurantId, fileKey, fileType",
      });
    }

    // Update menu file status to processing if fileId is provided
    if (fileId) {
      const menuFileRepository = new MenuFileRepository();
      await menuFileRepository.updateStatus(fileId, "pending");
    }

    // Extract text from the uploaded file
    const textExtractionService = new TextExtractionService(
      process.env.MENU_FILES_BUCKET || ""
    );
    console.log(`Extracting text from ${fileKey} (${fileType})`);
    const extractedText = await textExtractionService.extractTextFromS3File(
      fileKey,
      fileType
    );

    // Check if text was extracted
    if (!extractedText || extractedText.trim() === "") {
      // Update file status to failed if fileId is provided
      if (fileId) {
        const menuFileRepository = new MenuFileRepository();
        await menuFileRepository.updateStatus(
          fileId,
          "failed",
          "No text could be extracted from the uploaded file"
        );
      }

      return createResponse(400, {
        message: "No text could be extracted from the uploaded file",
      });
    }

    console.log(
      `Successfully extracted ${extractedText.length} characters of text`
    );

    console.log(extractedText);

    try {
      // Parse the extracted text into menu items using LLM
      const menuItems = await parseMenuWithLLM(extractedText, restaurantId);

      // Store the parsed menu items in the database
      const menuItemRepository = new MenuItemRepository();
      const savedItems = await menuItemRepository.batchCreate(menuItems);

      console.log(
        `Successfully saved ${savedItems.length} menu items to database`
      );

      // Update file status to processed if fileId is provided
      if (fileId) {
        const menuFileRepository = new MenuFileRepository();
        await menuFileRepository.updateStatus(fileId, "processed");
      }

      // Return the parsed menu items with optimization options available
      return createResponse(200, {
        message: "Menu parsed and saved successfully",
        menuItems: savedItems,
        itemCount: savedItems.length,
        nextStep: "optimization",
        optimizationOptionsAvailable: true,
        optimizationOptions: [
          {
            id: "optimize-existing",
            title: "Optimize Existing Items",
            description:
              "Enhance dish names and descriptions based on demographic data",
          },
          {
            id: "suggest-new-items",
            title: "Suggest New Menu Items",
            description:
              "Generate new menu item suggestions based on similar restaurants",
          },
        ],
      });
    } catch (error: any) {
      // Update file status to failed if fileId is provided
      if (fileId) {
        const menuFileRepository = new MenuFileRepository();
        await menuFileRepository.updateStatus(
          fileId,
          "failed",
          error.message || "Error parsing menu"
        );
      }

      throw error;
    }
  } catch (error: any) {
    console.error("Error parsing menu:", error);

    return createResponse(500, {
      message: "Error parsing menu",
      error: error.message,
    });
  }
};

/**
 * Get LLM API key from AWS Parameter Store
 * @returns LLM API key
 */
async function getLlmApiKey(): Promise<string> {
  // Parameter name follows the pattern: /{stage}/llm/{provider}/api-key
  const parameterName = `/${process.env.STAGE}/llm/${
    process.env.LLM_PROVIDER || "anthropic"
  }/api-key`;

  try {
    const ssm = new SSM({ region: process.env.REGION || "us-east-1" });
    const response = await ssm
      .getParameter({
        Name: parameterName,
        WithDecryption: true,
      })
      .promise();

    return response.Parameter?.Value || "";
  } catch (error) {
    console.error("Error retrieving LLM API key from Parameter Store:", error);
    throw new Error("Failed to retrieve LLM API key");
  }
}

/**
 * Parse extracted text into menu items using LLM
 * @param extractedText Extracted text from menu file
 * @param restaurantId Restaurant ID
 * @returns Parsed menu items ready for database insertion
 */
async function parseMenuWithLLM(
  extractedText: string,
  restaurantId: string
): Promise<Omit<MenuItem, "itemId" | "createdAt" | "updatedAt">[]> {
  // Get LLM API key from Parameter Store
  const apiKey = await getLlmApiKey();

  // Determine LLM provider from environment variable (default to Anthropic)
  const providerStr = (process.env.LLM_PROVIDER || "anthropic").toLowerCase();
  let provider: LLMProvider;
  let model: string;

  // Set provider and default model based on environment variable
  switch (providerStr) {
    case "openai":
      provider = LLMProvider.OPENAI;
      model = process.env.LLM_MODEL || "gpt-4-turbo";
      break;
    case "google":
      provider = LLMProvider.GOOGLE;
      model = process.env.LLM_MODEL || "gemini-pro";
      break;
    case "anthropic":
    default:
      provider = LLMProvider.ANTHROPIC;
      model = process.env.LLM_MODEL || "claude-3-5-sonnet-20241022";
      break;
  }

  // Initialize LLM client with the retrieved API key
  const llmClient = new LLMClient({
    provider,
    apiKey,
    model,
    maxRetries: 3,
  });

  // Create system prompt for menu parsing with enhanced instructions
  const systemPrompt = `You are an expert at parsing restaurant menus. Your task is to extract structured menu items from text that was obtained via OCR from a restaurant menu. 
  
You should identify menu items, their descriptions, prices, categories, ingredients, and dietary information. Be attentive to menu section headers which often indicate categories.

Common menu categories include:
- Appetizers/Starters
- Soups & Salads
- Main Courses/Entrees
- Sides
- Desserts
- Beverages
- Specials

For dietary tags, look for symbols or explicit mentions of:
- Vegetarian (V)
- Vegan (VG)
- Gluten-Free (GF)
- Dairy-Free (DF)
- Contains Nuts (N)
- Spicy (often indicated by chili symbols)`;

  // Create user prompt with the extracted text and enhanced instructions
  const prompt = `
I have text extracted from a restaurant menu using OCR. Please parse this text into structured menu items.

For each menu item, extract the following fields:
- name: The name of the dish
- description: The description of the dish (if available, otherwise empty string)
- price: The price as a number (e.g., 12.99, not "$12.99")
- category: The category of the dish (e.g., Appetizers, Main Course, Desserts)
- ingredients: Array of ingredients mentioned (if available, otherwise empty array)
- dietaryTags: Array of dietary information (e.g., Vegetarian, Vegan, Gluten-Free) (if available, otherwise empty array)

Important guidelines:
1. Remove currency symbols ($, €, etc.) from prices and convert to numbers
2. If a price range is given (e.g., $10-$15), use the lower value
3. Infer the category from section headers in the menu
4. Extract ingredients from the description when possible
5. Look for dietary indicators like (V), (GF), etc. and convert to full words
6. If you're uncertain about any field, use your best judgment based on context

Return the result as a valid JSON array of menu items. Ensure the JSON is properly formatted and can be parsed.

Here's the extracted text:
${extractedText}
`;

  // Call the LLM API
  console.log("Calling LLM API to parse menu text");
  const response = await llmClient.complete({
    systemPrompt,
    prompt,
    temperature: 0.1, // Lower temperature for more deterministic results
    maxTokens: 4000,
  });

  // Parse the LLM response into menu items
  try {
    // Extract JSON from the response
    const jsonMatch = response.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("No JSON array found in LLM response");
    }

    let menuItems = JSON.parse(jsonMatch[0]);

    // Validate and clean up the parsed menu items
    menuItems = menuItems.map((item) => {
      // Ensure price is a number
      if (typeof item.price === "string") {
        item.price = parseFloat(item.price.replace(/[^\d.]/g, ""));
      }

      // Ensure arrays are properly initialized
      if (!Array.isArray(item.ingredients)) {
        item.ingredients = [];
      }

      if (!Array.isArray(item.dietaryTags)) {
        item.dietaryTags = [];
      }

      // Ensure description is a string
      if (!item.description) {
        item.description = "";
      }

      // Add required fields
      return {
        ...item,
        itemId: uuidv4(),
        restaurantId,
        isActive: true,
        isAiGenerated: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    // Filter out any items with missing required fields
    menuItems = menuItems.filter(
      (item) =>
        item.name &&
        item.price !== undefined &&
        !isNaN(item.price) &&
        item.category
    );

    if (menuItems.length === 0) {
      throw new Error("No valid menu items could be parsed from the text");
    }

    // Convert Partial<MenuItem>[] to Omit<MenuItem, "itemId" | "createdAt" | "updatedAt">[]
    // by ensuring all required fields are present
    const validMenuItems = menuItems.map((item) => {
      return {
        name: item.name!,
        description: item.description || "",
        price: item.price!,
        category: item.category!,
        ingredients: item.ingredients || [],
        dietaryTags: item.dietaryTags || [],
        restaurantId,
        isActive: true,
        isAiGenerated: false,
        // Optional fields
        enhancedDescription: item.enhancedDescription,
        imageUrl: item.imageUrl,
        qlooTasteProfile: item.qlooTasteProfile,
        llmGeneratedTags: item.llmGeneratedTags,
      };
    });

    return validMenuItems;
  } catch (error: any) {
    console.error("Error parsing LLM response:", error);
    throw new Error(
      `Failed to parse menu structure from LLM response: ${error.message}`
    );
  }
}
