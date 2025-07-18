/**
 * Database models for the Restaurant Menu Optimizer
 * These models represent the structure of data stored in DynamoDB tables
 */

/**
 * Restaurant model representing a restaurant in the system
 */
export interface Restaurant {
  restaurantId: string; // PK
  name: string;
  cuisine: string;
  location: string;
  ownerId: string;
  createdAt: string;
  settings?: RestaurantSettings;
}

/**
 * Restaurant settings for customization and preferences
 */
export interface RestaurantSettings {
  targetDemographics?: Demographics;
  menuStyle?: string;
  priceRange?: PriceRange;
  optimizationPreferences?: OptimizationPreferences;
}

/**
 * Demographics information for targeting specific customer segments
 */
export interface Demographics {
  ageGroups?: string[];
  incomeLevel?: string;
  interests?: string[];
  dietaryPreferences?: string[];
}

/**
 * Price range enum for restaurant categorization
 */
export enum PriceRange {
  BUDGET = "$",
  MODERATE = "$$",
  UPSCALE = "$$$",
  LUXURY = "$$$$",
}

/**
 * Optimization preferences for menu enhancement
 */
export interface OptimizationPreferences {
  prioritizeProfit?: boolean;
  emphasizeLocalIngredients?: boolean;
  focusOnTrends?: boolean;
  highlightSignatureDishes?: boolean;
}

/**
 * MenuItem model representing a dish on a restaurant's menu
 */
export interface MenuItem {
  itemId: string; // PK
  restaurantId: string; // GSI
  name: string;
  description: string;
  enhancedDescription?: string; // LLM-generated description
  enhancedDescriptionStatus?: "pending" | "approved" | "rejected"; // Status of the enhanced description
  enhancedDescriptionHistory?: EnhancedDescriptionVersion[]; // History of enhanced descriptions
  price: number;
  category: string;
  ingredients: string[];
  dietaryTags: string[];
  imageUrl?: string;
  qlooTasteProfile?: any; // Will be replaced with proper type once Qloo API is integrated
  llmGeneratedTags?: string[]; // Additional tags from LLM analysis
  isActive: boolean;
  isAiGenerated: boolean; // Flag for AI-generated menu items
  createdAt: string;
  updatedAt: string;
}

/**
 * EnhancedDescriptionVersion for tracking history of enhanced descriptions
 */
export interface EnhancedDescriptionVersion {
  description: string;
  createdAt: string;
  enhancementStyle?: string;
  targetAudience?: string;
  llmProvider?: string;
}

/**
 * MenuAnalytics model for tracking performance metrics of menu items
 */
export interface MenuAnalytics {
  analyticsId: string; // PK
  restaurantId: string; // GSI
  itemId: string;
  popularityScore: number;
  profitabilityScore: number;
  recommendationScore: number;
  lastUpdated: string;
  trends: TrendData[];
}

/**
 * TrendData for tracking changes in metrics over time
 */
export interface TrendData {
  date: string;
  metric: string;
  value: number;
}

/**
 * LlmRecommendation model for storing AI-generated recommendations
 */
export interface LlmRecommendation {
  recommendationId: string; // PK
  restaurantId: string; // GSI
  targetCustomerSegment: string;
  recommendedItems: string[]; // Array of itemIds
  explanations: string[]; // Natural language explanations for recommendations
  createdAt: string;
  expiresAt: string;
}

/**
 * MenuItemSuggestion model for storing AI-generated menu item suggestions
 */
export interface MenuItemSuggestion {
  suggestionId: string; // PK
  restaurantId: string; // GSI
  name: string;
  description: string;
  estimatedPrice: number;
  category: string;
  suggestedIngredients: string[];
  dietaryTags: string[];
  inspirationSource: string; // e.g., "trending items", "seasonal", "fusion"
  qlooTasteProfile?: any; // Will be replaced with proper type once Qloo API is integrated
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

/**
 * MenuFile model for tracking uploaded menu files
 */
export interface MenuFile {
  fileId: string; // PK
  restaurantId: string; // GSI
  fileName: string;
  fileKey: string; // S3 object key
  fileType: string;
  fileSize: number;
  status: "pending" | "processed" | "failed";
  processingError?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Table names for DynamoDB tables
 * These are used to reference the tables in the code
 */
export const TableNames = {
  RESTAURANTS: process.env.STAGE + "-restaurants",
  MENU_ITEMS: process.env.STAGE + "-menu-items",
  ANALYTICS: process.env.STAGE + "-analytics",
  RECOMMENDATIONS: process.env.STAGE + "-recommendations",
  SUGGESTIONS: process.env.STAGE + "-suggestions",
  MENU_FILES: process.env.STAGE + "-menu-files",
};

/**
 * Index names for DynamoDB global secondary indexes
 */
export const IndexNames = {
  RESTAURANT_ID: "restaurantId-index",
};
