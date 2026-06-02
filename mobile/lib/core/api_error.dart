import 'dart:io' show Platform, SocketException;

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show kIsWeb;

import 'config.dart';

String? _responseDetail(DioException error) {
  final data = error.response?.data;
  if (data is Map && data['detail'] != null) {
    final detail = data['detail'];
    if (detail is String) return detail;
    if (detail is List && detail.isNotEmpty) {
      return detail.map((e) => e.toString()).join('；');
    }
    return detail.toString();
  }
  if (data is String && data.isNotEmpty) return data;
  return null;
}

String formatApiError(Object error) {
  if (error is DioException) {
    final detail = _responseDetail(error);
    if (detail != null && detail.isNotEmpty) return detail;

    final refused = error.type == DioExceptionType.connectionError ||
        (error.error is SocketException &&
            (error.error as SocketException).message.contains('Connection refused'));
    if (!kIsWeb && Platform.isAndroid && refused) {
      return '无法连接后端 $apiBaseUrl\n'
          '• 手机与电脑连同一 WiFi，或\n'
          '• USB 连接后执行: adb reverse tcp:8000 tcp:8000\n'
          '  并用: flutter run --dart-define=ANDROID_API_HOST=127.0.0.1';
    }

    switch (error.response?.statusCode) {
      case 401:
        return '邮箱或密码错误';
      case 400:
        return '请求无效，请检查输入';
      case 404:
        return '资源不存在';
      case 500:
        return '服务器错误，请稍后重试';
      default:
        break;
    }

    final msg = error.message ?? '';
    if (msg.contains('validateStatus')) return '请求失败，请稍后重试';
    if (msg.isNotEmpty && msg.length <= 120) return msg;
    return '网络请求失败';
  }
  final text = error.toString();
  if (text.length > 120) return '${text.substring(0, 120)}…';
  return text;
}
