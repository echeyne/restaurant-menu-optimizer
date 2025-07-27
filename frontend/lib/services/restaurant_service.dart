import 'dart:convert';
import 'http_client.dart';
import '../models/restaurant_models.dart';

class RestaurantService {
  final HttpClient _httpClient = HttpClient();

  Future<Restaurant?> getCurrentRestaurant() async {
    try {
      final response = await _httpClient.get('/restaurant/get');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        // The backend returns { restaurant: restaurantData }
        return Restaurant.fromJson(data['restaurant']);
      } else if (response.statusCode == 404) {
        // No restaurant profile found
        return null;
      } else {
        throw Exception('Failed to get restaurant: ${response.body}');
      }
    } catch (e) {
      throw Exception('Error getting restaurant: $e');
    }
  }

  Future<RestaurantSetupResponse> setupRestaurantProfile(
      RestaurantProfile profile) async {
    try {
      final response = await _httpClient.postJson('/restaurant/profile', {
        'name': profile.name,
        'city': profile.city,
        'state': profile.state,
      });

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = jsonDecode(response.body);
        return RestaurantSetupResponse.fromJson(data);
      } else {
        throw Exception('Failed to setup restaurant profile: ${response.body}');
      }
    } catch (e) {
      throw Exception('Error setting up restaurant profile: $e');
    }
  }

  Future<List<QlooSearchResult>> searchQlooRestaurants(
      String name, String city, String state) async {
    try {
      final response = await _httpClient.postJson('/restaurant/search-qloo', {
        'restaurantName': name,
        'city': city,
        'state': state,
      });

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final List<dynamic> results = data['restaurants'] ?? [];
        return results.map((json) => QlooSearchResult.fromJson(json)).toList();
      } else {
        throw Exception('Failed to search restaurants: ${response.body}');
      }
    } catch (e) {
      throw Exception('Error searching restaurants: $e');
    }
  }

  Future<void> selectRestaurant(String restaurantId, String qlooEntityId,
      QlooSearchResult restaurantData) async {
    try {
      final response = await _httpClient.postJson('/restaurant/select', {
        'restaurantId': restaurantId,
        'qlooEntityId': qlooEntityId,
        'qlooSearchResult': restaurantData.toJson(),
      });

      if (response.statusCode != 200) {
        throw Exception('Failed to select restaurant: ${response.body}');
      }
    } catch (e) {
      throw Exception('Error selecting restaurant: $e');
    }
  }

  Future<List<SimilarRestaurant>> searchSimilarRestaurants(
      String restaurantId, String entityId, double minRating) async {
    try {
      final response = await _httpClient
          .postJson('/restaurant/$restaurantId/similar-restaurants', {
        'entityId': entityId,
        'minRating': minRating,
      });

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final List<dynamic> restaurants = data['restaurants'] ?? [];

        // Transform the API response to match the SimilarRestaurant model
        return restaurants.map((json) {
          // Extract specialty dish names from the objects
          final List<dynamic> specialtyDishObjects =
              json['specialtyDishes'] ?? [];
          final List<String> specialtyDishNames = specialtyDishObjects
              .map((dish) => dish['name'] as String)
              .toList();

          // Create a new map with the transformed data
          final transformedJson = {
            'name': json['name'],
            'entityId': json['entityId'],
            'address': json['address'],
            'businessRating': json['businessRating'],
            'priceLevel': json['priceLevel'],
            'specialtyDishes': specialtyDishNames,
            'popularity': json['popularity']
          };

          return SimilarRestaurant.fromJson(transformedJson);
        }).toList();
      } else {
        throw Exception(
            'Failed to search similar restaurants: ${response.body}');
      }
    } catch (e) {
      throw Exception('Error searching similar restaurants: $e');
    }
  }

  Future<DemographicsData?> getDemographics(
      String restaurantId, String entityId) async {
    try {
      final response =
          await _httpClient.postJson('/restaurant/$restaurantId/demographics', {
        'entityId': entityId,
      });

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return DemographicsData.fromJson(data);
      } else if (response.statusCode == 404) {
        return null;
      } else {
        throw Exception('Failed to get demographics: ${response.body}');
      }
    } catch (e) {
      throw Exception('Error getting demographics: $e');
    }
  }
}
