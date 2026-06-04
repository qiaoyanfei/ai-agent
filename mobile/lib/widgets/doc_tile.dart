import 'package:flutter/material.dart';

import '../core/doc_utils.dart';
import '../core/theme.dart';
import 'status_chip.dart';

class DocTile extends StatelessWidget {
  const DocTile({
    super.key,
    required this.filename,
    required this.status,
    this.errorMessage,
    this.onTap,
    this.onDelete,
  });

  final String filename;
  final String status;
  final String? errorMessage;
  final VoidCallback? onTap;
  final VoidCallback? onDelete;

  IconData _fileIcon() {
    final lower = filename.toLowerCase();
    if (lower.endsWith('.pdf')) return Icons.picture_as_pdf_outlined;
    if (lower.endsWith('.md') || lower.endsWith('.markdown')) return Icons.article_outlined;
    return Icons.description_outlined;
  }

  @override
  Widget build(BuildContext context) {
    final canEdit = isEditableDocumentFilename(filename);
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        onTap: canEdit ? onTap : null,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: AppColors.primaryLight,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(_fileIcon(), color: AppColors.primary),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    filename,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  DocumentStatusChip(status: status),
                  if (status == 'failed' && errorMessage != null && errorMessage!.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(
                      errorMessage!,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 12, color: Colors.red.shade700),
                    ),
                  ],
                ],
              ),
            ),
            if (status == 'processing' || status == 'pending')
              const SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            else if (onDelete != null)
              IconButton(
                icon: const Icon(Icons.delete_outline),
                tooltip: '删除',
                onPressed: onDelete,
              ),
          ],
        ),
        ),
      ),
    );
  }
}
