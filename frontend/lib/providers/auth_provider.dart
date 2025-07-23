import 'package:flutter/foundation.dart';
import '../models/auth_models.dart';
import '../services/auth_service.dart';

class AuthProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();
  
  User? _user;
  String? _token;
  bool _isLoading = false;
  String? _error;
  
  User? get user => _user;
  String? get token => _token;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isAuthenticated => _user != null && _token != null;
  
  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }
  
  void _setError(String? error) {
    _error = error;
    notifyListeners();
  }
  
  Future<bool> login(String email, String password) async {
    _setLoading(true);
    _setError(null);
    
    try {
      final response = await _authService.login(email, password);
      // Create a user object from the response and email
      _user = User(
        userId: response.userId,
        email: email, // Use the email from login form
        createdAt: DateTime.now(), // We don't have this from API, use current time
      );
      _token = response.accessToken;
      notifyListeners();
      return true;
    } catch (e) {
      _setError(e.toString());
      return false;
    } finally {
      _setLoading(false);
    }
  }
  
  Future<bool> register(String email, String password) async {
    _setLoading(true);
    _setError(null);
    
    try {
      final response = await _authService.register(email, password);
      // Create a user object from the response and email
      _user = User(
        userId: response.userId,
        email: email, // Use the email from registration form
        createdAt: DateTime.now(), // We don't have this from API, use current time
      );
      _token = response.accessToken;
      notifyListeners();
      return true;
    } catch (e) {
      _setError(e.toString());
      return false;
    } finally {
      _setLoading(false);
    }
  }
  
  Future<void> logout() async {
    _user = null;
    _token = null;
    _error = null;
    await _authService.logout();
    notifyListeners();
  }
  
  Future<bool> refreshToken() async {
    if (_token == null) return false;
    
    try {
      final response = await _authService.refreshToken(_token!);
      _token = response.accessToken;
      notifyListeners();
      return true;
    } catch (e) {
      _setError(e.toString());
      return false;
    }
  }
  
  void clearError() {
    _setError(null);
  }
}