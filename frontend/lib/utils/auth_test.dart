// Test utility to verify token refresh functionality
// This file can be used for debugging and testing the auth system

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/http_client.dart';
import '../services/restaurant_service.dart';

class AuthTestWidget extends StatefulWidget {
  @override
  _AuthTestWidgetState createState() => _AuthTestWidgetState();
}

class _AuthTestWidgetState extends State<AuthTestWidget> {
  final HttpClient _httpClient = HttpClient();
  final RestaurantService _restaurantService = RestaurantService();
  String _testResult = '';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Auth System Test')),
      body: Consumer<AuthProvider>(
        builder: (context, authProvider, child) {
          return Padding(
            padding: EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Auth Status: ${authProvider.isAuthenticated ? "Authenticated" : "Not Authenticated"}'),
                Text('Token: ${authProvider.token?.substring(0, 20) ?? "None"}...'),
                Text('Refresh Token: ${authProvider.refreshToken?.substring(0, 20) ?? "None"}...'),
                SizedBox(height: 20),
                
                ElevatedButton(
                  onPressed: () async {
                    try {
                      final isExpired = await authProvider.isTokenExpired();
                      setState(() {
                        _testResult = 'Token expired: $isExpired';
                      });
                    } catch (e) {
                      setState(() {
                        _testResult = 'Error checking expiration: $e';
                      });
                    }
                  },
                  child: Text('Check Token Expiration'),
                ),
                
                ElevatedButton(
                  onPressed: () async {
                    try {
                      final token = await authProvider.getValidToken();
                      setState(() {
                        _testResult = 'Valid token: ${token?.substring(0, 20) ?? "None"}...';
                      });
                    } catch (e) {
                      setState(() {
                        _testResult = 'Error getting valid token: $e';
                      });
                    }
                  },
                  child: Text('Get Valid Token'),
                ),
                
                ElevatedButton(
                  onPressed: () async {
                    try {
                      final success = await authProvider.refreshToken();
                      setState(() {
                        _testResult = 'Token refresh: ${success ? "Success" : "Failed"}';
                      });
                    } catch (e) {
                      setState(() {
                        _testResult = 'Error refreshing token: $e';
                      });
                    }
                  },
                  child: Text('Manual Token Refresh'),
                ),
                
                ElevatedButton(
                  onPressed: () async {
                    try {
                      final response = await _httpClient.get('/restaurant/profile');
                      setState(() {
                        _testResult = 'API call result: ${response.statusCode}';
                      });
                    } catch (e) {
                      setState(() {
                        _testResult = 'API call error: $e';
                      });
                    }
                  },
                  child: Text('Test API Call'),
                ),
                
                ElevatedButton(
                  onPressed: () async {
                    try {
                      final restaurant = await _restaurantService.getCurrentRestaurant();
                      setState(() {
                        _testResult = 'Restaurant: ${restaurant?.name ?? "None found"}';
                      });
                    } catch (e) {
                      setState(() {
                        _testResult = 'Service call error: $e';
                      });
                    }
                  },
                  child: Text('Test Service Call'),
                ),
                
                SizedBox(height: 20),
                Text('Test Result:', style: TextStyle(fontWeight: FontWeight.bold)),
                Text(_testResult),
              ],
            ),
          );
        },
      ),
    );
  }
}