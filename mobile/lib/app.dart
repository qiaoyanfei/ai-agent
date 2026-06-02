import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'core/branding.dart';
import 'core/theme.dart';
import 'core/token_storage.dart';
import 'features/auth/login_page.dart';
import 'features/chat/chat_page.dart';
import 'features/collections/collection_detail_page.dart';
import 'features/collections/collections_page.dart';
import 'features/documents/document_preview_page.dart';
import 'features/settings/settings_page.dart';
import 'providers/app_providers.dart';

Future<GoRouter> createRouter() async {
  final token = await TokenStorage.load();
  final loggedIn = token != null && token.isNotEmpty;

  return GoRouter(
    initialLocation: loggedIn ? '/collections' : '/login',
    routes: [
      GoRoute(path: '/login', builder: (_, __) => const LoginPage()),
      GoRoute(path: '/collections', builder: (_, __) => const CollectionsPage()),
      GoRoute(
        path: '/collections/:id',
        builder: (_, state) {
          final id = int.parse(state.pathParameters['id']!);
          return CollectionDetailPage(collectionId: id);
        },
      ),
      GoRoute(
        path: '/collections/:id/chat',
        builder: (_, state) {
          final id = int.parse(state.pathParameters['id']!);
          return ChatPage(collectionId: id);
        },
      ),
      GoRoute(path: '/settings', builder: (_, __) => const SettingsPage()),
      GoRoute(
        path: '/collections/:id/chunks/:chunkId/preview',
        builder: (_, state) {
          final collectionId = int.parse(state.pathParameters['id']!);
          final chunkId = int.parse(state.pathParameters['chunkId']!);
          return DocumentPreviewPage(collectionId: collectionId, chunkId: chunkId);
        },
      ),
    ],
  );
}

class ZhiKuApp extends ConsumerWidget {
  const ZhiKuApp({super.key, required this.router});

  final GoRouter router;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);

    return MaterialApp.router(
      title: AppBranding.fullTitle,
      locale: const Locale('zh', 'CN'),
      supportedLocales: const [Locale('zh', 'CN'), Locale('en', 'US')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      theme: buildLightTheme(),
      darkTheme: buildDarkTheme(),
      themeMode: themeMode,
      debugShowCheckedModeBanner: false,
      routerConfig: router,
    );
  }
}
