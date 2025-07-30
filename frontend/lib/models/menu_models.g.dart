// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'menu_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

MenuItem _$MenuItemFromJson(Map<String, dynamic> json) => MenuItem(
      itemId: json['itemId'] as String,
      restaurantId: json['restaurantId'] as String,
      name: json['name'] as String,
      description: json['description'] as String,
      enhancedDescription: json['enhancedDescription'] as String?,
      price: (json['price'] as num).toDouble(),
      category: json['category'] as String,
      ingredients: (json['ingredients'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      dietaryTags: (json['dietaryTags'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      imageUrl: json['imageUrl'] as String?,
      qlooTasteProfile: json['qlooTasteProfile'] as Map<String, dynamic>?,
      llmGeneratedTags: (json['llmGeneratedTags'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList(),
      isActive: json['isActive'] as bool,
      isAiGenerated: json['isAiGenerated'] as bool,
    );

Map<String, dynamic> _$MenuItemToJson(MenuItem instance) => <String, dynamic>{
      'itemId': instance.itemId,
      'restaurantId': instance.restaurantId,
      'name': instance.name,
      'description': instance.description,
      'enhancedDescription': instance.enhancedDescription,
      'price': instance.price,
      'category': instance.category,
      'ingredients': instance.ingredients,
      'dietaryTags': instance.dietaryTags,
      'imageUrl': instance.imageUrl,
      'qlooTasteProfile': instance.qlooTasteProfile,
      'llmGeneratedTags': instance.llmGeneratedTags,
      'isActive': instance.isActive,
      'isAiGenerated': instance.isAiGenerated,
    };

OptimizedMenuItem _$OptimizedMenuItemFromJson(Map<String, dynamic> json) =>
    OptimizedMenuItem(
      itemId: json['itemId'] as String,
      originalName: json['originalName'] as String,
      optimizedName: json['optimizedName'] as String,
      originalDescription: json['originalDescription'] as String,
      optimizedDescription: json['optimizedDescription'] as String,
      optimizationReason: json['optimizationReason'] as String,
      demographicInsights: (json['demographicInsights'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      status: json['status'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );

Map<String, dynamic> _$OptimizedMenuItemToJson(OptimizedMenuItem instance) =>
    <String, dynamic>{
      'itemId': instance.itemId,
      'originalName': instance.originalName,
      'optimizedName': instance.optimizedName,
      'originalDescription': instance.originalDescription,
      'optimizedDescription': instance.optimizedDescription,
      'optimizationReason': instance.optimizationReason,
      'demographicInsights': instance.demographicInsights,
      'status': instance.status,
      'createdAt': instance.createdAt.toIso8601String(),
    };

MenuItemSuggestion _$MenuItemSuggestionFromJson(Map<String, dynamic> json) =>
    MenuItemSuggestion(
      suggestionId: json['suggestionId'] as String,
      restaurantId: json['restaurantId'] as String,
      name: json['name'] as String,
      description: json['description'] as String,
      estimatedPrice: (json['estimatedPrice'] as num).toDouble(),
      category: json['category'] as String,
      suggestedIngredients: (json['suggestedIngredients'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      dietaryTags: (json['dietaryTags'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      inspirationSource: json['inspirationSource'] as String,
      basedOnSpecialtyDish: json['basedOnSpecialtyDish'] as String?,
      qlooTasteProfile: json['qlooTasteProfile'] as Map<String, dynamic>?,
      status: json['status'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );

Map<String, dynamic> _$MenuItemSuggestionToJson(MenuItemSuggestion instance) =>
    <String, dynamic>{
      'suggestionId': instance.suggestionId,
      'restaurantId': instance.restaurantId,
      'name': instance.name,
      'description': instance.description,
      'estimatedPrice': instance.estimatedPrice,
      'category': instance.category,
      'suggestedIngredients': instance.suggestedIngredients,
      'dietaryTags': instance.dietaryTags,
      'inspirationSource': instance.inspirationSource,
      'basedOnSpecialtyDish': instance.basedOnSpecialtyDish,
      'qlooTasteProfile': instance.qlooTasteProfile,
      'status': instance.status,
      'createdAt': instance.createdAt.toIso8601String(),
    };

UploadResponse _$UploadResponseFromJson(Map<String, dynamic> json) =>
    UploadResponse(
      uploadId: json['uploadId'] as String,
      status: json['status'] as String,
      message: json['message'] as String?,
    );

Map<String, dynamic> _$UploadResponseToJson(UploadResponse instance) =>
    <String, dynamic>{
      'uploadId': instance.uploadId,
      'status': instance.status,
      'message': instance.message,
    };

ParseMenuResponse _$ParseMenuResponseFromJson(Map<String, dynamic> json) =>
    ParseMenuResponse(
      message: json['message'] as String,
      menuItems: (json['menuItems'] as List<dynamic>)
          .map((e) => MenuItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      itemCount: (json['itemCount'] as num).toInt(),
      nextStep: json['nextStep'] as String,
      optimizationOptionsAvailable:
          json['optimizationOptionsAvailable'] as bool,
      optimizationOptions: (json['optimizationOptions'] as List<dynamic>)
          .map((e) => OptimizationOption.fromJson(e as Map<String, dynamic>))
          .toList(),
    );

Map<String, dynamic> _$ParseMenuResponseToJson(ParseMenuResponse instance) =>
    <String, dynamic>{
      'message': instance.message,
      'menuItems': instance.menuItems,
      'itemCount': instance.itemCount,
      'nextStep': instance.nextStep,
      'optimizationOptionsAvailable': instance.optimizationOptionsAvailable,
      'optimizationOptions': instance.optimizationOptions,
    };

OptimizationReviewResponse _$OptimizationReviewResponseFromJson(
        Map<String, dynamic> json) =>
    OptimizationReviewResponse(
      restaurantId: json['restaurantId'] as String,
      type: json['type'] as String,
      pendingItems: json['pendingItems'] as List<dynamic>,
      approvedItems: json['approvedItems'] as List<dynamic>,
      rejectedItems: json['rejectedItems'] as List<dynamic>,
      updatedItem: json['updatedItem'],
      message: json['message'] as String?,
    );

Map<String, dynamic> _$OptimizationReviewResponseToJson(
        OptimizationReviewResponse instance) =>
    <String, dynamic>{
      'restaurantId': instance.restaurantId,
      'type': instance.type,
      'pendingItems': instance.pendingItems,
      'approvedItems': instance.approvedItems,
      'rejectedItems': instance.rejectedItems,
      'updatedItem': instance.updatedItem,
      'message': instance.message,
    };

OptimizationOptionsResponse _$OptimizationOptionsResponseFromJson(
        Map<String, dynamic> json) =>
    OptimizationOptionsResponse(
      restaurantId: json['restaurantId'] as String,
      optimizationOptions: (json['optimizationOptions'] as List<dynamic>)
          .map((e) => OptimizationOption.fromJson(e as Map<String, dynamic>))
          .toList(),
      demographicInformation: json['demographicInformation'] == null
          ? null
          : DemographicDisplay.fromJson(
              json['demographicInformation'] as Map<String, dynamic>),
      specialtyDishes: (json['specialtyDishes'] as List<dynamic>)
          .map((e) => SpecialtyDishDisplay.fromJson(e as Map<String, dynamic>))
          .toList(),
      readiness: OptimizationReadiness.fromJson(
          json['readiness'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$OptimizationOptionsResponseToJson(
        OptimizationOptionsResponse instance) =>
    <String, dynamic>{
      'restaurantId': instance.restaurantId,
      'optimizationOptions': instance.optimizationOptions,
      'demographicInformation': instance.demographicInformation,
      'specialtyDishes': instance.specialtyDishes,
      'readiness': instance.readiness,
    };

OptimizationSelectionResponse _$OptimizationSelectionResponseFromJson(
        Map<String, dynamic> json) =>
    OptimizationSelectionResponse(
      success: json['success'] as bool,
      restaurantId: json['restaurantId'] as String,
      selectedOption: json['selectedOption'] as String,
      nextEndpoint: json['nextEndpoint'] as String,
      nextAction: json['nextAction'] as String,
      requiredData: json['requiredData'] as Map<String, dynamic>,
      message: json['message'] as String,
    );

Map<String, dynamic> _$OptimizationSelectionResponseToJson(
        OptimizationSelectionResponse instance) =>
    <String, dynamic>{
      'success': instance.success,
      'restaurantId': instance.restaurantId,
      'selectedOption': instance.selectedOption,
      'nextEndpoint': instance.nextEndpoint,
      'nextAction': instance.nextAction,
      'requiredData': instance.requiredData,
      'message': instance.message,
    };
