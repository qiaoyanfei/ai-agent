import 'package:flutter/services.dart';

import 'branding.dart';

/// Flutter ↔ 原生桥接（面试可讲 Platform Channel、混合栈底座）
class NativeBridge {
  static const _channel = MethodChannel(AppBranding.nativeChannel);

  static Future<Map<String, String>> getDeviceInfo() async {
    try {
      final result = await _channel.invokeMethod<Map>('getDeviceInfo');
      return result?.map((k, v) => MapEntry(k.toString(), v?.toString() ?? '')) ??
          {'platform': 'unknown'};
    } on PlatformException {
      return {'platform': 'unknown', 'error': 'native_unavailable'};
    }
  }
}
