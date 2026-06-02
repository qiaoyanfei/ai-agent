import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/api_client.dart';
import '../core/settings_storage.dart';

final apiClientProviderRef = Provider<ApiClient>((ref) => apiClientProvider);

class ThemeModeNotifier extends StateNotifier<ThemeMode> {
  ThemeModeNotifier() : super(ThemeMode.system) {
    _load();
  }

  Future<void> _load() async {
    state = await SettingsStorage.loadThemeMode();
  }

  Future<void> setMode(ThemeMode mode) async {
    state = mode;
    await SettingsStorage.saveThemeMode(mode);
  }
}

final themeModeProvider = StateNotifierProvider<ThemeModeNotifier, ThemeMode>(
  (ref) => ThemeModeNotifier(),
);
