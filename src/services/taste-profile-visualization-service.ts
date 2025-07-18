/**
 * Taste Profile Visualization Service
 *
 * This service processes raw taste profiles from Qloo API into visualization-friendly formats,
 * provides comparison functionality, and generates taste profile summaries.
 */

import { TasteProfile } from "./qloo-client";
import { MenuItem } from "../models/database";

/**
 * Visualization data for taste profiles
 */
export interface TasteProfileVisualizationData {
  itemId: string;
  name: string;
  restaurantId: string;
  // Radar chart data (normalized taste attributes)
  radarChartData: {
    attributes: string[];
    values: number[];
  };
  // Bar chart data for demographic appeal
  demographicAppealData?: {
    demographics: string[];
    values: number[];
  };
  // Compatibility data for dietary preferences
  dietaryCompatibilityData?: {
    dietaryTypes: string[];
    values: number[];
  };
  // Appeal factors data
  appealFactorsData?: {
    factors: string[];
    values: number[];
  };
  // Recommended pairings
  pairings?: string[];
  // Summary text description
  summary: string;
  // Timestamp of visualization data generation
  generatedAt: string;
}

/**
 * Comparison result between two taste profiles
 */
export interface TasteProfileComparison {
  // Basic information
  item1Id: string;
  item1Name: string;
  item2Id: string;
  item2Name: string;

  // Similarity score (0-1)
  similarityScore: number;

  // Attribute comparison
  attributeComparison: {
    attribute: string;
    item1Value: number;
    item2Value: number;
    difference: number;
  }[];

  // Key differences (text descriptions)
  keyDifferences: string[];

  // Complementary score (how well they complement each other)
  complementaryScore: number;

  // Timestamp of comparison generation
  generatedAt: string;
}

/**
 * Taste profile summary
 */
export interface TasteProfileSummary {
  itemId: string;
  name: string;
  // Short summary (1-2 sentences)
  shortSummary: string;
  // Detailed summary (paragraph)
  detailedSummary: string;
  // Key attributes (top 3-5 taste attributes)
  keyAttributes: {
    attribute: string;
    value: number;
  }[];
  // Primary appeal (e.g., "Popular with young adults", "Comfort food")
  primaryAppeal: string;
  // Timestamp of summary generation
  generatedAt: string;
}

export class TasteProfileVisualizationService {
  /**
   * Process a raw taste profile into visualization-friendly format
   *
   * @param menuItem Menu item with taste profile
   * @returns Visualization data for the taste profile
   */
  processForVisualization(menuItem: MenuItem): TasteProfileVisualizationData {
    if (!menuItem.qlooTasteProfile) {
      throw new Error(
        `Menu item ${menuItem.itemId} does not have a taste profile`
      );
    }

    const tasteProfile = menuItem.qlooTasteProfile as TasteProfile;
    const now = new Date().toISOString();

    // Process taste attributes for radar chart
    const tasteAttributes = tasteProfile.tasteAttributes || {};
    const attributes = Object.keys(tasteAttributes);
    const values = attributes.map((attr) => tasteAttributes[attr]);

    // Create visualization data
    const visualizationData: TasteProfileVisualizationData = {
      itemId: menuItem.itemId,
      name: menuItem.name,
      restaurantId: menuItem.restaurantId,
      radarChartData: {
        attributes,
        values,
      },
      summary: this.generateShortSummary(menuItem, tasteProfile),
      generatedAt: now,
    };

    // Add demographic appeal data if available
    if (tasteProfile.demographicAppeal) {
      const demographics = Object.keys(tasteProfile.demographicAppeal);
      visualizationData.demographicAppealData = {
        demographics,
        values: demographics.map(
          (demo) => tasteProfile.demographicAppeal![demo]
        ),
      };
    }

    // Add dietary compatibility data if available
    if (tasteProfile.dietaryCompatibility) {
      const dietaryTypes = Object.keys(tasteProfile.dietaryCompatibility);
      visualizationData.dietaryCompatibilityData = {
        dietaryTypes,
        values: dietaryTypes.map(
          (type) => tasteProfile.dietaryCompatibility![type]
        ),
      };
    }

    // Add appeal factors data if available
    if (tasteProfile.appealFactors) {
      const factors = Object.keys(tasteProfile.appealFactors);
      visualizationData.appealFactorsData = {
        factors,
        values: factors.map((factor) => tasteProfile.appealFactors![factor]),
      };
    }

    // Add pairings if available
    if (tasteProfile.pairings) {
      visualizationData.pairings = tasteProfile.pairings;
    }

    return visualizationData;
  }

  /**
   * Compare two taste profiles and generate comparison data
   *
   * @param menuItem1 First menu item with taste profile
   * @param menuItem2 Second menu item with taste profile
   * @returns Comparison data between the two taste profiles
   */
  compareTasteProfiles(
    menuItem1: MenuItem,
    menuItem2: MenuItem
  ): TasteProfileComparison {
    if (!menuItem1.qlooTasteProfile || !menuItem2.qlooTasteProfile) {
      throw new Error(
        "Both menu items must have taste profiles for comparison"
      );
    }

    const profile1 = menuItem1.qlooTasteProfile as TasteProfile;
    const profile2 = menuItem2.qlooTasteProfile as TasteProfile;
    const now = new Date().toISOString();

    // Get all unique attributes from both profiles
    const allAttributes = new Set([
      ...Object.keys(profile1.tasteAttributes || {}),
      ...Object.keys(profile2.tasteAttributes || {}),
    ]);

    // Calculate attribute comparison
    const attributeComparison = Array.from(allAttributes).map((attribute) => {
      const item1Value = profile1.tasteAttributes?.[attribute] || 0;
      const item2Value = profile2.tasteAttributes?.[attribute] || 0;
      const difference = item1Value - item2Value;

      return {
        attribute,
        item1Value,
        item2Value,
        difference,
      };
    });

    // Calculate similarity score (cosine similarity)
    const similarityScore = this.calculateSimilarityScore(
      profile1.tasteAttributes || {},
      profile2.tasteAttributes || {}
    );

    // Generate key differences
    const keyDifferences = this.generateKeyDifferences(
      attributeComparison,
      menuItem1.name,
      menuItem2.name
    );

    // Calculate complementary score
    const complementaryScore = this.calculateComplementaryScore(
      profile1,
      profile2
    );

    return {
      item1Id: menuItem1.itemId,
      item1Name: menuItem1.name,
      item2Id: menuItem2.itemId,
      item2Name: menuItem2.name,
      similarityScore,
      attributeComparison,
      keyDifferences,
      complementaryScore,
      generatedAt: now,
    };
  }

  /**
   * Generate a comprehensive taste profile summary
   *
   * @param menuItem Menu item with taste profile
   * @returns Taste profile summary
   */
  generateTasteProfileSummary(menuItem: MenuItem): TasteProfileSummary {
    if (!menuItem.qlooTasteProfile) {
      throw new Error(
        `Menu item ${menuItem.itemId} does not have a taste profile`
      );
    }

    const tasteProfile = menuItem.qlooTasteProfile as TasteProfile;
    const now = new Date().toISOString();

    // Get top attributes (sorted by value)
    const tasteAttributes = tasteProfile.tasteAttributes || {};
    const sortedAttributes = Object.entries(tasteAttributes)
      .sort(([, valueA], [, valueB]) => valueB - valueA)
      .slice(0, 5)
      .map(([attribute, value]) => ({ attribute, value }));

    // Determine primary appeal based on demographic appeal or appeal factors
    let primaryAppeal = "General appeal";
    if (tasteProfile.demographicAppeal) {
      const topDemographic = Object.entries(
        tasteProfile.demographicAppeal
      ).sort(([, valueA], [, valueB]) => valueB - valueA)[0];
      if (topDemographic) {
        primaryAppeal = `Popular with ${this.formatDemographic(
          topDemographic[0]
        )}`;
      }
    } else if (tasteProfile.appealFactors) {
      const topFactor = Object.entries(tasteProfile.appealFactors).sort(
        ([, valueA], [, valueB]) => valueB - valueA
      )[0];
      if (topFactor) {
        primaryAppeal = `High ${topFactor[0]} appeal`;
      }
    }

    // Generate short summary
    const shortSummary = this.generateShortSummary(menuItem, tasteProfile);

    // Generate detailed summary
    const detailedSummary = this.generateDetailedSummary(
      menuItem,
      tasteProfile
    );

    return {
      itemId: menuItem.itemId,
      name: menuItem.name,
      shortSummary,
      detailedSummary,
      keyAttributes: sortedAttributes,
      primaryAppeal,
      generatedAt: now,
    };
  }

  /**
   * Generate a short summary of a taste profile
   *
   * @param menuItem Menu item
   * @param tasteProfile Taste profile
   * @returns Short summary text
   */
  private generateShortSummary(
    menuItem: MenuItem,
    tasteProfile: TasteProfile
  ): string {
    const tasteAttributes = tasteProfile.tasteAttributes || {};

    // Get top 2 taste attributes
    const topAttributes = Object.entries(tasteAttributes)
      .sort(([, valueA], [, valueB]) => valueB - valueA)
      .slice(0, 2)
      .map(([attr]) => attr);

    if (topAttributes.length === 0) {
      return `${menuItem.name} has a balanced taste profile.`;
    }

    if (topAttributes.length === 1) {
      return `${menuItem.name} has a predominantly ${topAttributes[0]} flavor profile.`;
    }

    return `${menuItem.name} combines ${topAttributes[0]} and ${topAttributes[1]} flavors.`;
  }

  /**
   * Generate a detailed summary of a taste profile
   *
   * @param menuItem Menu item
   * @param tasteProfile Taste profile
   * @returns Detailed summary text
   */
  private generateDetailedSummary(
    menuItem: MenuItem,
    tasteProfile: TasteProfile
  ): string {
    const tasteAttributes = tasteProfile.tasteAttributes || {};

    // Get top 3 taste attributes
    const topAttributes = Object.entries(tasteAttributes)
      .sort(([, valueA], [, valueB]) => valueB - valueA)
      .slice(0, 3)
      .map(([attr, value]) => ({ attr, value }));

    let summary = `${menuItem.name} features `;

    if (topAttributes.length > 0) {
      const attributeDescriptions = topAttributes.map(({ attr, value }) => {
        const intensity = this.getIntensityDescription(value);
        return `${intensity} ${attr}`;
      });

      if (attributeDescriptions.length === 1) {
        summary += `a ${attributeDescriptions[0]} profile`;
      } else if (attributeDescriptions.length === 2) {
        summary += `${attributeDescriptions[0]} and ${attributeDescriptions[1]} notes`;
      } else {
        const lastAttr = attributeDescriptions.pop();
        summary += `${attributeDescriptions.join(
          ", "
        )}, and ${lastAttr} characteristics`;
      }
    } else {
      summary += "a balanced flavor profile";
    }

    // Add demographic appeal if available
    if (tasteProfile.demographicAppeal) {
      const topDemographic = Object.entries(
        tasteProfile.demographicAppeal
      ).sort(([, valueA], [, valueB]) => valueB - valueA)[0];

      if (topDemographic && topDemographic[1] > 0.6) {
        summary += `. It particularly appeals to ${this.formatDemographic(
          topDemographic[0]
        )}`;
      }
    }

    // Add dietary compatibility if available
    if (tasteProfile.dietaryCompatibility) {
      const compatibilities = Object.entries(tasteProfile.dietaryCompatibility)
        .filter(([, value]) => value > 0.8)
        .map(([diet]) => this.formatDietaryPreference(diet));

      if (compatibilities.length > 0) {
        summary += `. This dish is suitable for ${compatibilities.join(
          " and "
        )} diets`;
      }
    }

    // Add pairings if available
    if (tasteProfile.pairings && tasteProfile.pairings.length > 0) {
      const pairings = tasteProfile.pairings.slice(0, 2);
      summary += `. Pairs well with ${pairings.join(" and ")}`;
    }

    return summary + ".";
  }

  /**
   * Calculate similarity score between two taste attribute sets
   *
   * @param attributes1 First set of taste attributes
   * @param attributes2 Second set of taste attributes
   * @returns Similarity score (0-1)
   */
  private calculateSimilarityScore(
    attributes1: Record<string, number>,
    attributes2: Record<string, number>
  ): number {
    // Get all unique attributes
    const allAttributes = new Set([
      ...Object.keys(attributes1),
      ...Object.keys(attributes2),
    ]);

    if (allAttributes.size === 0) {
      return 0;
    }

    // Calculate dot product
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    allAttributes.forEach((attr) => {
      const val1 = attributes1[attr] || 0;
      const val2 = attributes2[attr] || 0;

      dotProduct += val1 * val2;
      magnitude1 += val1 * val1;
      magnitude2 += val2 * val2;
    });

    // Calculate cosine similarity
    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2));
  }

  /**
   * Calculate complementary score between two taste profiles
   *
   * @param profile1 First taste profile
   * @param profile2 Second taste profile
   * @returns Complementary score (0-1)
   */
  private calculateComplementaryScore(
    profile1: TasteProfile,
    profile2: TasteProfile
  ): number {
    // This is a simplified implementation
    // A more sophisticated version would consider culinary principles
    // of complementary flavors (e.g., sweet pairs well with sour)

    const attributes1 = profile1.tasteAttributes || {};
    const attributes2 = profile2.tasteAttributes || {};

    // Get all unique attributes
    const allAttributes = new Set([
      ...Object.keys(attributes1),
      ...Object.keys(attributes2),
    ]);

    if (allAttributes.size === 0) {
      return 0;
    }

    // Calculate complementary score based on attribute balance
    let complementaryScore = 0;
    let count = 0;

    allAttributes.forEach((attr) => {
      const val1 = attributes1[attr] || 0;
      const val2 = attributes2[attr] || 0;

      // Items with different strengths in different attributes
      // are considered more complementary
      const diff = Math.abs(val1 - val2);
      complementaryScore += diff;
      count++;
    });

    // Normalize score
    return count > 0 ? complementaryScore / count : 0;
  }

  /**
   * Generate key differences between two taste profiles
   *
   * @param attributeComparison Attribute comparison data
   * @param item1Name Name of first item
   * @param item2Name Name of second item
   * @returns Array of key difference descriptions
   */
  private generateKeyDifferences(
    attributeComparison: {
      attribute: string;
      item1Value: number;
      item2Value: number;
      difference: number;
    }[],
    item1Name: string,
    item2Name: string
  ): string[] {
    // Sort by absolute difference
    const sortedComparisons = [...attributeComparison]
      .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))
      .slice(0, 3);

    return sortedComparisons.map((comp) => {
      const { attribute, item1Value, item2Value, difference } = comp;

      if (difference > 0.3) {
        return `${item1Name} is significantly more ${attribute} than ${item2Name}`;
      } else if (difference < -0.3) {
        return `${item2Name} is significantly more ${attribute} than ${item1Name}`;
      } else if (difference > 0.1) {
        return `${item1Name} is slightly more ${attribute} than ${item2Name}`;
      } else if (difference < -0.1) {
        return `${item2Name} is slightly more ${attribute} than ${item1Name}`;
      } else {
        return `${item1Name} and ${item2Name} have similar ${attribute} levels`;
      }
    });
  }

  /**
   * Get intensity description based on value
   *
   * @param value Attribute value (0-1)
   * @returns Intensity description
   */
  private getIntensityDescription(value: number): string {
    if (value >= 0.8) return "dominant";
    if (value >= 0.6) return "strong";
    if (value >= 0.4) return "moderate";
    if (value >= 0.2) return "subtle";
    return "hint of";
  }

  /**
   * Format demographic key for human-readable output
   *
   * @param demographic Demographic key
   * @returns Formatted demographic string
   */
  private formatDemographic(demographic: string): string {
    // Convert camelCase or snake_case to readable format
    const formatted = demographic
      .replace(/([A-Z])/g, " $1")
      .replace(/_/g, " ")
      .toLowerCase();

    return formatted;
  }

  /**
   * Format dietary preference key for human-readable output
   *
   * @param diet Dietary preference key
   * @returns Formatted dietary preference string
   */
  private formatDietaryPreference(diet: string): string {
    // Convert camelCase or snake_case to readable format
    const formatted = diet
      .replace(/([A-Z])/g, " $1")
      .replace(/_/g, " ")
      .toLowerCase();

    return formatted;
  }
}
