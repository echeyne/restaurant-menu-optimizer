import 'package:flutter/material.dart';

class RestaurantProfileSetupScreen extends StatelessWidget {
  const RestaurantProfileSetupScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Restaurant Profile Setup'),
      ),
      body: const Center(
        child: Text(
          'Restaurant Profile Setup Screen\n(To be implemented in subtask 9.3)',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 18),
        ),
      ),
    );
  }
}