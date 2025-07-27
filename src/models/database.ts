/**
 * Database models for the Restaurant Menu Optimizer
 * These models represent the structure of data stored in DynamoDB tables
 */

/**
 * Restaurant model representing a restaurant in the system
 */
export interface Restaurant {
  restaurantId: string; // PK
  ownerId: string;
  name: string;
  city: string;
  state: string;
  qlooEntityId?: string;
  address?: string;
  priceLevel?: number;
  genreTags?: string[]; // e.g., ["urn:tag:genre:restaurant:mexican"]
  createdAt: string;
  profileSetupComplete: boolean;
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
  basedOnSpecialtyDish?: string; // Reference to specialty dish that inspired this suggestion
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
 * Qloo search result interface
 */
export interface QlooSearchResult {
  name: string;
  entityId: string;
  address: string;
  priceLevel: number;
  cuisine: string;
  // A percentile value that represents an entity's rank in terms of its signal
  // compared to all other entities within the same domain
  popularity: number;
  description: string;
  specialtyDishes: QlooTag[];
  businessRating: number;
  // tags: QlooTag[];
}

/**
 * Qloo tag interface
 */
export interface QlooTag {
  name: string;
  tag_id: string;
  type: string;
  value: string;
}

/**
 * Qloo restaurant data interface
 */
export interface QlooRestaurantData {
  entityId: string;
  address: string;
  priceLevel: number;
  genreTags: string[];
}

/**
 * Similar restaurant data model
 */
export interface SimilarRestaurantData {
  restaurantId: string; // PK
  qlooEntityId: string; // GSI
  similarRestaurants: SimilarRestaurant[];
  specialtyDishes: SpecialtyDish[];
  minRatingFilter: number;
  retrievedAt: string;
}

/**
 * Similar restaurant interface
 */
export interface SimilarRestaurant {
  name: string;
  entityId: string;
  address: string;
  businessRating: number;
  priceLevel: number;
  specialtyDishes: string[];
  keywords: KeywordData[];
}

/**
 * Specialty dish interface
 */
export interface SpecialtyDish {
  dishName: string;
  tagId: string; // urn:tag:specialty_dish:place:*
  restaurantCount: number;
  popularity: number;
}

/**
 * Keyword data interface
 */
export interface KeywordData {
  name: string;
  count: number;
}

/**
 * Demographics data model
 */
export interface DemographicsData {
  restaurantId: string; // PK
  qlooEntityId: string; // GSI
  ageGroups: AgeGroupData[];
  interests: string[];
  diningPatterns: DiningPattern[];
  retrievedAt: string;
}

/**
 * Age group data interface
 */
export interface AgeGroupData {
  ageRange: string;
  percentage: number;
  preferences: string[];
}

/**
 * Dining pattern interface
 */
export interface DiningPattern {
  pattern: string;
  frequency: number;
  timeOfDay: string[];
}

/**
 * Optimized menu item model
 */
export interface OptimizedMenuItem {
  itemId: string; // PK
  restaurantId: string; // GSI
  originalName: string;
  optimizedName: string;
  originalDescription: string;
  optimizedDescription: string;
  optimizationReason: string; // Explanation of why changes were made
  demographicInsights: string[]; // Insights used for optimization
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

/**
 * Table names for DynamoDB tables
 * These are used to reference the tables in the code
 */
export const TableNames = {
  RESTAURANTS: process.env.STAGE + "-restaurants",
  MENU_ITEMS: process.env.STAGE + "-menu-items",
  SIMILAR_RESTAURANT_DATA: process.env.STAGE + "-similar-restaurant-data",
  DEMOGRAPHICS_DATA: process.env.STAGE + "-demographics-data",
  OPTIMIZED_MENU_ITEMS: process.env.STAGE + "-optimized-menu-items",
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
  QLOO_ENTITY_ID: "qlooEntityId-index",
};
