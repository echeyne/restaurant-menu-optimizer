import 'dart:convert';
import 'http_client.dart';
import '../models/menu_models.dart';

class MenuService {
  final HttpClient _httpClient = HttpClient();
  
  Future<UploadResponse> uploadMenu(String restaurantId, dynamic menuFile) async {
    try {
      // This would typically use multipart/form-data for file upload
      final response = await _httpClient.postJson('/menu/upload-menu', {
        'restaurantId': restaurantId,
        // File handling would be more complex in real implementation
      });
      
      if (response.statusCode == 200) {
        return UploadResponse.fromJson(jsonDecode(response.body));
      } else {
        throw Exception('Menu upload failed: ${response.body}');
      }
    } catch (e) {
      throw Exception('Error uploading menu: $e');
    }
  }
  
  Future<List<MenuItem>> getMenuItems(String restaurantId) async {
    try {
      final response = await _httpClient.get('/menu/get-menu-items?restaurantId=$restaurantId');
      
      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return data.map((json) => MenuItem.fromJson(json)).toList();
      } else {
        throw Exception('Failed to get menu items: ${response.body}');
      }
    } catch (e) {
      throw Exception('Error getting menu items: $e');
    }
  }
  
  Future<MenuItem> updateMenuItem(String itemId, MenuItem updates) async {
    try {
      final response = await _httpClient.putJson('/menu/update-menu-item', {
        'itemId': itemId,
        'updates': updates.toJson(),
      });
      
      if (response.statusCode == 200) {
        return MenuItem.fromJson(jsonDecode(response.body));
      } else {
        throw Exception('Failed to update menu item: ${response.body}');
      }
    } catch (e) {
      throw Exception('Error updating menu item: $e');
    }
  }
  
  Future<List<OptimizedMenuItem>> optimizeExistingItems(String restaurantId) async {
    try {
      final response = await _httpClient.postJson('/menu/optimize-existing-items', {
        'restaurantId': restaurantId,
      });
      
      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return data.map((json) => OptimizedMenuItem.fromJson(json)).toList();
      } else {
        throw Exception('Failed to optimize existing items: ${response.body}');
      }
    } catch (e) {
      throw Exception('Error optimizing existing items: $e');
    }
  }
  
  Future<List<MenuItemSuggestion>> suggestNewItems(String restaurantId) async {
    try {
      final response = await _httpClient.postJson('/menu/suggest-new-items', {
        'restaurantId': restaurantId,
      });
      
      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return data.map((json) => MenuItemSuggestion.fromJson(json)).toList();
      } else {
        throw Exception('Failed to suggest new items: ${response.body}');
      }
    } catch (e) {
      throw Exception('Error suggesting new items: $e');
    }
  }
  
  Future<void> reviewOptimization(String itemId, bool approved) async {
    try {
      final response = await _httpClient.postJson('/menu/review-optimizations', {
        'itemId': itemId,
        'approved': approved,
      });
      
      if (response.statusCode != 200) {
        throw Exception('Failed to review optimization: ${response.body}');
      }
    } catch (e) {
      throw Exception('Error reviewing optimization: $e');
    }
  }
  
  Future<void> deleteMenuItem(String itemId) async {
    try {
      final response = await _httpClient.delete('/menu/delete-menu-item?itemId=$itemId');
      
      if (response.statusCode != 200) {
        throw Exception('Failed to delete menu item: ${response.body}');
      }
    } catch (e) {
      throw Exception('Error deleting menu item: $e');
    }
  }
  
  Future<MenuItem> getMenuItem(String itemId) async {
    try {
      final response = await _httpClient.get('/menu/get-menu-item?itemId=$itemId');
      
      if (response.statusCode == 200) {
        return MenuItem.fromJson(jsonDecode(response.body));
      } else {
        throw Exception('Failed to get menu item: ${response.body}');
      }
    } catch (e) {
      throw Exception('Error getting menu item: $e');
    }
  }
}