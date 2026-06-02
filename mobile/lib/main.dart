import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final router = await createRouter();
  runApp(
    ProviderScope(
      child: ZhiKuApp(router: router),
    ),
  );
}
