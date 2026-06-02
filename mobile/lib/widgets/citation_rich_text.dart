import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/citation_text.dart';
import '../core/theme.dart';

/// Renders answer text with literal [1] labels (not markdown link "1").
class CitationRichText extends StatelessWidget {
  const CitationRichText({
    super.key,
    required this.text,
    required this.citations,
    required this.collectionId,
    required this.textStyle,
    required this.linkStyle,
  });

  final String text;
  final List<dynamic> citations;
  final int collectionId;
  final TextStyle textStyle;
  final TextStyle linkStyle;

  @override
  Widget build(BuildContext context) {
    final refToChunk = citationRefToChunkId(citations);
    final spans = <InlineSpan>[];
    final re = RegExp(r'\[(\d+)\]');
    var last = 0;

    for (final m in re.allMatches(text)) {
      if (m.start > last) {
        spans.add(TextSpan(text: text.substring(last, m.start), style: textStyle));
      }
      final ref = int.parse(m.group(1)!);
      final chunkId = refToChunk[ref];
      if (chunkId != null) {
        spans.add(TextSpan(
          text: '[$ref]',
          style: linkStyle,
          recognizer: TapGestureRecognizer()
            ..onTap = () => context.push(
                  '/collections/$collectionId/chunks/$chunkId/preview',
                ),
        ));
      } else {
        spans.add(TextSpan(text: m.group(0)!, style: textStyle));
      }
      last = m.end;
    }
    if (last < text.length) {
      spans.add(TextSpan(text: text.substring(last), style: textStyle));
    }

    return SelectableText.rich(
      TextSpan(children: spans),
      style: textStyle,
    );
  }
}

TextStyle citationLinkStyle({required bool isDark}) {
  return TextStyle(
    fontSize: 15,
    color: AppColors.primary,
    fontWeight: FontWeight.w600,
    decoration: TextDecoration.underline,
    decorationColor: AppColors.primary,
  );
}
