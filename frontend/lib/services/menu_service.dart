import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/menu_models.dart';

class MenuService {
  static const String baseUrl = 'https://ofjfkha65m.execute-api.us-east-1.amazonaws.com/dev';
  
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
  
  Future<UploadResponse> uploadMenu(String restaurantId, dynamic menuFile) async {
    // This would typically use multipart/form-data for file upload
    final response = await http.post(
      Uri.parse('$baseUrl/menu/upload-menu'),
      headers: await _getHeaders(),
      body: jsonEncode({
        'restaurantId': restaurantId,
        // File handling would be more complex in real implementation
      }),
    );
    
    if (response.statusCode == 200) {
      return UploadResponse.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Menu upload failed: ${response.body}');
    }
  }
  
  Future<List<MenuItem>> getMenuItems(String restaurantId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/menu/get-menu-items?restaurantId=$restaurantId'),
      headers: await _getHeaders(),
    );
    
    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.map((json) => MenuItem.fromJson(json)).toList();
    } else {
      throw Exception('Failed to get menu items: ${response.body}');
    }
  }
  
  Future<MenuItem> updateMenuItem(String itemId, MenuItem updates) async {
    final response = await http.put(
      Uri.parse('$baseUrl/menu/update-menu-item'),
      headers: await _getHeaders(),
      body: jsonEncode({
        'itemId': itemId,
        'updates': updates.toJson(),
      }),
    );
    
    if (response.statusCode == 200) {
      return MenuItem.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Failed to update menu item: ${response.body}');
    }
  }
  
  Future<List<OptimizedMenuItem>> optimizeExistingItems(String restaurantId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/menu/optimize-existing-items'),
      headers: await _getHeaders(),
      body: jsonEncode({
        'restaurantId': restaurantId,
      }),
    );
    
    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.map((json) => OptimizedMenuItem.fromJson(json)).toList();
    } else {
      throw Exception('Failed to optimize existing items: ${response.body}');
    }
  }
  
  Future<List<MenuItemSuggestion>> suggestNewItems(String restaurantId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/menu/suggest-new-items'),
      headers: await _getHeaders(),
      body: jsonEncode({
        'restaurantId': restaurantId,
      }),
    );
    
    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.map((json) => MenuItemSuggestion.fromJson(json)).toList();
    } else {
      throw Exception('Failed to suggest new items: ${response.body}');
    }
  }
  
  Future<void> reviewOptimization(String itemId, bool approved) async {
    final response = await http.post(
      Uri.parse('$baseUrl/menu/review-optimizations'),
      headers: await _getHeaders(),
      body: jsonEncode({
        'itemId': itemId,
        'approved': approved,
      }),
    );
    
    if (response.statusCode != 200) {
      throw Exception('Failed to review optimization: ${response.body}');
    }
  }
}