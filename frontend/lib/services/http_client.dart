import 'dart:convert';
import 'package:http/http.dart' as http;
import 'auth_service.dart';

class HttpClient {
  final AuthService _authService = AuthService();
  static const String baseUrl =
      'https://ofjfkha65m.execute-api.us-east-1.amazonaws.com/dev';

  Future<http.Response> get(
    String endpoint, {
    Map<String, String>? headers,
  }) async {
    return await _authService.authenticatedRequest(
      method: 'GET',
      endpoint: endpoint,
      headers: headers,
    );
  }

  Future<http.Response> post(
    String endpoint, {
    Object? body,
    Map<String, String>? headers,
  }) async {
    return await _authService.authenticatedRequest(
      method: 'POST',
      endpoint: endpoint,
      body: body,
      headers: headers,
    );
  }

  Future<http.Response> put(
    String endpoint, {
    Object? body,
    Map<String, String>? headers,
  }) async {
    return await _authService.authenticatedRequest(
      method: 'PUT',
      endpoint: endpoint,
      body: body,
      headers: headers,
    );
  }

  Future<http.Response> delete(
    String endpoint, {
    Map<String, String>? headers,
  }) async {
    return await _authService.authenticatedRequest(
      method: 'DELETE',
      endpoint: endpoint,
      headers: headers,
    );
  }

  // Helper method for JSON requests
  Future<http.Response> postJson(
    String endpoint,
    Map<String, dynamic> data,
  ) async {
    return await post(endpoint, body: jsonEncode(data));
  }

  Future<http.Response> putJson(
    String endpoint,
    Map<String, dynamic> data,
  ) async {
    return await put(endpoint, body: jsonEncode(data));
  }
}
