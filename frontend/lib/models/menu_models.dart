import 'package:json_annotation/json_annotation.dart';
import 'restaurant_models.dart';

part 'menu_models.g.dart';

@JsonSerializable()
class MenuItem {
  final String itemId;
  final String restaurantId;
  final String name;
  final String description;
  final String? enhancedName;
  final String? enhancedDescription;
  final double price;
  final String category;
  final List<String> ingredients;
  final List<String> dietaryTags;
  final String? imageUrl;
  final Map<String, dynamic>? qlooTasteProfile;
  final List<String>? llmGeneratedTags;
  final bool isActive;
  final bool isAiGenerated;

  MenuItem({
    required this.itemId,
    required this.restaurantId,
    required this.name,
    required this.description,
    this.enhancedName,
    this.enhancedDescription,
    required this.price,
    required this.category,
    required this.ingredients,
    required this.dietaryTags,
    this.imageUrl,
    this.qlooTasteProfile,
    this.llmGeneratedTags,
    required this.isActive,
    required this.isAiGenerated,
  });

  MenuItem copyWith({
    String? itemId,
    String? restaurantId,
    String? name,
    String? description,
    String? enhancedName,
    String? enhancedDescription,
    double? price,
    String? category,
    List<String>? ingredients,
    List<String>? dietaryTags,
    String? imageUrl,
    Map<String, dynamic>? qlooTasteProfile,
    List<String>? llmGeneratedTags,
    bool? isActive,
    bool? isAiGenerated,
  }) {
    return MenuItem(
      itemId: itemId ?? this.itemId,
      restaurantId: restaurantId ?? this.restaurantId,
      name: name ?? this.name,
      description: description ?? this.description,
      enhancedName: enhancedName ?? this.enhancedName,
      enhancedDescription: enhancedDescription ?? this.enhancedDescription,
      price: price ?? this.price,
      category: category ?? this.category,
      ingredients: ingredients ?? this.ingredients,
      dietaryTags: dietaryTags ?? this.dietaryTags,
      imageUrl: imageUrl ?? this.imageUrl,
      qlooTasteProfile: qlooTasteProfile ?? this.qlooTasteProfile,
      llmGeneratedTags: llmGeneratedTags ?? this.llmGeneratedTags,
      isActive: isActive ?? this.isActive,
      isAiGenerated: isAiGenerated ?? this.isAiGenerated,
    );
  }

  factory MenuItem.fromJson(Map<String, dynamic> json) =>
      _$MenuItemFromJson(json);
  Map<String, dynamic> toJson() => _$MenuItemToJson(this);
}

@JsonSerializable()
class OptimizedMenuItem {
  final String itemId;
  final String originalName;
  final String optimizedName;
  final String originalDescription;
  final String optimizedDescription;
  final String optimizationReason;
  final List<String> demographicInsights;
  final String status;
  final DateTime createdAt;

  OptimizedMenuItem({
    required this.itemId,
    required this.originalName,
    required this.optimizedName,
    required this.originalDescription,
    required this.optimizedDescription,
    required this.optimizationReason,
    required this.demographicInsights,
    required this.status,
    required this.createdAt,
  });

  OptimizedMenuItem copyWith({
    String? itemId,
    String? originalName,
    String? optimizedName,
    String? originalDescription,
    String? optimizedDescription,
    String? optimizationReason,
    List<String>? demographicInsights,
    String? status,
    DateTime? createdAt,
  }) {
    return OptimizedMenuItem(
      itemId: itemId ?? this.itemId,
      originalName: originalName ?? this.originalName,
      optimizedName: optimizedName ?? this.optimizedName,
      originalDescription: originalDescription ?? this.originalDescription,
      optimizedDescription: optimizedDescription ?? this.optimizedDescription,
      optimizationReason: optimizationReason ?? this.optimizationReason,
      demographicInsights: demographicInsights ?? this.demographicInsights,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  factory OptimizedMenuItem.fromJson(Map<String, dynamic> json) =>
      _$OptimizedMenuItemFromJson(json);
  Map<String, dynamic> toJson() => _$OptimizedMenuItemToJson(this);
}

@JsonSerializable()
class MenuItemSuggestion {
  final String suggestionId;
  final String restaurantId;
  final String name;
  final String description;
  final double estimatedPrice;
  final String category;
  final List<String> suggestedIngredients;
  final List<String> dietaryTags;
  final String inspirationSource;
  final String? basedOnSpecialtyDish;
  final Map<String, dynamic>? qlooTasteProfile;
  final String status;
  final DateTime createdAt;

  MenuItemSuggestion({
    required this.suggestionId,
    required this.restaurantId,
    required this.name,
    required this.description,
    required this.estimatedPrice,
    required this.category,
    required this.suggestedIngredients,
    required this.dietaryTags,
    required this.inspirationSource,
    this.basedOnSpecialtyDish,
    this.qlooTasteProfile,
    required this.status,
    required this.createdAt,
  });

  MenuItemSuggestion copyWith({
    String? suggestionId,
    String? restaurantId,
    String? name,
    String? description,
    double? estimatedPrice,
    String? category,
    List<String>? suggestedIngredients,
    List<String>? dietaryTags,
    String? inspirationSource,
    String? basedOnSpecialtyDish,
    Map<String, dynamic>? qlooTasteProfile,
    String? status,
    DateTime? createdAt,
  }) {
    return MenuItemSuggestion(
      suggestionId: suggestionId ?? this.suggestionId,
      restaurantId: restaurantId ?? this.restaurantId,
      name: name ?? this.name,
      description: description ?? this.description,
      estimatedPrice: estimatedPrice ?? this.estimatedPrice,
      category: category ?? this.category,
      suggestedIngredients: suggestedIngredients ?? this.suggestedIngredients,
      dietaryTags: dietaryTags ?? this.dietaryTags,
      inspirationSource: inspirationSource ?? this.inspirationSource,
      basedOnSpecialtyDish: basedOnSpecialtyDish ?? this.basedOnSpecialtyDish,
      qlooTasteProfile: qlooTasteProfile ?? this.qlooTasteProfile,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  factory MenuItemSuggestion.fromJson(Map<String, dynamic> json) =>
      _$MenuItemSuggestionFromJson(json);
  Map<String, dynamic> toJson() => _$MenuItemSuggestionToJson(this);
}

@JsonSerializable()
class UploadResponse {
  final String fileId;
  final String fileKey;
  final String fileType;
  final String status;
  final String? message;

  UploadResponse({
    required this.fileId,
    required this.status,
    required this.fileKey,
    required this.fileType,
    this.message,
  });

  factory UploadResponse.fromJson(Map<String, dynamic> json) =>
      _$UploadResponseFromJson(json);
  Map<String, dynamic> toJson() => _$UploadResponseToJson(this);
}

@JsonSerializable()
class ParseMenuResponse {
  final String message;
  final List<MenuItem> menuItems;
  final int itemCount;
  final String nextStep;
  final bool optimizationOptionsAvailable;
  final List<OptimizationOption> optimizationOptions;

  ParseMenuResponse({
    required this.message,
    required this.menuItems,
    required this.itemCount,
    required this.nextStep,
    required this.optimizationOptionsAvailable,
    required this.optimizationOptions,
  });

  factory ParseMenuResponse.fromJson(Map<String, dynamic> json) =>
      _$ParseMenuResponseFromJson(json);
  Map<String, dynamic> toJson() => _$ParseMenuResponseToJson(this);
}

@JsonSerializable()
class OptimizationReviewResponse {
  final String restaurantId;
  final String type;
  final List<dynamic>
      pendingItems; // Can be OptimizedMenuItem or MenuItemSuggestion
  final List<dynamic>
      approvedItems; // Can be OptimizedMenuItem or MenuItemSuggestion
  final List<dynamic>
      rejectedItems; // Can be OptimizedMenuItem or MenuItemSuggestion
  final dynamic updatedItem; // Can be OptimizedMenuItem or MenuItemSuggestion
  final String? message;

  OptimizationReviewResponse({
    required this.restaurantId,
    required this.type,
    required this.pendingItems,
    required this.approvedItems,
    required this.rejectedItems,
    this.updatedItem,
    this.message,
  });

  factory OptimizationReviewResponse.fromJson(Map<String, dynamic> json) =>
      _$OptimizationReviewResponseFromJson(json);
  Map<String, dynamic> toJson() => _$OptimizationReviewResponseToJson(this);
}

@JsonSerializable()
class OptimizationOptionsResponse {
  final String restaurantId;
  final List<OptimizationOption> optimizationOptions;
  final DemographicDisplay? demographicInformation;
  final List<SpecialtyDishDisplay> specialtyDishes;
  final OptimizationReadiness readiness;
  final String? cuisine;

  OptimizationOptionsResponse({
    required this.restaurantId,
    required this.optimizationOptions,
    this.demographicInformation,
    required this.specialtyDishes,
    required this.readiness,
    required this.cuisine,
  });

  factory OptimizationOptionsResponse.fromJson(Map<String, dynamic> json) =>
      _$OptimizationOptionsResponseFromJson(json);
  Map<String, dynamic> toJson() => _$OptimizationOptionsResponseToJson(this);
}

@JsonSerializable()
class OptimizationSelectionResponse {
  final bool success;
  final String restaurantId;
  final String selectedOption;
  final String nextEndpoint;
  final String nextAction;
  final Map<String, dynamic> requiredData;
  final String message;

  OptimizationSelectionResponse({
    required this.success,
    required this.restaurantId,
    required this.selectedOption,
    required this.nextEndpoint,
    required this.nextAction,
    required this.requiredData,
    required this.message,
  });

  factory OptimizationSelectionResponse.fromJson(Map<String, dynamic> json) =>
      _$OptimizationSelectionResponseFromJson(json);
  Map<String, dynamic> toJson() => _$OptimizationSelectionResponseToJson(this);
}
