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
      genreTags: (json['genreTags'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList(),
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
      'genreTags': instance.genreTags,
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
      tags: (json['tags'] as List<dynamic>)
          .map((e) => QlooTag.fromJson(e as Map<String, dynamic>))
          .toList(),
    );

Map<String, dynamic> _$QlooSearchResultToJson(QlooSearchResult instance) =>
    <String, dynamic>{
      'name': instance.name,
      'entityId': instance.entityId,
      'address': instance.address,
      'priceLevel': instance.priceLevel,
      'tags': instance.tags,
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

QlooRestaurantData _$QlooRestaurantDataFromJson(Map<String, dynamic> json) =>
    QlooRestaurantData(
      entityId: json['entityId'] as String,
      address: json['address'] as String,
      priceLevel: (json['priceLevel'] as num).toInt(),
      genreTags:
          (json['genreTags'] as List<dynamic>).map((e) => e as String).toList(),
    );

Map<String, dynamic> _$QlooRestaurantDataToJson(QlooRestaurantData instance) =>
    <String, dynamic>{
      'entityId': instance.entityId,
      'address': instance.address,
      'priceLevel': instance.priceLevel,
      'genreTags': instance.genreTags,
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
      'specialtyDishes': instance.specialtyDishes,
    };

SpecialtyDish _$SpecialtyDishFromJson(Map<String, dynamic> json) =>
    SpecialtyDish(
      dishName: json['dishName'] as String,
      tagId: json['tagId'] as String,
      restaurantCount: (json['restaurantCount'] as num).toInt(),
      popularity: (json['popularity'] as num).toDouble(),
    );

Map<String, dynamic> _$SpecialtyDishToJson(SpecialtyDish instance) =>
    <String, dynamic>{
      'dishName': instance.dishName,
      'tagId': instance.tagId,
      'restaurantCount': instance.restaurantCount,
      'popularity': instance.popularity,
    };

DemographicsData _$DemographicsDataFromJson(Map<String, dynamic> json) =>
    DemographicsData(
      restaurantId: json['restaurantId'] as String,
      qlooEntityId: json['qlooEntityId'] as String,
      ageGroups: (json['ageGroups'] as List<dynamic>)
          .map((e) => AgeGroupData.fromJson(e as Map<String, dynamic>))
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
