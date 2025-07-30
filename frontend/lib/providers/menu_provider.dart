import 'package:flutter/foundation.dart';
import 'package:file_picker/file_picker.dart';
import '../models/menu_models.dart';
import '../services/menu_service.dart';

class MenuProvider extends ChangeNotifier {
  final MenuService _menuService = MenuService();
  
  List<MenuItem> _menuItems = [];
  List<OptimizedMenuItem> _optimizedItems = [];
  List<MenuItemSuggestion> _suggestions = [];
  bool _isLoading = false;
  String? _error;
  
  List<MenuItem> get menuItems => _menuItems;
  List<OptimizedMenuItem> get optimizedItems => _optimizedItems;
  List<MenuItemSuggestion> get suggestions => _suggestions;
  bool get isLoading => _isLoading;
  String? get error => _error;
  
  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }
  
  void _setError(String? error) {
    _error = error;
    notifyListeners();
  }
  
  Future<UploadResponse?> uploadMenu(String restaurantId, PlatformFile menuFile) async {
    _setLoading(true);
    _setError(null);
    
    try {
      final response = await _menuService.uploadMenu(restaurantId, menuFile);
      // Handle upload response
      if (response.status == 'success') {
        notifyListeners();
        return response;
      } else {
        _setError(response.message ?? 'Upload failed');
        return null;
      }
    } catch (e) {
      _setError(e.toString());
      return null;
    } finally {
      _setLoading(false);
    }
  }

  Future<ParseMenuResponse?> parseMenu(String restaurantId, String fileKey, String fileType, String fileId) async {
    _setLoading(true);
    _setError(null);
    
    try {
      final response = await _menuService.parseMenu(restaurantId, fileKey, fileType, fileId);
      // Update menu items with parsed items
      _menuItems = response.menuItems;
      notifyListeners();
      return response;
    } catch (e) {
      _setError(e.toString());
      return null;
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> createMenuItem(MenuItem newItem) async {
    _setLoading(true);
    _setError(null);
    
    try {
      final createdItem = await _menuService.createMenuItem(newItem);
      _menuItems.add(createdItem);
      notifyListeners();
      return true;
    } catch (e) {
      _setError(e.toString());
      return false;
    } finally {
      _setLoading(false);
    }
  }
  
  Future<bool> getMenuItems(String restaurantId) async {
    _setLoading(true);
    _setError(null);
    
    try {
      _menuItems = await _menuService.getMenuItems(restaurantId);
      notifyListeners();
      return true;
    } catch (e) {
      _setError(e.toString());
      return false;
    } finally {
      _setLoading(false);
    }
  }
  
  Future<bool> updateMenuItem(String itemId, MenuItem updates) async {
    _setLoading(true);
    _setError(null);
    
    try {
      final updatedItem = await _menuService.updateMenuItem(itemId, updates);
      final index = _menuItems.indexWhere((item) => item.itemId == itemId);
      if (index != -1) {
        _menuItems[index] = updatedItem;
        notifyListeners();
      }
      return true;
    } catch (e) {
      _setError(e.toString());
      return false;
    } finally {
      _setLoading(false);
    }
  }
  
  Future<bool> optimizeExistingItems(
    String restaurantId, {
    List<String>? itemIds,
    String? optimizationStyle,
    String? targetAudience,
  }) async {
    _setLoading(true);
    _setError(null);
    
    try {
      _optimizedItems = await _menuService.optimizeExistingItems(
        restaurantId,
        itemIds: itemIds,
        optimizationStyle: optimizationStyle,
        targetAudience: targetAudience,
      );
      notifyListeners();
      return true;
    } catch (e) {
      _setError(e.toString());
      return false;
    } finally {
      _setLoading(false);
    }
  }
  
  Future<bool> suggestNewItems(
    String restaurantId, {
    int? maxSuggestions,
    String? cuisineStyle,
    String? priceRange,
    List<String>? excludeCategories,
  }) async {
    _setLoading(true);
    _setError(null);
    
    try {
      _suggestions = await _menuService.suggestNewItems(
        restaurantId,
        maxSuggestions: maxSuggestions,
        cuisineStyle: cuisineStyle,
        priceRange: priceRange,
        excludeCategories: excludeCategories,
      );
      notifyListeners();
      return true;
    } catch (e) {
      _setError(e.toString());
      return false;
    } finally {
      _setLoading(false);
    }
  }
  
  Future<bool> approveOptimization(
    String restaurantId,
    String type, // "existing_items" or "new_items"
    String itemId,
    bool approved,
    {String? feedback}
  ) async {
    _setLoading(true);
    _setError(null);
    
    try {
      await _menuService.reviewOptimization(
        restaurantId,
        type,
        itemId,
        approved ? 'approved' : 'rejected',
        feedback: feedback,
      );
      
      if (type == 'existing_items') {
        final index = _optimizedItems.indexWhere((item) => item.itemId == itemId);
        if (index != -1) {
          _optimizedItems[index] = _optimizedItems[index].copyWith(
            status: approved ? 'approved' : 'rejected',
          );
        }
      } else if (type == 'new_items') {
        final index = _suggestions.indexWhere((item) => item.suggestionId == itemId);
        if (index != -1) {
          _suggestions[index] = _suggestions[index].copyWith(
            status: approved ? 'approved' : 'rejected',
          );
        }
      }
      
      notifyListeners();
      return true;
    } catch (e) {
      _setError(e.toString());
      return false;
    } finally {
      _setLoading(false);
    }
  }
  
  Future<bool> deleteMenuItem(String itemId) async {
    _setLoading(true);
    _setError(null);
    
    try {
      await _menuService.deleteMenuItem(itemId);
      _menuItems.removeWhere((item) => item.itemId == itemId);
      notifyListeners();
      return true;
    } catch (e) {
      _setError(e.toString());
      return false;
    } finally {
      _setLoading(false);
    }
  }
  
  Future<MenuItem?> getMenuItem(String itemId) async {
    _setLoading(true);
    _setError(null);
    
    try {
      final item = await _menuService.getMenuItem(itemId);
      return item;
    } catch (e) {
      _setError(e.toString());
      return null;
    } finally {
      _setLoading(false);
    }
  }
  
  Future<bool> fetchOptimizationResults(
    String restaurantId,
    String type, // "existing_items" or "new_items"
  ) async {
    _setLoading(true);
    _setError(null);
    
    try {
      final response = await _menuService.getOptimizationResults(restaurantId, type);
      
      if (type == 'existing_items') {
        _optimizedItems.clear();
        // Convert dynamic items to OptimizedMenuItem
        for (final item in response.pendingItems) {
          if (item is Map<String, dynamic>) {
            _optimizedItems.add(OptimizedMenuItem.fromJson(item));
          }
        }
        for (final item in response.approvedItems) {
          if (item is Map<String, dynamic>) {
            _optimizedItems.add(OptimizedMenuItem.fromJson(item));
          }
        }
        for (final item in response.rejectedItems) {
          if (item is Map<String, dynamic>) {
            _optimizedItems.add(OptimizedMenuItem.fromJson(item));
          }
        }
      } else if (type == 'new_items') {
        _suggestions.clear();
        // Convert dynamic items to MenuItemSuggestion
        for (final item in response.pendingItems) {
          if (item is Map<String, dynamic>) {
            _suggestions.add(MenuItemSuggestion.fromJson(item));
          }
        }
        for (final item in response.approvedItems) {
          if (item is Map<String, dynamic>) {
            _suggestions.add(MenuItemSuggestion.fromJson(item));
          }
        }
        for (final item in response.rejectedItems) {
          if (item is Map<String, dynamic>) {
            _suggestions.add(MenuItemSuggestion.fromJson(item));
          }
        }
      }
      
      notifyListeners();
      return true;
    } catch (e) {
      _setError(e.toString());
      return false;
    } finally {
      _setLoading(false);
    }
  }

  void clearError() {
    _setError(null);
  }
}