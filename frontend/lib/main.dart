import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:responsive_framework/responsive_framework.dart';
import 'providers/auth_provider.dart';
import 'providers/restaurant_provider.dart';
import 'providers/menu_provider.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/register_screen.dart';
import 'screens/auth/email_confirmation_screen.dart';
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
        ChangeNotifierProxyProvider<AuthProvider, RestaurantProvider>(
          create: (context) => RestaurantProvider(context.read<AuthProvider>()),
          update: (context, authProvider, previous) => 
              previous ?? RestaurantProvider(authProvider),
        ),
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
        onGenerateRoute: (settings) {
          Widget page;
          switch (settings.name) {
            case AppRoutes.login:
              page = const LoginScreen();
              break;
            case AppRoutes.register:
              page = const RegisterScreen();
              break;
            case AppRoutes.emailConfirmation:
              final email = settings.arguments as String;
              page = EmailConfirmationScreen(email: email);
              break;
            case AppRoutes.restaurantSetup:
              page = const RestaurantProfileSetupScreen();
              break;
            case AppRoutes.menuManagement:
              page = const MenuManagementScreen();
              break;
            case AppRoutes.dashboard:
              page = const DashboardScreen();
              break;
            default:
              page = const LoginScreen();
          }
          
          // Use simple fade transition to avoid choppy animations
          return PageRouteBuilder(
            settings: settings,
            pageBuilder: (context, animation, secondaryAnimation) => page,
            transitionDuration: const Duration(milliseconds: 200),
            transitionsBuilder: (context, animation, secondaryAnimation, child) {
              return FadeTransition(
                opacity: animation,
                child: child,
              );
            },
          );
        },
      ),
    );
  }
}