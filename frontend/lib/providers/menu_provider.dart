import 'package:flutter/foundation.dart';
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
  
  Future<bool> uploadMenu(String restaurantId, dynamic menuFile) async {
    _setLoading(true);
    _setError(null);
    
    try {
      await _menuService.uploadMenu(restaurantId, menuFile);
      // Handle upload response
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
  
  Future<bool> optimizeExistingItems(String restaurantId) async {
    _setLoading(true);
    _setError(null);
    
    try {
      _optimizedItems = await _menuService.optimizeExistingItems(restaurantId);
      notifyListeners();
      return true;
    } catch (e) {
      _setError(e.toString());
      return false;
    } finally {
      _setLoading(false);
    }
  }
  
  Future<bool> suggestNewItems(String restaurantId) async {
    _setLoading(true);
    _setError(null);
    
    try {
      _suggestions = await _menuService.suggestNewItems(restaurantId);
      notifyListeners();
      return true;
    } catch (e) {
      _setError(e.toString());
      return false;
    } finally {
      _setLoading(false);
    }
  }
  
  Future<bool> approveOptimization(String itemId, bool approved) async {
    _setLoading(true);
    _setError(null);
    
    try {
      await _menuService.reviewOptimization(itemId, approved);
      final index = _optimizedItems.indexWhere((item) => item.itemId == itemId);
      if (index != -1) {
        _optimizedItems[index] = _optimizedItems[index].copyWith(
          status: approved ? 'approved' : 'rejected',
        );
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
  
  void clearError() {
    _setError(null);
  }
}