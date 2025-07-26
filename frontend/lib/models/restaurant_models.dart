import 'package:json_annotation/json_annotation.dart';

part 'restaurant_models.g.dart';

@JsonSerializable()
class Restaurant {
  final String restaurantId;
  final String ownerId;
  final String name;
  final String city;
  final String state;
  final String? qlooEntityId;
  final String? address;
  final int? priceLevel;
  final List<String>? genreTags;
  final DateTime createdAt;
  final bool profileSetupComplete;
  
  Restaurant({
    required this.restaurantId,
    required this.ownerId,
    required this.name,
    required this.city,
    required this.state,
    this.qlooEntityId,
    this.address,
    this.priceLevel,
    this.genreTags,
    required this.createdAt,
    required this.profileSetupComplete,
  });
  
  Restaurant copyWith({
    String? restaurantId,
    String? ownerId,
    String? name,
    String? city,
    String? state,
    String? qlooEntityId,
    String? address,
    int? priceLevel,
    List<String>? genreTags,
    DateTime? createdAt,
    bool? profileSetupComplete,
  }) {
    return Restaurant(
      restaurantId: restaurantId ?? this.restaurantId,
      ownerId: ownerId ?? this.ownerId,
      name: name ?? this.name,
      city: city ?? this.city,
      state: state ?? this.state,
      qlooEntityId: qlooEntityId ?? this.qlooEntityId,
      address: address ?? this.address,
      priceLevel: priceLevel ?? this.priceLevel,
      genreTags: genreTags ?? this.genreTags,
      createdAt: createdAt ?? this.createdAt,
      profileSetupComplete: profileSetupComplete ?? this.profileSetupComplete,
    );
  }
  
  factory Restaurant.fromJson(Map<String, dynamic> json) => _$RestaurantFromJson(json);
  Map<String, dynamic> toJson() => _$RestaurantToJson(this);
}

@JsonSerializable()
class RestaurantProfile {
  final String name;
  final String city;
  final String state;
  final String ownerId;
  
  RestaurantProfile({
    required this.name,
    required this.city,
    required this.state,
    required this.ownerId,
  });
  
  factory RestaurantProfile.fromJson(Map<String, dynamic> json) => _$RestaurantProfileFromJson(json);
  Map<String, dynamic> toJson() => _$RestaurantProfileToJson(this);
}

@JsonSerializable()
class RestaurantSetupResponse {
  final Restaurant restaurant;
  
  RestaurantSetupResponse({
    required this.restaurant,
  });
  
  factory RestaurantSetupResponse.fromJson(Map<String, dynamic> json) => _$RestaurantSetupResponseFromJson(json);
  Map<String, dynamic> toJson() => _$RestaurantSetupResponseToJson(this);
}

@JsonSerializable()
class QlooSearchResult {
  final String name;
  final String entityId;
  final String address;
  final int priceLevel;
  final List<QlooTag> tags;
  
  QlooSearchResult({
    required this.name,
    required this.entityId,
    required this.address,
    required this.priceLevel,
    required this.tags,
  });
  
  factory QlooSearchResult.fromJson(Map<String, dynamic> json) => _$QlooSearchResultFromJson(json);
  Map<String, dynamic> toJson() => _$QlooSearchResultToJson(this);
}

@JsonSerializable()
class QlooTag {
  final String name;
  final String tagId;
  final String type;
  final String value;
  
  QlooTag({
    required this.name,
    required this.tagId,
    required this.type,
    required this.value,
  });
  
  factory QlooTag.fromJson(Map<String, dynamic> json) => _$QlooTagFromJson(json);
  Map<String, dynamic> toJson() => _$QlooTagToJson(this);
}

@JsonSerializable()
class QlooRestaurantData {
  final String entityId;
  final String address;
  final int priceLevel;
  final List<String> genreTags;
  
  QlooRestaurantData({
    required this.entityId,
    required this.address,
    required this.priceLevel,
    required this.genreTags,
  });
  
  factory QlooRestaurantData.fromJson(Map<String, dynamic> json) => _$QlooRestaurantDataFromJson(json);
  Map<String, dynamic> toJson() => _$QlooRestaurantDataToJson(this);
}

@JsonSerializable()
class SimilarRestaurantData {
  final String restaurantId;
  final String qlooEntityId;
  final List<SimilarRestaurant> similarRestaurants;
  final List<SpecialtyDish> specialtyDishes;
  final double minRatingFilter;
  final DateTime retrievedAt;
  
  SimilarRestaurantData({
    required this.restaurantId,
    required this.qlooEntityId,
    required this.similarRestaurants,
    required this.specialtyDishes,
    required this.minRatingFilter,
    required this.retrievedAt,
  });
  
  factory SimilarRestaurantData.fromJson(Map<String, dynamic> json) => _$SimilarRestaurantDataFromJson(json);
  Map<String, dynamic> toJson() => _$SimilarRestaurantDataToJson(this);
}

@JsonSerializable()
class SimilarRestaurant {
  final String name;
  final String entityId;
  final String address;
  final double businessRating;
  final int priceLevel;
  final List<String> specialtyDishes;
  
  SimilarRestaurant({
    required this.name,
    required this.entityId,
    required this.address,
    required this.businessRating,
    required this.priceLevel,
    required this.specialtyDishes,
  });
  
  factory SimilarRestaurant.fromJson(Map<String, dynamic> json) => _$SimilarRestaurantFromJson(json);
  Map<String, dynamic> toJson() => _$SimilarRestaurantToJson(this);
}

@JsonSerializable()
class SpecialtyDish {
  final String dishName;
  final String tagId;
  final int restaurantCount;
  final double popularity;
  
  SpecialtyDish({
    required this.dishName,
    required this.tagId,
    required this.restaurantCount,
    required this.popularity,
  });
  
  factory SpecialtyDish.fromJson(Map<String, dynamic> json) => _$SpecialtyDishFromJson(json);
  Map<String, dynamic> toJson() => _$SpecialtyDishToJson(this);
}

@JsonSerializable()
class DemographicsData {
  final String restaurantId;
  final String qlooEntityId;
  final List<AgeGroupData> ageGroups;
  final List<String> interests;
  final List<DiningPattern> diningPatterns;
  final DateTime retrievedAt;
  
  DemographicsData({
    required this.restaurantId,
    required this.qlooEntityId,
    required this.ageGroups,
    required this.interests,
    required this.diningPatterns,
    required this.retrievedAt,
  });
  
  factory DemographicsData.fromJson(Map<String, dynamic> json) => _$DemographicsDataFromJson(json);
  Map<String, dynamic> toJson() => _$DemographicsDataToJson(this);
}

@JsonSerializable()
class AgeGroupData {
  final String ageRange;
  final double percentage;
  final List<String> preferences;
  
  AgeGroupData({
    required this.ageRange,
    required this.percentage,
    required this.preferences,
  });
  
  factory AgeGroupData.fromJson(Map<String, dynamic> json) => _$AgeGroupDataFromJson(json);
  Map<String, dynamic> toJson() => _$AgeGroupDataToJson(this);
}

@JsonSerializable()
class DiningPattern {
  final String pattern;
  final double frequency;
  final List<String> timeOfDay;
  
  DiningPattern({
    required this.pattern,
    required this.frequency,
    required this.timeOfDay,
  });
  
  factory DiningPattern.fromJson(Map<String, dynamic> json) => _$DiningPatternFromJson(json);
  Map<String, dynamic> toJson() => _$DiningPatternToJson(this);
}