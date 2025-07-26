import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/restaurant_models.dart';

class RestaurantService {
  static const String baseUrl =
      'https://ofjfkha65m.execute-api.us-east-1.amazonaws.com/dev';

  Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('auth_token');
  }

  Future<Map<String, String>> _getHeaders() async {
    final token = await _getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  Future<RestaurantSetupResponse> setupRestaurantProfile(
      RestaurantProfile profile) async {
    final response = await http.post(
      Uri.parse('$baseUrl/restaurant/setup-profile'),
      headers: await _getHeaders(),
      body: jsonEncode(profile.toJson()),
    );

    if (response.statusCode == 200) {
      return RestaurantSetupResponse.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Restaurant profile setup failed: ${response.body}');
    }
  }

  Future<List<QlooSearchResult>> searchQlooRestaurants(
      String name, String city, String state) async {
    final response = await http.post(
      Uri.parse('$baseUrl/restaurant/search-qloo'),
      headers: await _getHeaders(),
      body: jsonEncode({
        'restaurantName': name,
        'city': city,
        'state': state,
      }),
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.map((json) => QlooSearchResult.fromJson(json)).toList();
    } else {
      throw Exception('Qloo restaurant search failed: ${response.body}');
    }
  }

  Future<void> selectRestaurant(String restaurantId, String qlooEntityId,
      QlooRestaurantData restaurantData) async {
    final response = await http.post(
      Uri.parse('$baseUrl/restaurant/select'),
      headers: await _getHeaders(),
      body: jsonEncode({
        'restaurantId': restaurantId,
        'qlooEntityId': qlooEntityId,
        'address': restaurantData.address,
        'priceLevel': restaurantData.priceLevel,
        'genreTags': restaurantData.genreTags,
      }),
    );

    if (response.statusCode != 200) {
      throw Exception('Restaurant selection failed: ${response.body}');
    }
  }

  Future<SimilarRestaurantData> searchSimilarRestaurants(
      String restaurantId, String qlooEntityId, double minRating) async {
    final response = await http.post(
      Uri.parse('$baseUrl/restaurant/search-similar'),
      headers: await _getHeaders(),
      body: jsonEncode({
        'restaurantId': restaurantId,
        'qlooEntityId': qlooEntityId,
        'minRating': minRating,
      }),
    );

    if (response.statusCode == 200) {
      return SimilarRestaurantData.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Similar restaurant search failed: ${response.body}');
    }
  }

  Future<DemographicsData> getDemographics(
      String restaurantId, String qlooEntityId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/restaurant/demographics'),
      headers: await _getHeaders(),
      body: jsonEncode({
        'restaurantId': restaurantId,
        'qlooEntityId': qlooEntityId,
      }),
    );

    if (response.statusCode == 200) {
      return DemographicsData.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Demographics data retrieval failed: ${response.body}');
    }
  }

  /// Fetch the current user's restaurant profile from the backend
  Future<Restaurant?> getCurrentRestaurant() async {
    final response = await http.get(
      Uri.parse('$baseUrl/restaurant/get'),
      headers: await _getHeaders(),
    );
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      if (data == null) return null;
      return Restaurant.fromJson(data['restaurant']);
    } else if (response.statusCode == 404) {
      return null;
    } else {
      throw Exception('Failed to fetch current restaurant: ${response.body}');
    }
  }
}
