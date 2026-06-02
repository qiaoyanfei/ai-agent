import 'package:flutter/material.dart';
import 'package:pdfx/pdfx.dart';

import '../../core/api_client.dart';
import '../../core/api_error.dart';
import '../../core/theme.dart';

class DocumentPreviewPage extends StatefulWidget {
  const DocumentPreviewPage({
    super.key,
    required this.collectionId,
    required this.chunkId,
  });

  final int collectionId;
  final int chunkId;

  @override
  State<DocumentPreviewPage> createState() => _DocumentPreviewPageState();
}

class _DocumentPreviewPageState extends State<DocumentPreviewPage> {
  bool _loading = true;
  String? _error;
  Map<String, dynamic>? _source;
  PdfController? _pdfController;
  final _highlightKey = GlobalKey();

  @override
  void dispose() {
    _pdfController?.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final source = await apiClientProvider.getChunkSource(widget.chunkId);
      if (!mounted) return;
      setState(() => _source = source);

      if (source['file_type'] == 'pdf') {
        final docId = source['document_id'] as int;
        final bytes = await apiClientProvider.downloadDocumentFile(docId);
        if (!mounted) return;
        final controller = PdfController(
          document: PdfDocument.openData(bytes),
          initialPage: ((source['page_start'] as int?) ?? 1) - 1,
        );
        setState(() => _pdfController = controller);
      } else {
        WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToHighlight());
      }
    } catch (e) {
      if (mounted) setState(() => _error = formatApiError(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _scrollToHighlight() {
    final ctx = _highlightKey.currentContext;
    if (ctx != null) {
      Scrollable.ensureVisible(
        ctx,
        duration: const Duration(milliseconds: 300),
        alignment: 0.2,
      );
    }
  }

  Widget _buildTextPreview(Map<String, dynamic> source) {
    final fullText = source['full_text'] as String? ?? '';
    final start = (source['char_start'] as int?) ?? 0;
    final end = (source['char_end'] as int?) ?? fullText.length;
    final safeStart = start.clamp(0, fullText.length);
    final safeEnd = end.clamp(safeStart, fullText.length);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final hlBg = isDark ? AppColors.primaryLightDark : AppColors.primaryLight;

    if (fullText.isEmpty) {
      return const Center(child: Text('无法加载文档正文'));
    }

    final before = fullText.substring(0, safeStart);
    final highlight = fullText.substring(safeStart, safeEnd);
    final after = fullText.substring(safeEnd);

    final highlightText =
        highlight.isEmpty ? source['excerpt']?.toString() ?? '（引用片段）' : highlight;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (before.isNotEmpty)
            SelectableText(before, style: const TextStyle(fontSize: 15, height: 1.6)),
          Container(
            key: _highlightKey,
            width: double.infinity,
            margin: const EdgeInsets.symmetric(vertical: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: hlBg,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.primary.withOpacity(0.35)),
            ),
            child: SelectableText(
              highlightText,
              style: const TextStyle(
                fontSize: 15,
                height: 1.6,
                color: AppColors.primary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          if (after.isNotEmpty)
            SelectableText(after, style: const TextStyle(fontSize: 15, height: 1.6)),
        ],
      ),
    );
  }

  Widget _buildPdfPreview(Map<String, dynamic> source) {
    final controller = _pdfController;
    if (controller == null) {
      return const Center(child: CircularProgressIndicator());
    }
    final pageStart = (source['page_start'] as int?) ?? 1;
    final pageEnd = (source['page_end'] as int?) ?? pageStart;

    return Column(
      children: [
        Material(
          color: Theme.of(context).cardColor,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Row(
              children: [
                Icon(Icons.picture_as_pdf, color: Colors.red.shade700, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '引用位置：第 $pageStart${pageEnd != pageStart ? '-$pageEnd' : ''} 页',
                    style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                  ),
                ),
                Text(
                  '第 $pageStart 页',
                  style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
        ),
        Expanded(
          child: PdfView(
            controller: controller,
            scrollDirection: Axis.vertical,
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final source = _source;
    final title = source?['filename'] as String? ?? '文档预览';

    return Scaffold(
      appBar: AppBar(
        title: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text(_error!, textAlign: TextAlign.center),
                  ),
                )
              : source == null
                  ? const Center(child: Text('无数据'))
                  : source['file_type'] == 'pdf'
                      ? _buildPdfPreview(source)
                      : _buildTextPreview(source),
    );
  }
}
