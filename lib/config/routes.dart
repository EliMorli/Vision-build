import 'package:flutter/material.dart';
import '../screens/onboarding/onboarding_screen.dart';
import '../screens/camera/camera_screen.dart';
import '../screens/editor/editor_screen.dart';
import '../screens/result/result_screen.dart';
import '../screens/dashboard/dashboard_screen.dart';
import '../screens/lead_handoff/lead_handoff_screen.dart';

class AppRoutes {
  static const String onboarding = '/';
  static const String dashboard = '/dashboard';
  static const String camera = '/camera';
  static const String editor = '/editor';
  static const String result = '/result';
  static const String leadHandoff = '/lead-handoff';

  static Map<String, WidgetBuilder> get routes => {
        onboarding: (_) => const OnboardingScreen(),
        dashboard: (_) => const DashboardScreen(),
        camera: (_) => const CameraScreen(),
      };

  /// Routes that require arguments use onGenerateRoute.
  static Route<dynamic>? onGenerateRoute(RouteSettings settings) {
    switch (settings.name) {
      case editor:
        final args = settings.arguments as EditorScreenArgs;
        return MaterialPageRoute(
          builder: (_) => EditorScreen(args: args),
        );
      case result:
        final args = settings.arguments as ResultScreenArgs;
        return MaterialPageRoute(
          builder: (_) => ResultScreen(args: args),
        );
      case leadHandoff:
        final args = settings.arguments as LeadHandoffScreenArgs;
        return MaterialPageRoute(
          builder: (_) => LeadHandoffScreen(args: args),
        );
      default:
        return null;
    }
  }
}
