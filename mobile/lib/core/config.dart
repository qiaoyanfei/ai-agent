import 'dart:io' show Platform;

import 'package:flutter/foundation.dart' show kIsWeb;

/// 电脑局域网 IP（真机与 Mac 同一 WiFi 时使用）
/// IP 变化时：flutter run --dart-define=API_HOST=你的IP
const String _defaultLanHost = '192.168.1.8';

const String _apiHost = String.fromEnvironment(
  'API_HOST',
  defaultValue: _defaultLanHost,
);

/// Android 可用 ANDROID_API_HOST 单独覆盖（兼容旧命令）
const String _androidApiHost = String.fromEnvironment(
  'ANDROID_API_HOST',
  defaultValue: _apiHost,
);

String get apiBaseUrl {
  if (kIsWeb) return 'http://127.0.0.1:8000';
  if (!kIsWeb && Platform.isAndroid) {
    return 'http://$_androidApiHost:8000';
  }
  if (!kIsWeb && Platform.isIOS) {
    return 'http://$_apiHost:8000';
  }
  return 'http://127.0.0.1:8000';
}
