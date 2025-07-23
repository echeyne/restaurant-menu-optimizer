import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:responsive_framework/responsive_framework.dart';
import 'providers/auth_provider.dart';
import 'providers/restaurant_provider.dart';
import 'providers/menu_provider.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/register_screen.dart';
import 'screens/restaurant/restaurant_profile_setup_screen.dart';
import 'screens/menu/menu_management_screen.dart';
import 'screens/dashboard/dashboard_screen.dart';
import 'utils/app_theme.dart';
import 'utils/app_routes.dart';

void main() {
  runApp(const RestaurantMenuOptimizerApp());
}

class RestaurantMenuOptimizerApp extends StatelessWidget {
  const RestaurantMenuOptimizerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => RestaurantProvider()),
        ChangeNotifierProvider(create: (_) => MenuProvider()),
      ],
      child: MaterialApp(
        title: 'Restaurant Menu Optimizer',
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        themeMode: ThemeMode.system,
        builder: (context, child) => ResponsiveBreakpoints.builder(
          child: child!,
          breakpoints: [
            const Breakpoint(start: 0, end: 450, name: MOBILE),
            const Breakpoint(start: 451, end: 800, name: TABLET),
            const Breakpoint(start: 801, end: 1920, name: DESKTOP),
            const Breakpoint(start: 1921, end: double.infinity, name: '4K'),
          ],
        ),
        initialRoute: AppRoutes.login,
        routes: {
          AppRoutes.login: (context) => const LoginScreen(),
          AppRoutes.register: (context) => const RegisterScreen(),
          AppRoutes.restaurantSetup: (context) => const RestaurantProfileSetupScreen(),
          AppRoutes.menuManagement: (context) => const MenuManagementScreen(),
          AppRoutes.dashboard: (context) => const DashboardScreen(),
        },
      ),
    );
  }
}