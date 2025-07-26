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
      await _saveToken(authResponse.accessToken);
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
      await _saveToken(authResponse.accessToken);
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
  
  Future<AuthResponse> refreshToken(String token) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/refresh-token'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );
    
    if (response.statusCode == 200) {
      final authResponse = AuthResponse.fromJson(jsonDecode(response.body));
      await _saveToken(authResponse.accessToken);
      return authResponse;
    } else {
      throw Exception('Token refresh failed: ${response.body}');
    }
  }
  
  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
  }
  
  Future<String?> getStoredToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('auth_token');
  }
  
  Future<void> _saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', token);
  }
}