import 'dart:convert';
import 'http_client.dart';
import '../models/restaurant_models.dart';

class RestaurantService {
  final HttpClient _httpClient = HttpClient();

  Future<Restaurant?> getCurrentRestaurant() async {
    try {
      final response = await _httpClient.get('/restaurant/profile');
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return Restaurant.fromJson(data);
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

  Future<RestaurantSetupResponse> setupRestaurantProfile(RestaurantProfile profile) async {
    try {
      final response = await _httpClient.postJson('/restaurant/profile', {
        'name': profile.name,
        'city': profile.city,
        'state': profile.state,
        'ownerId': profile.ownerId,
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
    String name, 
    String city, 
    String state
  ) async {
    try {
      final response = await _httpClient.postJson('/qloo/search-restaurants', {
        'name': name,
        'city': city,
        'state': state,
      });
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final List<dynamic> results = data['results'] ?? [];
        return results.map((json) => QlooSearchResult.fromJson(json)).toList();
      } else {
        throw Exception('Failed to search restaurants: ${response.body}');
      }
    } catch (e) {
      throw Exception('Error searching restaurants: $e');
    }
  }

  Future<void> selectRestaurant(String restaurantId, String qlooEntityId, QlooRestaurantData restaurantData) async {
    try {
      final response = await _httpClient.postJson('/restaurant/$restaurantId/select-qloo', {
        'qlooEntityId': qlooEntityId,
        'restaurantData': restaurantData.toJson(),
      });
      
      if (response.statusCode != 200) {
        throw Exception('Failed to select restaurant: ${response.body}');
      }
    } catch (e) {
      throw Exception('Error selecting restaurant: $e');
    }
  }

  Future<SimilarRestaurantsResponse> searchSimilarRestaurants(
    String restaurantId,
    String entityId, 
    double minRating
  ) async {
    try {
      final response = await _httpClient.postJson('/restaurant/$restaurantId/similar-restaurants', {
        'entityId': entityId,
        'minRating': minRating,
      });
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return SimilarRestaurantsResponse.fromJson(data);
      } else {
        throw Exception('Failed to search similar restaurants: ${response.body}');
      }
    } catch (e) {
      throw Exception('Error searching similar restaurants: $e');
    }
  }

  Future<DemographicsData?> getDemographics(String restaurantId, String entityId) async {
    try {
      final response = await _httpClient.postJson('/restaurant/$restaurantId/demographics', {
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