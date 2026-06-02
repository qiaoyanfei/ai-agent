import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';

import '../core/citation_text.dart';
import '../core/theme.dart';
import 'citation_rich_text.dart';

class ChatBubble extends StatelessWidget {
  const ChatBubble({
    super.key,
    required this.isUser,
    required this.content,
    required this.collectionId,
    this.isStreaming = false,
    this.citations = const [],
  });

  final bool isUser;
  final String content;
  final int collectionId;
  final bool isStreaming;
  final List<dynamic> citations;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final display = content.isEmpty && isStreaming ? '思考中…' : content;
    final radius = BorderRadius.only(
      topLeft: const Radius.circular(16),
      topRight: const Radius.circular(16),
      bottomLeft: Radius.circular(isUser ? 16 : 4),
      bottomRight: Radius.circular(isUser ? 4 : 16),
    );
    final assistantBg = isDark ? AppColors.assistantBubbleDark : AppColors.assistantBubble;
    final textColor = isUser ? Colors.white : (isDark ? Colors.white : AppColors.textPrimary);
    final textStyle = TextStyle(fontSize: 15, height: 1.45, color: textColor);
    final linkStyle = citationLinkStyle(isDark: isDark);

    final assistantText = prepareAnswerWithCitations(display, citations);
    final hasCitationMarkers =
        !isUser && citations.isNotEmpty && RegExp(r'\[\d+\]').hasMatch(assistantText);

    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isUser) ...[
            CircleAvatar(
              radius: 16,
              backgroundColor: isDark ? AppColors.primaryLightDark : AppColors.primaryLight,
              child: const Icon(Icons.auto_awesome, size: 18, color: AppColors.primary),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Container(
              margin: const EdgeInsets.symmetric(vertical: 6),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
              decoration: BoxDecoration(
                color: isUser ? AppColors.userBubble : assistantBg,
                borderRadius: radius,
                border: isUser ? null : Border.all(color: isDark ? AppColors.borderDark : AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (isUser || display == '思考中…')
                    SelectableText(
                      display,
                      style: TextStyle(
                        fontSize: 15,
                        height: 1.45,
                        color: textColor,
                        fontStyle: display == '思考中…' ? FontStyle.italic : FontStyle.normal,
                      ),
                    )
                  else if (hasCitationMarkers)
                    CitationRichText(
                      text: assistantText,
                      citations: citations,
                      collectionId: collectionId,
                      textStyle: textStyle,
                      linkStyle: linkStyle,
                    )
                  else
                    MarkdownBody(
                      data: display,
                      selectable: true,
                      styleSheet: MarkdownStyleSheet(
                        p: textStyle,
                        code: TextStyle(
                          fontSize: 13,
                          backgroundColor: isDark ? Colors.black26 : Colors.black12,
                          color: textColor,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
          if (isUser) const SizedBox(width: 4),
        ],
      ),
    );
  }
}
