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
 * Check if the LLM response appears to be truncated
 * @param responseText The response text from the LLM
 * @returns True if the response appears to be truncated
 */
function checkForTruncatedResponse(responseText: string): boolean {
  // Check for incomplete JSON structure
  const openBraces = (responseText.match(/\{/g) || []).length;
  const closeBraces = (responseText.match(/\}/g) || []).length;
  const openBrackets = (responseText.match(/\[/g) || []).length;
  const closeBrackets = (responseText.match(/\]/g) || []).length;

  // Check if brackets/braces are unbalanced
  if (openBraces !== closeBraces || openBrackets !== closeBrackets) {
    return true;
  }

  // Check if the response ends with an incomplete object
  const trimmed = responseText.trim();
  if (trimmed.endsWith(",") || trimmed.endsWith("{") || trimmed.endsWith('"')) {
    return true;
  }

  // Check if the response doesn't end with a closing bracket
  if (!trimmed.endsWith("]")) {
    return true;
  }

  return false;
}

/**
 * Attempt to fix a truncated JSON response
 * @param responseText The truncated response text
 * @returns The fixed response text
 */
function fixTruncatedResponse(responseText: string): string {
  let fixed = responseText.trim();

  // Remove trailing comma if present
  if (fixed.endsWith(",")) {
    fixed = fixed.slice(0, -1);
  }

  // If it ends with an incomplete object, try to close it
  if (fixed.endsWith('"')) {
    // Find the last complete object
    const lastCompleteObject = fixed.lastIndexOf("},");
    if (lastCompleteObject !== -1) {
      fixed = fixed.substring(0, lastCompleteObject + 1);
    }
  }

  // If it ends with an incomplete object, try to close it
  if (fixed.endsWith("{")) {
    // Find the last complete object
    const lastCompleteObject = fixed.lastIndexOf("},");
    if (lastCompleteObject !== -1) {
      fixed = fixed.substring(0, lastCompleteObject + 1);
    }
  }

  // Ensure the response ends with a closing bracket
  if (!fixed.endsWith("]")) {
    // Count open brackets and add closing brackets as needed
    const openBrackets = (fixed.match(/\[/g) || []).length;
    const closeBrackets = (fixed.match(/\]/g) || []).length;
    const openBraces = (fixed.match(/\{/g) || []).length;
    const closeBraces = (fixed.match(/\}/g) || []).length;

    // Add missing closing braces first
    for (let i = 0; i < openBraces - closeBraces; i++) {
      fixed += "}";
    }

    // Then add missing closing brackets
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
      fixed += "]";
    }
  }

  return fixed;
}

/**
 * Parse a large menu by breaking it into chunks and processing each chunk
 * @param extractedText The full extracted text
 * @param restaurantId Restaurant ID
 * @param llmClient The LLM client instance
 * @returns Combined menu items from all chunks
 */
async function parseLargeMenuInChunks(
  extractedText: string,
  restaurantId: string,
  llmClient: LLMClient
): Promise<Omit<MenuItem, "itemId" | "createdAt" | "updatedAt">[]> {
  const chunkSize = 8000; // Characters per chunk
  const chunks: string[] = [];

  // Split text into chunks
  for (let i = 0; i < extractedText.length; i += chunkSize) {
    chunks.push(extractedText.substring(i, i + chunkSize));
  }

  console.log(`Processing large menu in ${chunks.length} chunks`);

  const allMenuItems: Omit<MenuItem, "itemId" | "createdAt" | "updatedAt">[] =
    [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(
      `Processing chunk ${i + 1}/${chunks.length} (${chunk.length} characters)`
    );

    const chunkPrompt = `Parse this portion of a restaurant menu into JSON format. Return ONLY a JSON array of objects with these fields: name, description, price (as number), category, ingredients (array), dietaryTags (array).

This is chunk ${i + 1} of ${chunks.length} from a larger menu.

Menu text:
${chunk}`;

    try {
      const response = await llmClient.complete({
        systemPrompt: "You are a JSON parser. Return only valid JSON arrays.",
        prompt: chunkPrompt,
        temperature: 0.1,
        maxTokens: 8000,
      });

      // Parse the chunk response
      const chunkResponse = response.text.trim();
      const isTruncated = checkForTruncatedResponse(chunkResponse);
      const fixedResponse = isTruncated
        ? fixTruncatedResponse(chunkResponse)
        : chunkResponse;

      const jsonMatch = fixedResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const chunkItems = JSON.parse(jsonMatch[0]);
        if (Array.isArray(chunkItems)) {
          // Convert chunk items to the required format
          const validChunkItems = chunkItems.map((item) => ({
            name: item.name || "",
            description: item.description || "",
            price:
              typeof item.price === "string"
                ? parseFloat(item.price.replace(/[^\d.]/g, ""))
                : item.price || 0,
            category: item.category || "Unknown",
            ingredients: Array.isArray(item.ingredients)
              ? item.ingredients
              : [],
            dietaryTags: Array.isArray(item.dietaryTags)
              ? item.dietaryTags
              : [],
            restaurantId,
            isActive: true,
            isAiGenerated: false,
          }));

          allMenuItems.push(...validChunkItems);
          console.log(
            `Successfully parsed ${validChunkItems.length} items from chunk ${
              i + 1
            }`
          );
        }
      }
    } catch (error) {
      console.error(`Error processing chunk ${i + 1}:`, error);
      // Continue with other chunks even if one fails
    }
  }

  console.log(`Total items parsed from all chunks: ${allMenuItems.length}`);
  return allMenuItems;
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
      model = process.env.LLM_MODEL || "claude-sonnet-4-20250514";
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
- Spicy (often indicated by chili symbols)

CRITICAL: You must respond with ONLY valid JSON. Do not include any explanatory text, markdown formatting, or other content outside the JSON array. The response must be parseable by JSON.parse().

IMPORTANT: If you reach the token limit, ensure you complete the current menu item and close the JSON array properly. Do not leave incomplete objects or unclosed brackets.`;

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
7. Ensure all strings are properly quoted and escaped
8. Do not include trailing commas in objects or arrays
9. Use only standard JSON syntax - no comments or extra formatting

RESPONSE FORMAT: Return ONLY a valid JSON array. Do not include any text before or after the JSON array. The response must start with '[' and end with ']'.

TOKEN LIMIT HANDLING: If you approach the token limit, complete the current menu item and properly close the JSON array with ']'. Do not leave incomplete objects or unclosed brackets.

Here's the extracted text:
${extractedText}
`;

  // Calculate appropriate token limits based on text length
  const textLength = extractedText.length;
  const estimatedTokens = Math.ceil(textLength / 4); // Rough estimate: 1 token ≈ 4 characters

  // Use higher token limits for larger menus, but cap at reasonable limits
  const maxTokens = Math.min(Math.max(estimatedTokens * 2, 8000), 15000);

  console.log(
    `Text length: ${textLength}, Estimated tokens: ${estimatedTokens}, Max tokens: ${maxTokens}`
  );

  // Call the LLM API
  console.log("Calling LLM API to parse menu text");
  console.log("system prompt", systemPrompt);
  console.log("prompt", prompt);

  let response;
  try {
    response = await llmClient.complete({
      systemPrompt,
      prompt,
      temperature: 0.1, // Lower temperature for more deterministic results
      maxTokens,
    });
  } catch (error) {
    console.error("First LLM call failed, trying with simplified prompt");

    // Fallback with a simpler, more direct prompt
    const fallbackPrompt = `Parse this menu text into JSON format. Return ONLY a JSON array of objects with these fields: name, description, price (as number), category, ingredients (array), dietaryTags (array).

Menu text:
${extractedText}`;

    response = await llmClient.complete({
      systemPrompt: "You are a JSON parser. Return only valid JSON arrays.",
      prompt: fallbackPrompt,
      temperature: 0.1,
      maxTokens,
    });
  }

  // Parse the LLM response into menu items
  try {
    console.log("Raw LLM response:", response.text);

    // Check for truncated response
    const isTruncated = checkForTruncatedResponse(response.text);
    if (isTruncated) {
      console.log("Detected truncated response, attempting to fix...");
      response.text = fixTruncatedResponse(response.text);
    }

    // Try multiple strategies to extract valid JSON
    let menuItems: any[] = [];
    let parseSuccess = false;

    // Strategy 1: Try to find JSON array with regex and parse directly
    const jsonMatch = response.text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        menuItems = JSON.parse(jsonMatch[0]);
        parseSuccess = true;
        console.log("Successfully parsed JSON using regex strategy");
      } catch (e) {
        console.log("Regex strategy failed, trying alternative approaches");
      }
    }

    // Strategy 2: Try to clean up common JSON issues and parse
    if (!parseSuccess) {
      try {
        // Remove any text before the first '[' and after the last ']'
        let cleanedText = response.text;
        const firstBracket = cleanedText.indexOf("[");
        const lastBracket = cleanedText.lastIndexOf("]");

        if (
          firstBracket !== -1 &&
          lastBracket !== -1 &&
          lastBracket > firstBracket
        ) {
          cleanedText = cleanedText.substring(firstBracket, lastBracket + 1);

          // Fix common JSON issues
          cleanedText = cleanedText
            .replace(/,\s*}/g, "}") // Remove trailing commas in objects
            .replace(/,\s*]/g, "]") // Remove trailing commas in arrays
            .replace(/([^\\])"/g, '$1"') // Ensure proper quote escaping
            .replace(/\n/g, "\\n") // Escape newlines in strings
            .replace(/\r/g, "\\r") // Escape carriage returns in strings
            .replace(/\t/g, "\\t"); // Escape tabs in strings

          menuItems = JSON.parse(cleanedText);
          parseSuccess = true;
          console.log("Successfully parsed JSON using cleanup strategy");
        }
      } catch (e) {
        console.log("Cleanup strategy failed, trying manual parsing");
      }
    }

    // Strategy 3: Manual parsing as last resort
    if (!parseSuccess) {
      try {
        // Extract menu items manually by looking for patterns
        const lines = response.text.split("\n");
        const extractedItems: any[] = [];

        for (const line of lines) {
          // Look for lines that might contain menu item information
          if (
            line.includes('"name"') ||
            line.includes('"price"') ||
            line.includes('"category"')
          ) {
            // Try to extract individual items
            const itemMatch = line.match(/\{[^}]*\}/);
            if (itemMatch) {
              try {
                const item = JSON.parse(itemMatch[0]);
                if (item.name && item.price !== undefined) {
                  extractedItems.push(item);
                }
              } catch (e) {
                // Skip this item if it can't be parsed
              }
            }
          }
        }

        if (extractedItems.length > 0) {
          menuItems = extractedItems;
          parseSuccess = true;
          console.log(
            `Successfully extracted ${extractedItems.length} items manually`
          );
        }
      } catch (e) {
        console.log("Manual parsing strategy failed");
      }
    }

    if (!parseSuccess || !Array.isArray(menuItems)) {
      // If parsing failed and the text is very long, try chunking
      if (extractedText.length > 10000) {
        console.log(
          "Parsing failed for large menu, attempting chunked processing..."
        );
        menuItems = await parseLargeMenuInChunks(
          extractedText,
          restaurantId,
          llmClient
        );
        parseSuccess = true;
      } else {
        throw new Error("Could not parse valid JSON array from LLM response");
      }
    }

    console.log(
      `Successfully parsed ${menuItems.length} menu items from LLM response`
    );

    // Validate that each item has the required structure
    menuItems = menuItems.filter((item) => {
      if (!item || typeof item !== "object") {
        console.log("Filtering out invalid item:", item);
        return false;
      }
      return true;
    });

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
    console.error("LLM response that failed to parse:", response.text);
    throw new Error(
      `Failed to parse menu structure from LLM response: ${error.message}`
    );
  }
}
