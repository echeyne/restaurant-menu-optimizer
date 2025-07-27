import 'package:flutter/foundation.dart';
import '../models/restaurant_models.dart';
import '../services/restaurant_service.dart';
import 'auth_provider.dart';

class RestaurantProvider extends ChangeNotifier {
  final RestaurantService _restaurantService = RestaurantService();
  final AuthProvider _authProvider;

  RestaurantProvider(this._authProvider);

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

  Future<bool> setupRestaurantProfile(
      String name, String city, String state) async {
    _setLoading(true);
    _setError(null);

    try {
      final ownerId = _authProvider.user?.userId;
      if (ownerId == null) {
        throw Exception('User not authenticated');
      }

      final profile = RestaurantProfile(
        name: name,
        city: city,
        state: state,
      );
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

  Future<bool> searchQlooRestaurants(
      String name, String city, String state) async {
    _setLoading(true);
    _setError(null);

    try {
      _searchResults =
          await _restaurantService.searchQlooRestaurants(name, city, state);
      notifyListeners();
      return true;
    } catch (e) {
      _setError(e.toString());
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> selectRestaurant(
      String qlooEntityId, QlooSearchResult restaurantData) async {
    _setLoading(true);
    _setError(null);

    try {
      final restaurantId = _restaurant?.restaurantId;
      if (restaurantId == null) {
        throw Exception('Restaurant not set up');
      }

      await _restaurantService.selectRestaurant(
          restaurantId, qlooEntityId, restaurantData);
      return true;
    } catch (e) {
      _setError(e.toString());
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> searchSimilarRestaurants(
      String entityId, double minRating) async {
    _setLoading(true);
    _setError(null);

    try {
      final restaurantId = _restaurant?.restaurantId;
      if (restaurantId == null) {
        throw Exception('Restaurant not set up');
      }

      final data = await _restaurantService.searchSimilarRestaurants(
          restaurantId, entityId, minRating);
      _similarRestaurants = data;
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
      final restaurantId = _restaurant?.restaurantId;
      if (restaurantId == null) {
        throw Exception('Restaurant not set up');
      }

      _demographicsData =
          await _restaurantService.getDemographics(restaurantId, entityId);
      notifyListeners();
      return true;
    } catch (e) {
      _setError(e.toString());
      return false;
    } finally {
      _setLoading(false);
    }
  }

  /// Fetch the current user's restaurant from the backend and update state
  Future<bool> getCurrentRestaurant() async {
    _setLoading(true);
    _setError(null);
    try {
      final restaurant = await _restaurantService.getCurrentRestaurant();
      if (restaurant != null) {
        _restaurant = restaurant;
        notifyListeners();
        return true;
      }
      return false;
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

  void clearSimilarRestaurants() {
    _similarRestaurants = [];
    notifyListeners();
  }
}
