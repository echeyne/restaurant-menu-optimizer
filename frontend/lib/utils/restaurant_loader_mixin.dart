import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/restaurant_provider.dart';
import '../utils/app_routes.dart';

mixin RestaurantLoaderMixin<T extends StatefulWidget> on State<T> {
  bool _isRestaurantLoading = false;
  String? _restaurantError;

  bool get isRestaurantLoading => _isRestaurantLoading;
  String? get restaurantError => _restaurantError;

  /// Ensures restaurant data is loaded, showing loading state if needed
  Future<bool> ensureRestaurantLoaded() async {
    final restaurantProvider =
        Provider.of<RestaurantProvider>(context, listen: false);

    // If restaurant is already loaded, return true
    if (restaurantProvider.restaurant != null) {
      return true;
    }

    // If already loading, wait for it to complete
    if (_isRestaurantLoading) {
      while (_isRestaurantLoading) {
        await Future.delayed(const Duration(milliseconds: 100));
      }
      return restaurantProvider.restaurant != null;
    }

    // Start loading restaurant
    setState(() {
      _isRestaurantLoading = true;
      _restaurantError = null;
    });

    try {
      final success = await restaurantProvider.getCurrentRestaurant();

      if (success && restaurantProvider.restaurant != null) {
        setState(() {
          _isRestaurantLoading = false;
          _restaurantError = null;
        });
        return true;
      } else {
        setState(() {
          _isRestaurantLoading = false;
          _restaurantError =
              'Restaurant profile not found. Please complete your profile setup.';
        });
        return false;
      }
    } catch (e) {
      setState(() {
        _isRestaurantLoading = false;
        _restaurantError = 'Failed to load restaurant: $e';
      });
      return false;
    }
  }

  /// Shows a loading widget while restaurant is being loaded
  Widget buildRestaurantLoadingWidget() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const CircularProgressIndicator(),
          const SizedBox(height: 16),
          Text(
            'Loading restaurant profile...',
            style: Theme.of(context).textTheme.titleMedium,
          ),
        ],
      ),
    );
  }

  /// Shows an error widget when restaurant loading fails
  Widget buildRestaurantErrorWidget() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 64, color: Colors.red[400]),
          const SizedBox(height: 16),
          Text(
            'Restaurant Profile Error',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  color: Colors.red[600],
                ),
          ),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Text(
              _restaurantError ?? 'Unknown error occurred',
              style: TextStyle(color: Colors.grey[600]),
              textAlign: TextAlign.center,
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () async {
              await ensureRestaurantLoaded();
            },
            child: const Text('Retry'),
          ),
          const SizedBox(height: 16),
          OutlinedButton(
            onPressed: () {
              Navigator.of(context)
                  .pushReplacementNamed(AppRoutes.restaurantSetup);
            },
            child: const Text('Go to Restaurant Setup'),
          ),
        ],
      ),
    );
  }

  /// Wraps a widget with restaurant loading logic
  Widget withRestaurantLoading(Widget Function() contentBuilder) {
    if (_isRestaurantLoading) {
      return buildRestaurantLoadingWidget();
    } else if (_restaurantError != null) {
      return buildRestaurantErrorWidget();
    } else {
      return contentBuilder();
    }
  }
}
