import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:http/http.dart' as http;

import 'config.dart';
import 'token_storage.dart';

class ApiClient {
  ApiClient() {
    _dio = Dio(BaseOptions(
      baseUrl: apiBaseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 120),
    ));
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final path = options.path;
        final isAuth = path.contains('/auth/login') || path.contains('/auth/register');
        if (!isAuth) {
          final token = await TokenStorage.load();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
        }
        handler.next(options);
      },
    ));
  }

  late final Dio _dio;
  Dio get dio => _dio;

  Future<String> login(String email, String password) async {
    final res = await _dio.post('/auth/login', data: {
      'email': email,
      'password': password,
    });
    return res.data['access_token'] as String;
  }

  Future<String> register(String email, String password) async {
    final res = await _dio.post('/auth/register', data: {
      'email': email,
      'password': password,
    });
    return res.data['access_token'] as String;
  }

  Future<Map<String, dynamic>> me() async {
    final res = await _dio.get('/auth/me');
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<List<dynamic>> listCollections() async {
    final res = await _dio.get('/collections');
    return res.data as List<dynamic>;
  }

  Future<Map<String, dynamic>> getCollection(int collectionId) async {
    final res = await _dio.get('/collections/$collectionId');
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<Map<String, dynamic>> createCollection(String name, String description) async {
    final res = await _dio.post('/collections', data: {
      'name': name,
      'description': description,
    });
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<List<dynamic>> listDocuments(int collectionId) async {
    final res = await _dio.get('/collections/$collectionId/documents');
    return res.data as List<dynamic>;
  }

  Future<Map<String, dynamic>> uploadDocument(int collectionId, String path, String filename) async {
    final form = FormData.fromMap({
      'file': await MultipartFile.fromFile(path, filename: filename),
    });
    final res = await _dio.post('/collections/$collectionId/documents', data: form);
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<void> deleteDocument(int documentId) async {
    await _dio.delete('/documents/$documentId');
  }

  Future<List<dynamic>> listConversations(int collectionId) async {
    final res = await _dio.get(
      '/chat/conversations',
      queryParameters: {'collection_id': collectionId},
    );
    return res.data as List<dynamic>;
  }

  Future<List<dynamic>> listMessages(int conversationId) async {
    final res = await _dio.get('/chat/$conversationId/messages');
    return res.data as List<dynamic>;
  }

  Future<Map<String, dynamic>> getChunkSource(int chunkId) async {
    final res = await _dio.get('/chunks/$chunkId/source');
    return Map<String, dynamic>.from(res.data as Map);
  }

  Future<Uint8List> downloadDocumentFile(int documentId) async {
    final res = await _dio.get<List<int>>(
      '/documents/$documentId/file',
      options: Options(responseType: ResponseType.bytes),
    );
    return Uint8List.fromList(res.data ?? []);
  }

  Stream<Map<String, dynamic>> chatStream({
    required int collectionId,
    required String message,
    int? conversationId,
  }) async* {
    final token = await TokenStorage.load();
    final uri = Uri.parse('$apiBaseUrl/chat');
    final request = http.Request('POST', uri);
    request.headers['Content-Type'] = 'application/json';
    if (token != null) {
      request.headers['Authorization'] = 'Bearer $token';
    }
    request.body = jsonEncode({
      'collection_id': collectionId,
      'message': message,
      'conversation_id': conversationId,
    });

    final response = await http.Client().send(request);
    if (response.statusCode != 200) {
      final body = await response.stream.bytesToString();
      throw Exception('聊天请求失败: ${response.statusCode} $body');
    }

    await for (final chunk in response.stream.transform(utf8.decoder).transform(const LineSplitter())) {
      if (!chunk.startsWith('data: ')) continue;
      final jsonStr = chunk.substring(6).trim();
      if (jsonStr.isEmpty) continue;
      yield Map<String, dynamic>.from(jsonDecode(jsonStr) as Map);
    }
  }
}

final apiClientProvider = ApiClient();
