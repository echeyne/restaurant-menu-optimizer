import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/auth_models.dart';

class EmailNotConfirmedException implements Exception {
  final String email;
  final String message;
  
  EmailNotConfirmedException(this.email, this.message);
  
  @override
  String toString() => message;
}

class AuthService {
  static const String baseUrl = 'https://ofjfkha65m.execute-api.us-east-1.amazonaws.com/dev';
  
  // Token storage keys
  static const String _accessTokenKey = 'access_token';
  static const String _refreshTokenKey = 'refresh_token';
  static const String _tokenExpiryKey = 'token_expiry';
  
  Future<AuthResponse> login(String email, String password) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email,
        'password': password,
      }),
    );
    
    if (response.statusCode == 200) {
      final authResponse = AuthResponse.fromJson(jsonDecode(response.body));
      await _saveTokens(authResponse);
      return authResponse;
    } else {
      final errorBody = response.body;
      // Check if the error is due to unconfirmed email
      if (errorBody.contains('User is not confirmed') || 
          errorBody.contains('not confirmed') ||
          errorBody.contains('UserNotConfirmedException')) {
        throw EmailNotConfirmedException(
          email, 
          'Please check your email and enter the confirmation code to complete your registration.'
        );
      }
      throw Exception('Login failed: $errorBody');
    }
  }
  
  Future<void> register(String email, String password) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/register-user'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email,
        'password': password,
      }),
    );
    
    if (response.statusCode != 200) {
      throw Exception('Registration failed: ${response.body}');
    }
    // Registration successful, confirmation email sent
  }
  
  Future<AuthResponse> confirmEmail(String email, String code) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/confirm-registration'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email,
        'confirmationCode': code,
      }),
    );
    
    if (response.statusCode == 200) {
      final authResponse = AuthResponse.fromJson(jsonDecode(response.body));
      await _saveTokens(authResponse);
      return authResponse;
    } else {
      throw Exception('Email confirmation failed: ${response.body}');
    }
  }
  
  Future<void> resendConfirmationCode(String email) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/resend-confirmation'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email,
      }),
    );
    
    if (response.statusCode != 200) {
      throw Exception('Failed to resend confirmation code: ${response.body}');
    }
  }
  
  Future<AuthResponse> refreshToken() async {
    final refreshToken = await getStoredRefreshToken();
    if (refreshToken == null) {
      throw Exception('No refresh token available');
    }
    
    final response = await http.post(
      Uri.parse('$baseUrl/auth/refresh-token'),
      headers: {
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'refreshToken': refreshToken,
      }),
    );
    
    if (response.statusCode == 200) {
      final authResponse = AuthResponse.fromJson(jsonDecode(response.body));
      await _saveTokens(authResponse);
      return authResponse;
    } else {
      throw Exception('Token refresh failed: ${response.body}');
    }
  }
  
  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_accessTokenKey);
    await prefs.remove(_refreshTokenKey);
    await prefs.remove(_tokenExpiryKey);
  }
  
  Future<String?> getStoredToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_accessTokenKey);
  }
  
  Future<String?> getStoredRefreshToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_refreshTokenKey);
  }
  
  Future<bool> isTokenExpired() async {
    final prefs = await SharedPreferences.getInstance();
    final expiryString = prefs.getString(_tokenExpiryKey);
    if (expiryString == null) return true;
    
    final expiry = DateTime.parse(expiryString);
    // Consider token expired if it expires within the next 5 minutes
    return DateTime.now().add(Duration(minutes: 5)).isAfter(expiry);
  }
  
  Future<String?> getValidToken() async {
    final token = await getStoredToken();
    if (token == null) return null;
    
    if (await isTokenExpired()) {
      try {
        final authResponse = await refreshToken();
        return authResponse.accessToken;
      } catch (e) {
        // Refresh failed, user needs to login again
        await logout();
        return null;
      }
    }
    
    return token;
  }
  
  Future<void> _saveTokens(AuthResponse authResponse) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_accessTokenKey, authResponse.accessToken);
    await prefs.setString(_refreshTokenKey, authResponse.refreshToken);
    
    // Calculate expiry time
    final expiry = DateTime.now().add(Duration(seconds: authResponse.expiresIn));
    await prefs.setString(_tokenExpiryKey, expiry.toIso8601String());
  }
  
  // HTTP client with automatic token refresh
  Future<http.Response> authenticatedRequest({
    required String method,
    required String endpoint,
    Map<String, String>? headers,
    Object? body,
  }) async {
    final token = await getValidToken();
    if (token == null) {
      throw Exception('No valid token available');
    }
    
    final requestHeaders = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
      ...?headers,
    };
    
    http.Response response;
    final uri = Uri.parse('$baseUrl$endpoint');
    
    switch (method.toUpperCase()) {
      case 'GET':
        response = await http.get(uri, headers: requestHeaders);
        break;
      case 'POST':
        response = await http.post(uri, headers: requestHeaders, body: body);
        break;
      case 'PUT':
        response = await http.put(uri, headers: requestHeaders, body: body);
        break;
      case 'DELETE':
        response = await http.delete(uri, headers: requestHeaders);
        break;
      default:
        throw Exception('Unsupported HTTP method: $method');
    }
    
    // If we get a 401, try to refresh the token once
    if (response.statusCode == 401) {
      try {
        await refreshToken();
        final newToken = await getStoredToken();
        if (newToken != null) {
          requestHeaders['Authorization'] = 'Bearer $newToken';
          
          // Retry the request with the new token
          switch (method.toUpperCase()) {
            case 'GET':
              response = await http.get(uri, headers: requestHeaders);
              break;
            case 'POST':
              response = await http.post(uri, headers: requestHeaders, body: body);
              break;
            case 'PUT':
              response = await http.put(uri, headers: requestHeaders, body: body);
              break;
            case 'DELETE':
              response = await http.delete(uri, headers: requestHeaders);
              break;
          }
        }
      } catch (e) {
        // Refresh failed, logout user
        await logout();
        throw Exception('Authentication failed: ${e.toString()}');
      }
    }
    
    return response;
  }
}