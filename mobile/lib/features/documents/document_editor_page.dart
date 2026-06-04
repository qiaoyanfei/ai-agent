import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/api_error.dart';
import '../../core/doc_utils.dart';

class DocumentEditorPage extends StatefulWidget {
  const DocumentEditorPage({
    super.key,
    required this.collectionId,
    this.documentId,
  });

  final int collectionId;
  final int? documentId;

  bool get isCreate => documentId == null;

  @override
  State<DocumentEditorPage> createState() => _DocumentEditorPageState();
}

class _DocumentEditorPageState extends State<DocumentEditorPage> {
  final _filenameCtrl = TextEditingController(text: '未命名.md');
  final _contentCtrl = TextEditingController();
  bool _loading = true;
  bool _saving = false;
  String? _error;
  bool _editable = true;

  @override
  void dispose() {
    _filenameCtrl.dispose();
    _contentCtrl.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    if (widget.isCreate) {
      _loading = false;
      _contentCtrl.text = '# 标题\n\n在此编写 Markdown 内容…\n';
    } else {
      _load();
    }
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await apiClientProvider.getDocumentContent(widget.documentId!);
      _filenameCtrl.text = data['filename'] as String? ?? '';
      _contentCtrl.text = data['content'] as String? ?? '';
      _editable = data['editable'] as bool? ?? isEditableDocumentFilename(_filenameCtrl.text);
    } catch (e) {
      _error = formatApiError(e);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    final content = _contentCtrl.text.trim();
    if (content.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('内容不能为空')),
      );
      return;
    }
    setState(() => _saving = true);
    try {
      if (widget.isCreate) {
        var name = _filenameCtrl.text.trim();
        if (!name.toLowerCase().endsWith('.md') && !name.toLowerCase().endsWith('.markdown')) {
          name = '$name.md';
        }
        await apiClientProvider.createTextDocument(
          widget.collectionId,
          name,
          content,
        );
      } else {
        await apiClientProvider.updateDocumentContent(widget.documentId!, content);
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('已保存，正在解析…')),
        );
        context.pop(true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(formatApiError(e))),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.isCreate ? '新建 Markdown' : '编辑文档'),
        actions: [
          TextButton(
            onPressed: _saving || _loading || !_editable ? null : _save,
            child: _saving
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('保存'),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!))
              : Column(
                  children: [
                    if (widget.isCreate)
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                        child: TextField(
                          controller: _filenameCtrl,
                          decoration: const InputDecoration(
                            labelText: '文件名',
                            hintText: '例如：笔记.md',
                            border: OutlineInputBorder(),
                          ),
                        ),
                      )
                    else
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                        child: Align(
                          alignment: Alignment.centerLeft,
                          child: Text(
                            _filenameCtrl.text,
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                        ),
                      ),
                    if (!_editable)
                      const Padding(
                        padding: EdgeInsets.all(16),
                        child: Text('该文件类型不支持在线编辑，请重新上传。'),
                      )
                    else
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: TextField(
                            controller: _contentCtrl,
                            maxLines: null,
                            expands: true,
                            textAlignVertical: TextAlignVertical.top,
                            decoration: const InputDecoration(
                              hintText: 'Markdown 正文',
                              border: OutlineInputBorder(),
                              alignLabelWithHint: true,
                            ),
                            style: const TextStyle(fontFamily: 'monospace', fontSize: 14, height: 1.5),
                          ),
                        ),
                      ),
                  ],
                ),
    );
  }
}
