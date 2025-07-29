import 'dart:convert';
import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:http/http.dart' as http;
import 'http_client.dart';
import '../models/menu_models.dart';

class MenuService {
  final HttpClient _httpClient = HttpClient();

  Future<UploadResponse> uploadMenu(
      String restaurantId, PlatformFile menuFile) async {
    try {
      // Step 1: Get pre-signed URL from backend
      final response = await _httpClient.postJson('/menu/upload-menu', {
        'restaurantId': restaurantId,
        'fileName': menuFile.name,
        'fileType': _getMimeType(menuFile.extension ?? ''),
        'fileSize': menuFile.size,
      });

      if (response.statusCode != 200) {
        throw Exception('Failed to get upload URL: ${response.body}');
      }

      final responseData = jsonDecode(response.body);
      final uploadUrl = responseData['uploadUrl'] as String;
      final fileKey = responseData['fileKey'] as String;
      final fileId = responseData['fileId'] as String;

      // Step 2: Upload file directly to S3 using pre-signed URL
      final fileBytes = menuFile.bytes;
      if (fileBytes == null) {
        throw Exception('File bytes are null');
      }

      final uploadResponse = await http.put(
        Uri.parse(uploadUrl),
        body: fileBytes,
        headers: {
          'Content-Type': _getMimeType(menuFile.extension ?? ''),
        },
      );

      if (uploadResponse.statusCode != 200) {
        throw Exception('Failed to upload file to S3: ${uploadResponse.body}');
      }

      // Step 3: Return success response
      return UploadResponse(
        uploadId: fileId,
        status: 'success',
        message: 'File uploaded successfully',
      );
    } catch (e) {
      throw Exception('Error uploading menu: $e');
    }
  }

  String _getMimeType(String extension) {
    switch (extension.toLowerCase()) {
      case 'pdf':
        return 'application/pdf';
      case 'png':
        return 'image/png';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'txt':
        return 'text/plain';
      case 'csv':
        return 'text/csv';
      case 'doc':
        return 'application/msword';
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'xls':
        return 'application/vnd.ms-excel';
      case 'xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      default:
        return 'application/octet-stream';
    }
  }

  Future<List<MenuItem>> getMenuItems(String restaurantId) async {
    try {
      final response = await _httpClient
          .get('/menu/get-menu-items?restaurantId=$restaurantId');

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body)["menuItems"];
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
      final response = await _httpClient.putJson('/menu/update-menu-item/$itemId', updates.toJson());

      if (response.statusCode == 200) {
        final responseData = jsonDecode(response.body);
        return MenuItem.fromJson(responseData['menuItem']);
      } else {
        throw Exception('Failed to update menu item: ${response.body}');
      }
    } catch (e) {
      throw Exception('Error updating menu item: $e');
    }
  }

  Future<MenuItem> createMenuItem(MenuItem newItem) async {
    try {
      final response = await _httpClient.postJson('/menu/update-menu-item', newItem.toJson());

      if (response.statusCode == 200) {
        final responseData = jsonDecode(response.body);
        return MenuItem.fromJson(responseData['menuItem']);
      } else {
        throw Exception('Failed to create menu item: ${response.body}');
      }
    } catch (e) {
      throw Exception('Error creating menu item: $e');
    }
  }

  Future<ParseMenuResponse> parseMenu(String restaurantId, String fileKey, String fileType, String fileId) async {
    try {
      final response = await _httpClient.postJson('/menu/parse-menu', {
        'restaurantId': restaurantId,
        'fileKey': fileKey,
        'fileType': fileType,
        'fileId': fileId,
      });

      if (response.statusCode == 200) {
        return ParseMenuResponse.fromJson(jsonDecode(response.body));
      } else {
        throw Exception('Failed to parse menu: ${response.body}');
      }
    } catch (e) {
      throw Exception('Error parsing menu: $e');
    }
  }

  Future<List<OptimizedMenuItem>> optimizeExistingItems(
      String restaurantId) async {
    try {
      final response =
          await _httpClient.postJson('/menu/optimize-existing-items', {
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
      final response =
          await _httpClient.postJson('/menu/review-optimizations', {
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
      final response =
          await _httpClient.delete('/menu/delete-menu-item?itemId=$itemId');

      if (response.statusCode != 200) {
        throw Exception('Failed to delete menu item: ${response.body}');
      }
    } catch (e) {
      throw Exception('Error deleting menu item: $e');
    }
  }

  Future<MenuItem> getMenuItem(String itemId) async {
    try {
      final response =
          await _httpClient.get('/menu/get-menu-item?itemId=$itemId');

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
