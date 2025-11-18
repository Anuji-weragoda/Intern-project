import 'package:flutter/material.dart';

// Centralized app color palette and ThemeData
class AppColors {
  // Primary blue (used for primary actions)
  static const Color primary = Color(0xFF2563EB); // blue-600
  static const Color primaryVariant = Color(0xFF1E40AF); // indigo-900
  static const Color secondary = Color(0xFF4F46E5); // indigo-600

  // Neutrals
  static const Color background = Color(0xFFF8FAFC); // slate-50
  static const Color surface = Colors.white;
  static const Color textPrimary = Color(0xFF0F172A); // slate-900
  static const Color textSecondary = Color(0xFF475569); // slate-600

  // Status
  static const Color success = Color(0xFF16A34A); // green-600
  static const Color warning = Color(0xFFF59E0B); // amber-500
  static const Color danger = Color(0xFFDC2626); // red-600
}

class AppTheme {
  static ThemeData light() {
    final base = ThemeData.light();
    return base.copyWith(
      colorScheme: ColorScheme.light(
        primary: AppColors.primary,
        secondary: AppColors.secondary,
        surface: AppColors.surface,
        onPrimary: Colors.white,
        onSecondary: Colors.white,
        onSurface: AppColors.textPrimary,
      ),
      scaffoldBackgroundColor: AppColors.background,
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          elevation: 0,
        ),
      ),
      textTheme: base.textTheme.apply(
        bodyColor: AppColors.textPrimary,
        displayColor: AppColors.textPrimary,
      ),
      iconTheme: const IconThemeData(color: AppColors.textSecondary),
    );
  }
}
