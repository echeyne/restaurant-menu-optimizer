import 'dart:convert';
import 'package:file_picker/file_picker.dart';
import 'package:http/http.dart' as http;
import 'http_client.dart';
import '../models/menu_models.dart';
import '../models/restaurant_models.dart';

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
        fileId: fileId,
        status: 'success',
        fileKey: fileKey,
        fileType: _getMimeType(menuFile.extension ?? ''),
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
      // Create a copy of the updates without protected fields
      final Map<String, dynamic> updateData = Map.from(updates.toJson());
      updateData.remove('itemId');
      updateData.remove('restaurantId');
      updateData.remove('createdAt');
      updateData.remove('updatedAt');

      final response = await _httpClient.putJson(
          '/menu/update-menu-item/$itemId', updateData);

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
      final Map<String, dynamic> menuItemJson = newItem.toJson();
      menuItemJson.remove('itemId');
      final response =
          await _httpClient.postJson('/menu/update-menu-item', menuItemJson);

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

  Future<ParseMenuResponse> parseMenu(String restaurantId, String fileKey,
      String fileType, String fileId) async {
    try {
      final response = await _httpClient.postJson('/menu/parse', {
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
    String restaurantId, {
    List<String>? itemIds,
    SelectedDemographics? selectedDemographics,
    List<SpecialtyDishDisplay>? selectedSpecialtyDishes,
    String? optimizationStyle,
    String? targetAudience,
    String? cuisineType,
  }) async {
    try {
      final requestBody = <String, dynamic>{
        'restaurantId': restaurantId,
      };

      if (itemIds != null && itemIds.isNotEmpty) {
        requestBody['itemIds'] = itemIds;
      }

      if (selectedDemographics != null) {
        requestBody['selectedDemographics'] = selectedDemographics.toJson();
      }

      if (selectedSpecialtyDishes != null &&
          selectedSpecialtyDishes.isNotEmpty) {
        requestBody['selectedSpecialtyDishes'] =
            selectedSpecialtyDishes.map((dish) => dish.toJson()).toList();
      }

      if (optimizationStyle != null) {
        requestBody['optimizationStyle'] = optimizationStyle;
      }

      if (targetAudience != null) {
        requestBody['targetAudience'] = targetAudience;
      }

      if (cuisineType != null) {
        requestBody['cuisineType'] = cuisineType;
      }

      final response = await _httpClient.postJson(
          '/menu/optimize-existing-items', requestBody);

      if (response.statusCode == 200) {
        final responseData = jsonDecode(response.body);
        final List<dynamic> optimizedItems =
            responseData['optimizedItems'] ?? [];
        return optimizedItems
            .map((json) => OptimizedMenuItem.fromJson(json))
            .toList();
      } else {
        throw Exception('Failed to optimize existing items: ${response.body}');
      }
    } catch (e) {
      throw Exception('Error optimizing existing items: $e');
    }
  }

  Future<List<MenuItemSuggestion>> suggestNewItems(
    String restaurantId, {
    int? maxSuggestions,
    String? cuisineType,
    String? priceRange,
    List<String>? excludeCategories,
  }) async {
    try {
      final requestBody = <String, dynamic>{
        'restaurantId': restaurantId,
      };

      if (maxSuggestions != null) {
        requestBody['maxSuggestions'] = maxSuggestions;
      }

      if (cuisineType != null) {
        requestBody['cuisineType'] = cuisineType;
      }

      if (priceRange != null) {
        requestBody['priceRange'] = priceRange;
      }

      if (excludeCategories != null && excludeCategories.isNotEmpty) {
        requestBody['excludeCategories'] = excludeCategories;
      }

      final response =
          await _httpClient.postJson('/menu/suggest-new-items', requestBody);

      if (response.statusCode == 200) {
        final responseData = jsonDecode(response.body);
        final List<dynamic> suggestions = responseData['suggestions'] ?? [];
        return suggestions
            .map((json) => MenuItemSuggestion.fromJson(json))
            .toList();
      } else {
        throw Exception('Failed to suggest new items: ${response.body}');
      }
    } catch (e) {
      throw Exception('Error suggesting new items: $e');
    }
  }

  Future<void> reviewOptimization(
      String restaurantId,
      String type, // "existing_items" or "new_items"
      String itemId,
      String status, // "approved" or "rejected"
      {String? feedback}) async {
    try {
      final requestBody = <String, dynamic>{
        'restaurantId': restaurantId,
        'type': type,
        'itemId': itemId,
        'status': status,
      };

      if (feedback != null && feedback.isNotEmpty) {
        requestBody['feedback'] = feedback;
      }

      final response =
          await _httpClient.postJson('/menu/review-optimizations', requestBody);

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

  Future<OptimizationReviewResponse> getOptimizationResults(
    String restaurantId,
    String type, // "existing_items" or "new_items"
  ) async {
    try {
      final response = await _httpClient.get(
          '/menu/review-optimizations?restaurantId=$restaurantId&type=$type');

      if (response.statusCode == 200) {
        return OptimizationReviewResponse.fromJson(jsonDecode(response.body));
      } else {
        throw Exception('Failed to get optimization results: ${response.body}');
      }
    } catch (e) {
      throw Exception('Error getting optimization results: $e');
    }
  }

  Future<OptimizationOptionsResponse> getOptimizationOptions(
      String restaurantId) async {
    try {
      final response = await _httpClient
          .get('/menu/optimization-options?restaurantId=$restaurantId');

      if (response.statusCode == 200) {
        return OptimizationOptionsResponse.fromJson(jsonDecode(response.body));
      } else {
        throw Exception('Failed to get optimization options: ${response.body}');
      }
    } catch (e) {
      throw Exception('Error getting optimization options: $e');
    }
  }

  Future<OptimizationSelectionResponse> submitOptimizationSelection({
    required String restaurantId,
    required String selectedOption,
    SelectedDemographics? selectedDemographics,
    List<SpecialtyDishDisplay>? selectedSpecialtyDishes,
    String? cuisineType,
  }) async {
    try {
      // Determine which endpoint to call based on the selected option
      String endpoint;
      Map<String, dynamic> requestBody = {
        'restaurantId': restaurantId,
      };

      if (selectedOption == 'optimize-existing') {
        endpoint = '/menu/optimize-existing-items';

        // Convert frontend parameter names to backend expected names
        if (selectedDemographics != null) {
          requestBody['selectedDemographics'] = {
            'selectedAgeGroups': selectedDemographics.selectedAgeGroups,
            'selectedGenderGroups': selectedDemographics.selectedGenderGroups,
            'selectedInterests': selectedDemographics.selectedInterests,
          };
        }

        if (cuisineType != null) {
          requestBody['cuisineType'] = cuisineType;
        }

        // Call optimize-existing-items endpoint
        final response = await _httpClient.postJson(endpoint, requestBody);

        if (response.statusCode == 200) {
          final responseData = jsonDecode(response.body);
          return OptimizationSelectionResponse(
            success: true,
            restaurantId: restaurantId,
            selectedOption: selectedOption,
            nextEndpoint: '/menu/review-optimizations',
            nextAction: 'review_optimizations',
            requiredData: {
              'type': 'existing_items',
              'optimizedItems': responseData['optimizedItems'] ?? [],
            },
            message: 'Successfully optimized existing items',
          );
        } else {
          throw Exception(
              'Failed to optimize existing items: ${response.body}');
        }
      } else if (selectedOption == 'suggest-new-items') {
        endpoint = '/menu/suggest-new-items';

        // Convert frontend parameter names to backend expected names
        if (selectedDemographics != null) {
          requestBody['selectedDemographics'] = {
            'selectedAgeGroups': selectedDemographics.selectedAgeGroups,
            'selectedGenderGroups': selectedDemographics.selectedGenderGroups,
            'selectedInterests': selectedDemographics.selectedInterests,
          };
        }

        if (selectedSpecialtyDishes != null) {
          requestBody['selectedSpecialtyDishes'] =
              selectedSpecialtyDishes.map((dish) => dish.toJson()).toList();
        }

        if (cuisineType != null) {
          requestBody['cuisineType'] = cuisineType;
        }

        // Call suggest-new-items endpoint
        final response = await _httpClient.postJson(endpoint, requestBody);

        if (response.statusCode == 200) {
          final responseData = jsonDecode(response.body);
          return OptimizationSelectionResponse(
            success: true,
            restaurantId: restaurantId,
            selectedOption: selectedOption,
            nextEndpoint: '/menu/review-optimizations',
            nextAction: 'review_optimizations',
            requiredData: {
              'type': 'new_items',
              'suggestions': responseData['suggestions'] ?? [],
            },
            message: 'Successfully generated new item suggestions',
          );
        } else {
          throw Exception('Failed to suggest new items: ${response.body}');
        }
      } else {
        throw Exception('Invalid optimization option: $selectedOption');
      }
    } catch (e) {
      throw Exception('Error submitting optimization selection: $e');
    }
  }
}
