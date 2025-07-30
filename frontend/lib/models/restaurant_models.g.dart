// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'restaurant_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

Restaurant _$RestaurantFromJson(Map<String, dynamic> json) => Restaurant(
      restaurantId: json['restaurantId'] as String,
      ownerId: json['ownerId'] as String,
      name: json['name'] as String,
      city: json['city'] as String,
      state: json['state'] as String,
      qlooEntityId: json['qlooEntityId'] as String?,
      address: json['address'] as String?,
      priceLevel: (json['priceLevel'] as num?)?.toInt(),
      cuisine: json['cuisine'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      profileSetupComplete: json['profileSetupComplete'] as bool,
    );

Map<String, dynamic> _$RestaurantToJson(Restaurant instance) =>
    <String, dynamic>{
      'restaurantId': instance.restaurantId,
      'ownerId': instance.ownerId,
      'name': instance.name,
      'city': instance.city,
      'state': instance.state,
      'qlooEntityId': instance.qlooEntityId,
      'address': instance.address,
      'priceLevel': instance.priceLevel,
      'cuisine': instance.cuisine,
      'createdAt': instance.createdAt.toIso8601String(),
      'profileSetupComplete': instance.profileSetupComplete,
    };

RestaurantProfile _$RestaurantProfileFromJson(Map<String, dynamic> json) =>
    RestaurantProfile(
      name: json['name'] as String,
      city: json['city'] as String,
      state: json['state'] as String,
      ownerId: json['ownerId'] as String,
    );

Map<String, dynamic> _$RestaurantProfileToJson(RestaurantProfile instance) =>
    <String, dynamic>{
      'name': instance.name,
      'city': instance.city,
      'state': instance.state,
      'ownerId': instance.ownerId,
    };

RestaurantSetupResponse _$RestaurantSetupResponseFromJson(
        Map<String, dynamic> json) =>
    RestaurantSetupResponse(
      restaurant:
          Restaurant.fromJson(json['restaurant'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$RestaurantSetupResponseToJson(
        RestaurantSetupResponse instance) =>
    <String, dynamic>{
      'restaurant': instance.restaurant,
    };

QlooSearchResult _$QlooSearchResultFromJson(Map<String, dynamic> json) =>
    QlooSearchResult(
      name: json['name'] as String,
      entityId: json['entityId'] as String,
      address: json['address'] as String,
      priceLevel: (json['priceLevel'] as num).toInt(),
      cuisine: json['cuisine'] as String?,
      popularity: (json['popularity'] as num).toDouble(),
      description: json['description'] as String?,
      businessRating: (json['businessRating'] as num).toDouble(),
      specialtyDishes: (json['specialtyDishes'] as List<dynamic>)
          .map((e) => SpecialtyDishInfo.fromJson(e as Map<String, dynamic>))
          .toList(),
    );

Map<String, dynamic> _$QlooSearchResultToJson(QlooSearchResult instance) =>
    <String, dynamic>{
      'name': instance.name,
      'entityId': instance.entityId,
      'address': instance.address,
      'priceLevel': instance.priceLevel,
      'cuisine': instance.cuisine,
      'popularity': instance.popularity,
      'description': instance.description,
      'businessRating': instance.businessRating,
      'specialtyDishes': instance.specialtyDishes,
    };

SpecialtyDishInfo _$SpecialtyDishInfoFromJson(Map<String, dynamic> json) =>
    SpecialtyDishInfo(
      id: json['id'] as String,
      name: json['name'] as String,
      type: json['type'] as String,
      weight: (json['weight'] as num).toDouble(),
    );

Map<String, dynamic> _$SpecialtyDishInfoToJson(SpecialtyDishInfo instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'type': instance.type,
      'weight': instance.weight,
    };

QlooTag _$QlooTagFromJson(Map<String, dynamic> json) => QlooTag(
      name: json['name'] as String,
      tagId: json['tagId'] as String,
      type: json['type'] as String,
      value: json['value'] as String,
    );

Map<String, dynamic> _$QlooTagToJson(QlooTag instance) => <String, dynamic>{
      'name': instance.name,
      'tagId': instance.tagId,
      'type': instance.type,
      'value': instance.value,
    };

SimilarRestaurantData _$SimilarRestaurantDataFromJson(
        Map<String, dynamic> json) =>
    SimilarRestaurantData(
      restaurantId: json['restaurantId'] as String,
      qlooEntityId: json['qlooEntityId'] as String,
      similarRestaurants: (json['similarRestaurants'] as List<dynamic>)
          .map((e) => SimilarRestaurant.fromJson(e as Map<String, dynamic>))
          .toList(),
      specialtyDishes: (json['specialtyDishes'] as List<dynamic>)
          .map((e) => SpecialtyDish.fromJson(e as Map<String, dynamic>))
          .toList(),
      minRatingFilter: (json['minRatingFilter'] as num).toDouble(),
      retrievedAt: DateTime.parse(json['retrievedAt'] as String),
    );

Map<String, dynamic> _$SimilarRestaurantDataToJson(
        SimilarRestaurantData instance) =>
    <String, dynamic>{
      'restaurantId': instance.restaurantId,
      'qlooEntityId': instance.qlooEntityId,
      'similarRestaurants': instance.similarRestaurants,
      'specialtyDishes': instance.specialtyDishes,
      'minRatingFilter': instance.minRatingFilter,
      'retrievedAt': instance.retrievedAt.toIso8601String(),
    };

SimilarRestaurant _$SimilarRestaurantFromJson(Map<String, dynamic> json) =>
    SimilarRestaurant(
      name: json['name'] as String,
      entityId: json['entityId'] as String,
      address: json['address'] as String,
      businessRating: (json['businessRating'] as num).toDouble(),
      priceLevel: (json['priceLevel'] as num).toInt(),
      popularity: (json['popularity'] as num).toDouble(),
      specialtyDishes: (json['specialtyDishes'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
    );

Map<String, dynamic> _$SimilarRestaurantToJson(SimilarRestaurant instance) =>
    <String, dynamic>{
      'name': instance.name,
      'entityId': instance.entityId,
      'address': instance.address,
      'businessRating': instance.businessRating,
      'priceLevel': instance.priceLevel,
      'popularity': instance.popularity,
      'specialtyDishes': instance.specialtyDishes,
    };

SpecialtyDish _$SpecialtyDishFromJson(Map<String, dynamic> json) =>
    SpecialtyDish(
      dishName: json['dishName'] as String,
      tagId: json['tagId'] as String,
      restaurantCount: (json['restaurantCount'] as num).toInt(),
      popularity: (json['popularity'] as num).toDouble(),
      weight: (json['weight'] as num).toDouble(),
      totalWeight: (json['totalWeight'] as num).toDouble(),
    );

Map<String, dynamic> _$SpecialtyDishToJson(SpecialtyDish instance) =>
    <String, dynamic>{
      'dishName': instance.dishName,
      'tagId': instance.tagId,
      'restaurantCount': instance.restaurantCount,
      'popularity': instance.popularity,
      'weight': instance.weight,
      'totalWeight': instance.totalWeight,
    };

DemographicsData _$DemographicsDataFromJson(Map<String, dynamic> json) =>
    DemographicsData(
      restaurantId: json['restaurantId'] as String,
      qlooEntityId: json['qlooEntityId'] as String,
      ageGroups: (json['ageGroups'] as List<dynamic>)
          .map((e) => AgeGroupData.fromJson(e as Map<String, dynamic>))
          .toList(),
      genders: (json['genders'] as List<dynamic>)
          .map((e) => GenderData.fromJson(e as Map<String, dynamic>))
          .toList(),
      interests:
          (json['interests'] as List<dynamic>).map((e) => e as String).toList(),
      diningPatterns: (json['diningPatterns'] as List<dynamic>)
          .map((e) => DiningPattern.fromJson(e as Map<String, dynamic>))
          .toList(),
      retrievedAt: DateTime.parse(json['retrievedAt'] as String),
    );

Map<String, dynamic> _$DemographicsDataToJson(DemographicsData instance) =>
    <String, dynamic>{
      'restaurantId': instance.restaurantId,
      'qlooEntityId': instance.qlooEntityId,
      'ageGroups': instance.ageGroups,
      'genders': instance.genders,
      'interests': instance.interests,
      'diningPatterns': instance.diningPatterns,
      'retrievedAt': instance.retrievedAt.toIso8601String(),
    };

AgeGroupData _$AgeGroupDataFromJson(Map<String, dynamic> json) => AgeGroupData(
      ageRange: json['ageRange'] as String,
      percentage: (json['percentage'] as num).toDouble(),
      preferences: (json['preferences'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
    );

Map<String, dynamic> _$AgeGroupDataToJson(AgeGroupData instance) =>
    <String, dynamic>{
      'ageRange': instance.ageRange,
      'percentage': instance.percentage,
      'preferences': instance.preferences,
    };

GenderData _$GenderDataFromJson(Map<String, dynamic> json) => GenderData(
      gender: json['gender'] as String,
      percentage: (json['percentage'] as num).toDouble(),
      preferences: (json['preferences'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
    );

Map<String, dynamic> _$GenderDataToJson(GenderData instance) =>
    <String, dynamic>{
      'gender': instance.gender,
      'percentage': instance.percentage,
      'preferences': instance.preferences,
    };

DiningPattern _$DiningPatternFromJson(Map<String, dynamic> json) =>
    DiningPattern(
      pattern: json['pattern'] as String,
      frequency: (json['frequency'] as num).toDouble(),
      timeOfDay:
          (json['timeOfDay'] as List<dynamic>).map((e) => e as String).toList(),
    );

Map<String, dynamic> _$DiningPatternToJson(DiningPattern instance) =>
    <String, dynamic>{
      'pattern': instance.pattern,
      'frequency': instance.frequency,
      'timeOfDay': instance.timeOfDay,
    };

OptimizationOption _$OptimizationOptionFromJson(Map<String, dynamic> json) =>
    OptimizationOption(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      requirements: (json['requirements'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      available: json['available'] as bool,
      reason: json['reason'] as String?,
    );

Map<String, dynamic> _$OptimizationOptionToJson(OptimizationOption instance) =>
    <String, dynamic>{
      'id': instance.id,
      'title': instance.title,
      'description': instance.description,
      'requirements': instance.requirements,
      'available': instance.available,
      'reason': instance.reason,
    };

DemographicDisplay _$DemographicDisplayFromJson(Map<String, dynamic> json) =>
    DemographicDisplay(
      ageGroups: (json['ageGroups'] as List<dynamic>)
          .map((e) => AgeGroupDisplay.fromJson(e as Map<String, dynamic>))
          .toList(),
      genderGroups: (json['genderGroups'] as List<dynamic>)
          .map((e) => GenderGroupDisplay.fromJson(e as Map<String, dynamic>))
          .toList(),
      interests:
          (json['interests'] as List<dynamic>).map((e) => e as String).toList(),
      diningPatterns: (json['diningPatterns'] as List<dynamic>)
          .map((e) => DiningPatternDisplay.fromJson(e as Map<String, dynamic>))
          .toList(),
      interpretation: json['interpretation'] as String,
    );

Map<String, dynamic> _$DemographicDisplayToJson(DemographicDisplay instance) =>
    <String, dynamic>{
      'ageGroups': instance.ageGroups,
      'genderGroups': instance.genderGroups,
      'interests': instance.interests,
      'diningPatterns': instance.diningPatterns,
      'interpretation': instance.interpretation,
    };

AgeGroupDisplay _$AgeGroupDisplayFromJson(Map<String, dynamic> json) =>
    AgeGroupDisplay(
      ageRange: json['ageRange'] as String,
      percentage: (json['percentage'] as num).toDouble(),
      preferences: (json['preferences'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      interpretation: json['interpretation'] as String,
    );

Map<String, dynamic> _$AgeGroupDisplayToJson(AgeGroupDisplay instance) =>
    <String, dynamic>{
      'ageRange': instance.ageRange,
      'percentage': instance.percentage,
      'preferences': instance.preferences,
      'interpretation': instance.interpretation,
    };

GenderGroupDisplay _$GenderGroupDisplayFromJson(Map<String, dynamic> json) =>
    GenderGroupDisplay(
      gender: json['gender'] as String,
      percentage: (json['percentage'] as num).toDouble(),
      preferences: (json['preferences'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      interpretation: json['interpretation'] as String,
    );

Map<String, dynamic> _$GenderGroupDisplayToJson(GenderGroupDisplay instance) =>
    <String, dynamic>{
      'gender': instance.gender,
      'percentage': instance.percentage,
      'preferences': instance.preferences,
      'interpretation': instance.interpretation,
    };

DiningPatternDisplay _$DiningPatternDisplayFromJson(
        Map<String, dynamic> json) =>
    DiningPatternDisplay(
      pattern: json['pattern'] as String,
      frequency: (json['frequency'] as num).toDouble(),
      timeOfDay:
          (json['timeOfDay'] as List<dynamic>).map((e) => e as String).toList(),
      interpretation: json['interpretation'] as String,
    );

Map<String, dynamic> _$DiningPatternDisplayToJson(
        DiningPatternDisplay instance) =>
    <String, dynamic>{
      'pattern': instance.pattern,
      'frequency': instance.frequency,
      'timeOfDay': instance.timeOfDay,
      'interpretation': instance.interpretation,
    };

SpecialtyDishDisplay _$SpecialtyDishDisplayFromJson(
        Map<String, dynamic> json) =>
    SpecialtyDishDisplay(
      dishName: json['dishName'] as String,
      tagId: json['tagId'] as String,
      restaurantCount: (json['restaurantCount'] as num).toInt(),
      popularity: (json['popularity'] as num).toDouble(),
      weight: (json['weight'] as num?)?.toDouble(),
      totalWeight: (json['totalWeight'] as num?)?.toDouble(),
      tripAdvisorRating: (json['tripAdvisorRating'] as num?)?.toDouble(),
      restaurantName: json['restaurantName'] as String?,
      interpretation: json['interpretation'] as String,
    );

Map<String, dynamic> _$SpecialtyDishDisplayToJson(
        SpecialtyDishDisplay instance) =>
    <String, dynamic>{
      'dishName': instance.dishName,
      'tagId': instance.tagId,
      'restaurantCount': instance.restaurantCount,
      'popularity': instance.popularity,
      'weight': instance.weight,
      'totalWeight': instance.totalWeight,
      'tripAdvisorRating': instance.tripAdvisorRating,
      'restaurantName': instance.restaurantName,
      'interpretation': instance.interpretation,
    };

OptimizationReadiness _$OptimizationReadinessFromJson(
        Map<String, dynamic> json) =>
    OptimizationReadiness(
      menuItemCount: (json['menuItemCount'] as num).toInt(),
      specialtyDishCount: (json['specialtyDishCount'] as num).toInt(),
      hasAllRequiredData: json['hasAllRequiredData'] as bool,
    );

Map<String, dynamic> _$OptimizationReadinessToJson(
        OptimizationReadiness instance) =>
    <String, dynamic>{
      'menuItemCount': instance.menuItemCount,
      'specialtyDishCount': instance.specialtyDishCount,
      'hasAllRequiredData': instance.hasAllRequiredData,
    };

SelectedDemographics _$SelectedDemographicsFromJson(
        Map<String, dynamic> json) =>
    SelectedDemographics(
      selectedAgeGroups: (json['selectedAgeGroups'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      selectedGenderGroups: (json['selectedGenderGroups'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      selectedInterests: (json['selectedInterests'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
    );

Map<String, dynamic> _$SelectedDemographicsToJson(
        SelectedDemographics instance) =>
    <String, dynamic>{
      'selectedAgeGroups': instance.selectedAgeGroups,
      'selectedGenderGroups': instance.selectedGenderGroups,
      'selectedInterests': instance.selectedInterests,
    };
