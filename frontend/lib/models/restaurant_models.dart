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
  final String? cuisine;
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
    this.cuisine,
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
    String? cuisine,
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
      cuisine: cuisine ?? this.cuisine,
      createdAt: createdAt ?? this.createdAt,
      profileSetupComplete: profileSetupComplete ?? this.profileSetupComplete,
    );
  }

  factory Restaurant.fromJson(Map<String, dynamic> json) =>
      _$RestaurantFromJson(json);
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

  factory RestaurantProfile.fromJson(Map<String, dynamic> json) =>
      _$RestaurantProfileFromJson(json);
  Map<String, dynamic> toJson() => _$RestaurantProfileToJson(this);
}

@JsonSerializable()
class RestaurantSetupResponse {
  final Restaurant restaurant;

  RestaurantSetupResponse({
    required this.restaurant,
  });

  factory RestaurantSetupResponse.fromJson(Map<String, dynamic> json) =>
      _$RestaurantSetupResponseFromJson(json);
  Map<String, dynamic> toJson() => _$RestaurantSetupResponseToJson(this);
}

@JsonSerializable()
class QlooSearchResult {
  final String name;
  final String entityId;
  final String address;
  final int priceLevel;
  final String? cuisine;
  final double popularity;
  final String? description;
  final double businessRating;
  final List<SpecialtyDishInfo> specialtyDishes;

  QlooSearchResult({
    required this.name,
    required this.entityId,
    required this.address,
    required this.priceLevel,
    this.cuisine,
    required this.popularity,
    this.description,
    required this.businessRating,
    required this.specialtyDishes,
  });

  factory QlooSearchResult.fromJson(Map<String, dynamic> json) {
    try {
      return _$QlooSearchResultFromJson(json);
    } catch (e) {
      // Handle potential null values in numeric fields
      return QlooSearchResult(
        name: json['name'] as String? ?? '',
        entityId: json['entityId'] as String? ?? '',
        address: json['address'] as String? ?? '',
        priceLevel: (json['priceLevel'] as num?)?.toInt() ?? 0,
        cuisine: json['cuisine'] as String?,
        popularity: (json['popularity'] as num?)?.toDouble() ?? 0.0,
        description: json['description'] as String?,
        businessRating: (json['businessRating'] as num?)?.toDouble() ?? 0.0,
        specialtyDishes: (json['specialtyDishes'] as List<dynamic>?)
                ?.map((e) =>
                    SpecialtyDishInfo.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
      );
    }
  }
  Map<String, dynamic> toJson() => _$QlooSearchResultToJson(this);
}

@JsonSerializable()
class SpecialtyDishInfo {
  final String id;
  final String name;
  final String type;
  final double weight;

  SpecialtyDishInfo({
    required this.id,
    required this.name,
    required this.type,
    required this.weight,
  });

  factory SpecialtyDishInfo.fromJson(Map<String, dynamic> json) {
    try {
      return _$SpecialtyDishInfoFromJson(json);
    } catch (e) {
      // Handle potential null values in numeric fields
      return SpecialtyDishInfo(
        id: json['id'] as String? ?? '',
        name: json['name'] as String? ?? '',
        type: json['type'] as String? ?? '',
        weight: (json['weight'] as num?)?.toDouble() ?? 0.0,
      );
    }
  }
  Map<String, dynamic> toJson() => _$SpecialtyDishInfoToJson(this);
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

  factory QlooTag.fromJson(Map<String, dynamic> json) =>
      _$QlooTagFromJson(json);
  Map<String, dynamic> toJson() => _$QlooTagToJson(this);
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

  factory SimilarRestaurantData.fromJson(Map<String, dynamic> json) =>
      _$SimilarRestaurantDataFromJson(json);
  Map<String, dynamic> toJson() => _$SimilarRestaurantDataToJson(this);
}

@JsonSerializable()
class SimilarRestaurant {
  final String name;
  final String entityId;
  final String address;
  final double businessRating;
  final int priceLevel;
  final double popularity;
  final List<String> specialtyDishes;

  SimilarRestaurant({
    required this.name,
    required this.entityId,
    required this.address,
    required this.businessRating,
    required this.priceLevel,
    required this.popularity,
    required this.specialtyDishes,
  });

  factory SimilarRestaurant.fromJson(Map<String, dynamic> json) =>
      _$SimilarRestaurantFromJson(json);
  Map<String, dynamic> toJson() => _$SimilarRestaurantToJson(this);
}

@JsonSerializable()
class SpecialtyDish {
  final String dishName;
  final String tagId;
  final int restaurantCount;
  final double popularity;
  final double weight; // Weight indicating customer preference strength
  final double totalWeight; // Sum of all weights for this dish

  SpecialtyDish({
    required this.dishName,
    required this.tagId,
    required this.restaurantCount,
    required this.popularity,
    required this.weight,
    required this.totalWeight,
  });

  factory SpecialtyDish.fromJson(Map<String, dynamic> json) =>
      _$SpecialtyDishFromJson(json);
  Map<String, dynamic> toJson() => _$SpecialtyDishToJson(this);
}

@JsonSerializable()
class DemographicsData {
  final String restaurantId;
  final String qlooEntityId;
  final List<AgeGroupData> ageGroups;
  final List<GenderData> genders;
  final List<String> interests;
  final List<DiningPattern> diningPatterns;
  final DateTime retrievedAt;

  DemographicsData({
    required this.restaurantId,
    required this.qlooEntityId,
    required this.ageGroups,
    required this.genders,
    required this.interests,
    required this.diningPatterns,
    required this.retrievedAt,
  });

  factory DemographicsData.fromJson(Map<String, dynamic> json) =>
      _$DemographicsDataFromJson(json);
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

  factory AgeGroupData.fromJson(Map<String, dynamic> json) =>
      _$AgeGroupDataFromJson(json);
  Map<String, dynamic> toJson() => _$AgeGroupDataToJson(this);
}

@JsonSerializable()
class GenderData {
  final String gender;
  final double percentage;
  final List<String> preferences;

  GenderData({
    required this.gender,
    required this.percentage,
    required this.preferences,
  });

  factory GenderData.fromJson(Map<String, dynamic> json) =>
      _$GenderDataFromJson(json);
  Map<String, dynamic> toJson() => _$GenderDataToJson(this);
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

  factory DiningPattern.fromJson(Map<String, dynamic> json) =>
      _$DiningPatternFromJson(json);
  Map<String, dynamic> toJson() => _$DiningPatternToJson(this);
}

@JsonSerializable()
class OptimizationOption {
  final String id;
  final String title;
  final String description;
  final List<String> requirements;
  final bool available;
  final String? reason;

  OptimizationOption({
    required this.id,
    required this.title,
    required this.description,
    required this.requirements,
    required this.available,
    this.reason,
  });

  factory OptimizationOption.fromJson(Map<String, dynamic> json) =>
      _$OptimizationOptionFromJson(json);
  Map<String, dynamic> toJson() => _$OptimizationOptionToJson(this);
}

@JsonSerializable()
class DemographicDisplay {
  final List<AgeGroupDisplay> ageGroups;
  final List<GenderGroupDisplay> genderGroups;
  final List<String> interests;
  final List<DiningPatternDisplay> diningPatterns;
  final String interpretation;

  DemographicDisplay({
    required this.ageGroups,
    required this.genderGroups,
    required this.interests,
    required this.diningPatterns,
    required this.interpretation,
  });

  factory DemographicDisplay.fromJson(Map<String, dynamic> json) =>
      _$DemographicDisplayFromJson(json);
  Map<String, dynamic> toJson() => _$DemographicDisplayToJson(this);
}

@JsonSerializable()
class AgeGroupDisplay {
  final String ageRange;
  final double percentage;
  final List<String> preferences;
  final String interpretation;

  AgeGroupDisplay({
    required this.ageRange,
    required this.percentage,
    required this.preferences,
    required this.interpretation,
  });

  factory AgeGroupDisplay.fromJson(Map<String, dynamic> json) =>
      _$AgeGroupDisplayFromJson(json);
  Map<String, dynamic> toJson() => _$AgeGroupDisplayToJson(this);
}

@JsonSerializable()
class GenderGroupDisplay {
  final String gender;
  final double percentage;
  final List<String> preferences;
  final String interpretation;

  GenderGroupDisplay({
    required this.gender,
    required this.percentage,
    required this.preferences,
    required this.interpretation,
  });

  factory GenderGroupDisplay.fromJson(Map<String, dynamic> json) =>
      _$GenderGroupDisplayFromJson(json);
  Map<String, dynamic> toJson() => _$GenderGroupDisplayToJson(this);
}

@JsonSerializable()
class DiningPatternDisplay {
  final String pattern;
  final double frequency;
  final List<String> timeOfDay;
  final String interpretation;

  DiningPatternDisplay({
    required this.pattern,
    required this.frequency,
    required this.timeOfDay,
    required this.interpretation,
  });

  factory DiningPatternDisplay.fromJson(Map<String, dynamic> json) =>
      _$DiningPatternDisplayFromJson(json);
  Map<String, dynamic> toJson() => _$DiningPatternDisplayToJson(this);
}

@JsonSerializable()
class SpecialtyDishDisplay {
  final String dishName;
  final String tagId;
  final int restaurantCount;
  final double popularity;
  final double?
      weight; // Weight indicating customer preference strength (nullable to handle NaN)
  final double?
      totalWeight; // Sum of all weights for this dish (nullable to handle NaN)
  final double? tripAdvisorRating;
  final String? restaurantName;
  final String interpretation;

  SpecialtyDishDisplay({
    required this.dishName,
    required this.tagId,
    required this.restaurantCount,
    required this.popularity,
    this.weight,
    this.totalWeight,
    this.tripAdvisorRating,
    this.restaurantName,
    required this.interpretation,
  });

  factory SpecialtyDishDisplay.fromJson(Map<String, dynamic> json) {
    // Handle NaN values in weight and totalWeight fields
    double? parseWeight(dynamic value) {
      if (value == null || value.toString().toLowerCase() == 'nan') {
        return null;
      }
      if (value is num) {
        return value.toDouble();
      }
      return double.tryParse(value.toString());
    }

    return SpecialtyDishDisplay(
      dishName: json['dishName'] as String,
      tagId: json['tagId'] as String,
      restaurantCount: json['restaurantCount'] as int,
      popularity: (json['popularity'] as num).toDouble(),
      weight: parseWeight(json['weight']),
      totalWeight: parseWeight(json['totalWeight']),
      tripAdvisorRating: json['tripAdvisorRating'] != null
          ? (json['tripAdvisorRating'] as num).toDouble()
          : null,
      restaurantName: json['restaurantName'] as String?,
      interpretation: json['interpretation'] as String,
    );
  }

  Map<String, dynamic> toJson() => _$SpecialtyDishDisplayToJson(this);
}

@JsonSerializable()
class OptimizationReadiness {
  final int menuItemCount;
  final int specialtyDishCount;
  final bool hasAllRequiredData;

  OptimizationReadiness({
    required this.menuItemCount,
    required this.specialtyDishCount,
    required this.hasAllRequiredData,
  });

  factory OptimizationReadiness.fromJson(Map<String, dynamic> json) =>
      _$OptimizationReadinessFromJson(json);
  Map<String, dynamic> toJson() => _$OptimizationReadinessToJson(this);
}

@JsonSerializable()
class SelectedDemographics {
  final List<String> selectedAgeGroups;
  final List<String> selectedGenderGroups;
  final List<String> selectedInterests;

  SelectedDemographics({
    required this.selectedAgeGroups,
    required this.selectedGenderGroups,
    required this.selectedInterests,
  });

  factory SelectedDemographics.fromJson(Map<String, dynamic> json) =>
      _$SelectedDemographicsFromJson(json);
  Map<String, dynamic> toJson() => _$SelectedDemographicsToJson(this);
}
