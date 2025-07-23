import 'package:flutter/foundation.dart';
import '../models/restaurant_models.dart';
import '../services/restaurant_service.dart';

class RestaurantProvider extends ChangeNotifier {
  final RestaurantService _restaurantService = RestaurantService();
  
  Restaurant? _restaurant;
  List<QlooSearchResult> _searchResults = [];
  List<SimilarRestaurant> _similarRestaurants = [];
  DemographicsData? _demographicsData;
  bool _isLoading = false;
  String? _error;
  
  Restaurant? get restaurant => _restaurant;
  List<QlooSearchResult> get searchResults => _searchResults;
  List<SimilarRestaurant> get similarRestaurants => _similarRestaurants;
  DemographicsData? get demographicsData => _demographicsData;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isProfileComplete => _restaurant?.profileSetupComplete ?? false;
  
  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }
  
  void _setError(String? error) {
    _error = error;
    notifyListeners();
  }
  
  Future<bool> setupRestaurantProfile(String name, String city, String state) async {
    _setLoading(true);
    _setError(null);
    
    try {
      final profile = RestaurantProfile(name: name, city: city, state: state);
      final response = await _restaurantService.setupRestaurantProfile(profile);
      _restaurant = response.restaurant;
      notifyListeners();
      return true;
    } catch (e) {
      _setError(e.toString());
      return false;
    } finally {
      _setLoading(false);
    }
  }
  
  Future<bool> searchQlooRestaurants(String name, String city, String state) async {
    _setLoading(true);
    _setError(null);
    
    try {
      _searchResults = await _restaurantService.searchQlooRestaurants(name, city, state);
      notifyListeners();
      return true;
    } catch (e) {
      _setError(e.toString());
      return false;
    } finally {
      _setLoading(false);
    }
  }
  
  Future<bool> selectRestaurant(String qlooEntityId, QlooRestaurantData restaurantData) async {
    _setLoading(true);
    _setError(null);
    
    try {
      await _restaurantService.selectRestaurant(qlooEntityId, restaurantData);
      if (_restaurant != null) {
        _restaurant = _restaurant!.copyWith(
          qlooEntityId: qlooEntityId,
          address: restaurantData.address,
          priceLevel: restaurantData.priceLevel,
          genreTags: restaurantData.genreTags,
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
  
  Future<bool> searchSimilarRestaurants(String entityId, double minRating) async {
    _setLoading(true);
    _setError(null);
    
    try {
      final data = await _restaurantService.searchSimilarRestaurants(entityId, minRating);
      _similarRestaurants = data.similarRestaurants;
      notifyListeners();
      return true;
    } catch (e) {
      _setError(e.toString());
      return false;
    } finally {
      _setLoading(false);
    }
  }
  
  Future<bool> getDemographics(String entityId) async {
    _setLoading(true);
    _setError(null);
    
    try {
      _demographicsData = await _restaurantService.getDemographics(entityId);
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