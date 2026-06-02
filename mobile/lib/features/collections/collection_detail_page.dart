import 'dart:async';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/api_error.dart';
import '../../core/theme.dart';
import '../../widgets/doc_tile.dart';
import '../../widgets/empty_state.dart';

class CollectionDetailPage extends StatefulWidget {
  const CollectionDetailPage({super.key, required this.collectionId});

  final int collectionId;

  @override
  State<CollectionDetailPage> createState() => _CollectionDetailPageState();
}

class _CollectionDetailPageState extends State<CollectionDetailPage> {
  List<dynamic> _documents = [];
  bool _loading = true;
  String _collectionName = '知识库';
  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    _loadAll();
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  bool get _hasProcessingDocs {
    return _documents.any((d) {
      final s = (d as Map)['status'] as String? ?? '';
      return s == 'pending' || s == 'processing';
    });
  }

  void _schedulePoll() {
    _pollTimer?.cancel();
    if (!_hasProcessingDocs) return;
    _pollTimer = Timer.periodic(const Duration(seconds: 3), (_) => _loadDocuments());
  }

  Future<void> _loadAll() async {
    setState(() => _loading = true);
    try {
      final col = await apiClientProvider.getCollection(widget.collectionId);
      if (mounted) _collectionName = col['name'] as String? ?? '知识库';
      await _loadDocuments();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(formatApiError(e))),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadDocuments() async {
    try {
      final data = await apiClientProvider.listDocuments(widget.collectionId);
      if (mounted) {
        setState(() => _documents = data);
        _schedulePoll();
      }
    } catch (_) {}
  }

  Future<void> _upload() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'txt', 'md'],
    );
    if (result == null || result.files.single.path == null) return;
    final file = result.files.single;
    try {
      await apiClientProvider.uploadDocument(
        widget.collectionId,
        file.path!,
        file.name,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('上传成功，正在解析…')),
        );
      }
      await _loadDocuments();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(formatApiError(e))),
        );
      }
    }
  }

  void _openChat() {
    context.push('/collections/${widget.collectionId}/chat');
  }

  Future<void> _deleteDocument(Map<String, dynamic> doc) async {
    final id = doc['id'] as int?;
    final name = doc['filename'] as String? ?? '文档';
    if (id == null) return;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('删除文档'),
        content: Text('确定删除「$name」？向量索引将一并移除。'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('取消')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('删除')),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await apiClientProvider.deleteDocument(id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('已删除')),
        );
      }
      await _loadDocuments();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(formatApiError(e))),
        );
      }
    }
  }

  int get _readyCount =>
      _documents.where((d) => (d as Map)['status'] == 'ready').length;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(_collectionName),
            if (!_loading)
              Text(
                '${_documents.length} 个文档 · $_readyCount 个可问答',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppColors.textSecondary,
                    ),
              ),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                  child: SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: _readyCount > 0 ? _openChat : null,
                      icon: const Icon(Icons.auto_awesome),
                      label: Text(_readyCount > 0 ? '开始 AI 问答' : '请先上传并等待文档就绪'),
                    ),
                  ),
                ),
                Expanded(
                  child: RefreshIndicator(
                    onRefresh: _loadDocuments,
                    child: _documents.isEmpty
                        ? LayoutBuilder(
                            builder: (context, constraints) {
                              return SingleChildScrollView(
                                physics: const AlwaysScrollableScrollPhysics(),
                                child: ConstrainedBox(
                                  constraints: BoxConstraints(
                                    minHeight: constraints.maxHeight,
                                  ),
                                  child: EmptyState(
                                    icon: Icons.upload_file_outlined,
                                    title: '还没有文档',
                                    subtitle: '支持 PDF、TXT、Markdown',
                                    actionLabel: '上传文档',
                                    onAction: _upload,
                                  ),
                                ),
                              );
                            },
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.fromLTRB(16, 12, 16, 88),
                            itemCount: _documents.length,
                            itemBuilder: (_, i) {
                              final d = _documents[i] as Map<String, dynamic>;
                              return DocTile(
                                filename: d['filename'] as String? ?? '',
                                status: d['status'] as String? ?? '',
                                errorMessage: d['error_message'] as String?,
                                onDelete: () => _deleteDocument(d),
                              );
                            },
                          ),
                  ),
                ),
              ],
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _upload,
        icon: const Icon(Icons.upload_file),
        label: const Text('上传'),
      ),
    );
  }
}
