import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/api_error.dart';
import '../../core/citation_text.dart';
import '../../core/theme.dart';
import '../../widgets/chat_bubble.dart';
import '../../widgets/empty_state.dart';

class ChatPage extends StatefulWidget {
  const ChatPage({super.key, required this.collectionId});

  final int collectionId;

  @override
  State<ChatPage> createState() => _ChatPageState();
}

class _ChatMessage {
  _ChatMessage({required this.role, required this.content, List<dynamic>? citations})
      : citations = citations ?? [];

  final String role;
  String content;
  final List<dynamic> citations;
}

class _ChatPageState extends State<ChatPage> {
  final _scaffoldKey = GlobalKey<ScaffoldState>();
  final _input = TextEditingController();
  final _scroll = ScrollController();
  final List<_ChatMessage> _messages = [];
  int? _conversationId;
  bool _streaming = false;
  String _collectionName = '知识库';
  List<dynamic> _conversations = [];
  bool _loadingHistory = false;

  static const _suggestions = [
    '这个知识库主要讲什么？',
    '帮我总结一下要点',
    '有哪些配置说明？',
  ];

  @override
  void initState() {
    super.initState();
    _loadTitle();
  }

  Future<void> _loadTitle() async {
    try {
      final col = await apiClientProvider.getCollection(widget.collectionId);
      if (mounted) setState(() => _collectionName = col['name'] as String? ?? '知识库');
    } catch (_) {}
  }

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  List<dynamic> _parseCitations(dynamic raw) {
    if (raw is List) return raw;
    if (raw is String && raw.isNotEmpty) {
      try {
        final decoded = jsonDecode(raw);
        if (decoded is List) return decoded;
      } catch (_) {}
    }
    return [];
  }

  Future<void> _loadConversationList() async {
    setState(() => _loadingHistory = true);
    try {
      final list = await apiClientProvider.listConversations(widget.collectionId);
      if (mounted) setState(() => _conversations = list);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(formatApiError(e))),
        );
      }
    } finally {
      if (mounted) setState(() => _loadingHistory = false);
    }
  }

  Future<void> _openHistoryDrawer() async {
    await _loadConversationList();
    if (!mounted) return;
    _scaffoldKey.currentState?.openEndDrawer();
  }

  Future<void> _loadConversation(int convId) async {
    try {
      final rows = await apiClientProvider.listMessages(convId);
      if (!mounted) return;
      setState(() {
        _conversationId = convId;
        _messages
          ..clear()
          ..addAll(
            rows.map((m) {
              final map = m as Map<String, dynamic>;
              return _ChatMessage(
                role: map['role'] as String? ?? 'user',
                content: map['content'] as String? ?? '',
                citations: _parseCitations(map['citations']),
              );
            }),
          );
      });
      _scrollToBottom();
      _scaffoldKey.currentState?.closeEndDrawer();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(formatApiError(e))),
        );
      }
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(
          _scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _useSuggestion(String text) {
    _input.text = text;
    _send();
  }

  Future<void> _send() async {
    final text = _input.text.trim();
    if (text.isEmpty || _streaming) return;
    _input.clear();
    setState(() {
      _messages.add(_ChatMessage(role: 'user', content: text));
      _messages.add(_ChatMessage(role: 'assistant', content: ''));
      _streaming = true;
    });
    _scrollToBottom();

    final assistantIndex = _messages.length - 1;
    try {
      await for (final event in apiClientProvider.chatStream(
        collectionId: widget.collectionId,
        message: text,
        conversationId: _conversationId,
      )) {
        final type = event['type'] as String?;
        if (type == 'meta') {
          _conversationId = event['conversation_id'] as int?;
          final citations = event['citations'] as List<dynamic>? ?? [];
          if (citations.isNotEmpty) {
            setState(() {
              _messages[assistantIndex].citations
                ..clear()
                ..addAll(citations);
            });
          }
        } else if (type == 'token') {
          setState(() {
            _messages[assistantIndex].content += event['content'] as String? ?? '';
          });
          _scrollToBottom();
        } else if (type == 'done') {
          final fromServer = event['content'] as String?;
          if (fromServer != null && fromServer.isNotEmpty) {
            setState(() {
              _messages[assistantIndex].content = prepareAnswerWithCitations(
                fromServer,
                _messages[assistantIndex].citations,
              );
            });
          }
        } else if (type == 'error') {
          setState(() {
            _messages[assistantIndex].content = '错误: ${event['content']}';
          });
        }
      }
    } catch (e) {
      setState(() => _messages[assistantIndex].content = formatApiError(e));
    } finally {
      setState(() => _streaming = false);
    }
  }

  void _newChat() {
    setState(() {
      _messages.clear();
      _conversationId = null;
    });
  }

  Widget _buildHistoryDrawer() {
    return Drawer(
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  const Expanded(
                    child: Text('历史会话', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
                  ),
                  TextButton(onPressed: _newChat, child: const Text('新对话')),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: _loadingHistory
                  ? const Center(child: CircularProgressIndicator())
                  : _conversations.isEmpty
                      ? const Center(child: Text('暂无历史会话', style: TextStyle(color: AppColors.textSecondary)))
                      : ListView.builder(
                          itemCount: _conversations.length,
                          itemBuilder: (_, i) {
                            final c = _conversations[i] as Map<String, dynamic>;
                            final id = c['id'] as int;
                            final title = c['title'] as String? ?? '新对话';
                            final selected = id == _conversationId;
                            return ListTile(
                              selected: selected,
                              title: Text(title, maxLines: 2, overflow: TextOverflow.ellipsis),
                              onTap: () => _loadConversation(id),
                            );
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final borderColor = Theme.of(context).brightness == Brightness.dark
        ? AppColors.borderDark
        : AppColors.border;

    return Scaffold(
      key: _scaffoldKey,
      endDrawer: _buildHistoryDrawer(),
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/collections/${widget.collectionId}');
            }
          },
        ),
        title: Text('问答 · $_collectionName'),
        actions: [
          IconButton(
            icon: const Icon(Icons.history),
            tooltip: '历史会话',
            onPressed: _streaming ? null : _openHistoryDrawer,
          ),
          IconButton(
            icon: const Icon(Icons.add_comment_outlined),
            tooltip: '新对话',
            onPressed: _streaming ? null : _newChat,
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: _messages.isEmpty
                ? ListView(
                    padding: const EdgeInsets.all(24),
                    children: [
                      const EmptyState(
                        icon: Icons.chat_bubble_outline,
                        title: '向知识库提问',
                        subtitle: '回答将基于已就绪的文档，并标注引用来源',
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        alignment: WrapAlignment.center,
                        children: _suggestions
                            .map(
                              (s) => ActionChip(
                                label: Text(s),
                                onPressed: _streaming ? null : () => _useSuggestion(s),
                              ),
                            )
                            .toList(),
                      ),
                    ],
                  )
                : ListView.builder(
                    controller: _scroll,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    itemCount: _messages.length,
                    itemBuilder: (_, i) {
                      final m = _messages[i];
                      return ChatBubble(
                        isUser: m.role == 'user',
                        content: m.content,
                        collectionId: widget.collectionId,
                        isStreaming: _streaming && i == _messages.length - 1 && m.role == 'assistant',
                        citations: m.citations,
                      );
                    },
                  ),
          ),
          Container(
            padding: EdgeInsets.fromLTRB(12, 8, 12, 8 + MediaQuery.of(context).padding.bottom),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              border: Border(top: BorderSide(color: borderColor)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: TextField(
                    controller: _input,
                    keyboardType: TextInputType.multiline,
                    textInputAction: TextInputAction.newline,
                    enableIMEPersonalizedLearning: true,
                    maxLines: 4,
                    minLines: 1,
                    decoration: InputDecoration(
                      hintText: '输入问题…',
                      filled: true,
                      fillColor: Theme.of(context).brightness == Brightness.dark
                          ? AppColors.cardDark
                          : AppColors.surface,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(20)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: _streaming || _input.text.trim().isEmpty ? null : _send,
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(48, 48),
                    padding: EdgeInsets.zero,
                    shape: const CircleBorder(),
                  ),
                  child: Icon(_streaming ? Icons.hourglass_top : Icons.send, size: 22),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
