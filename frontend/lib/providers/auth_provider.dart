import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/auth_models.dart';
import '../services/auth_service.dart';

class LoginResult {
  final bool success;
  final bool needsConfirmation;
  final String? email;

  LoginResult._({
    required this.success,
    required this.needsConfirmation,
    this.email,
  });

  factory LoginResult.success() => LoginResult._(
        success: true,
        needsConfirmation: false,
      );

  factory LoginResult.needsConfirmation(String email) => LoginResult._(
        success: false,
        needsConfirmation: true,
        email: email,
      );

  factory LoginResult.failure() => LoginResult._(
        success: false,
        needsConfirmation: false,
      );
}

class AuthProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();

  User? _user;
  String? _token;
  String? _refreshToken;
  bool _isLoading = false;
  String? _error;
  bool _isInitialized = false;

  User? get user => _user;
  String? get token => _token;
  String? get refreshToken => _refreshToken;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isAuthenticated => _user != null && _token != null;
  bool get isInitialized => _isInitialized;

  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  void _setError(String? error) {
    _error = error;
    notifyListeners();
  }

  Future<LoginResult> login(String email, String password) async {
    _setLoading(true);
    _setError(null);

    try {
      final response = await _authService.login(email, password);
      // Create a user object from the response and email
      _user = User(
        userId: response.userId,
        email: email, // Use the email from login form
        createdAt:
            DateTime.now(), // We don't have this from API, use current time
      );
      _token = response.accessToken;
      _refreshToken = response.refreshToken;
      await _saveUserInfo(_user!);
      notifyListeners();
      return LoginResult.success();
    } catch (e) {
      if (e is EmailNotConfirmedException) {
        _setError(e.toString());
        return LoginResult.needsConfirmation(e.email);
      }
      _setError(e.toString());
      return LoginResult.failure();
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> register(String email, String password) async {
    _setLoading(true);
    _setError(null);

    try {
      await _authService.register(email, password);
      // Registration successful, but user needs to confirm email
      // Don't set user/token yet - wait for email confirmation
      return true;
    } catch (e) {
      _setError(e.toString());
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> confirmEmail(String email, String code) async {
    _setLoading(true);
    _setError(null);

    try {
      await _authService.confirmEmail(email, code);
      // Email confirmation successful, but user needs to login separately
      // Don't set user/token yet - user should login after confirmation
      return true;
    } catch (e) {
      _setError(e.toString());
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> resendConfirmationCode(String email) async {
    _setLoading(true);
    _setError(null);

    try {
      await _authService.resendConfirmationCode(email);
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
    _refreshToken = null;
    _error = null;
    await _authService.logout();
    await _clearUserInfo();
    notifyListeners();
  }

  // Initialize the auth state from stored tokens
  Future<void> initialize() async {
    if (_isInitialized) return;

    _setLoading(true);

    try {
      final token = await _authService.getValidToken();
      if (token != null) {
        _token = token;
        _refreshToken = await _authService.getStoredRefreshToken();

        // Get stored user info
        final userInfo = await _getStoredUserInfo();
        if (userInfo != null) {
          _user = userInfo;
        }
      }
    } catch (e) {
      // If there's an error getting the token, clear everything
      await logout();
    } finally {
      _isInitialized = true;
      _setLoading(false);
    }
  }

  // Store user info in SharedPreferences
  Future<void> _saveUserInfo(User user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('user_id', user.userId);
    await prefs.setString('user_email', user.email);
    await prefs.setString('user_created_at', user.createdAt.toIso8601String());
  }

  // Get stored user info from SharedPreferences
  Future<User?> _getStoredUserInfo() async {
    final prefs = await SharedPreferences.getInstance();
    final userId = prefs.getString('user_id');
    final email = prefs.getString('user_email');
    final createdAtString = prefs.getString('user_created_at');

    if (userId != null && email != null && createdAtString != null) {
      return User(
        userId: userId,
        email: email,
        createdAt: DateTime.parse(createdAtString),
      );
    }
    return null;
  }

  // Clear stored user info
  Future<void> _clearUserInfo() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('user_id');
    await prefs.remove('user_email');
    await prefs.remove('user_created_at');
  }

  // Get a valid token, refreshing if necessary
  Future<String?> getValidToken() async {
    return await _authService.getValidToken();
  }

  // Check if token is expired
  Future<bool> isTokenExpired() async {
    return await _authService.isTokenExpired();
  }

  void clearError() {
    _setError(null);
  }
}
