/// Normalize and ensure citation markers [1]..[n] in assistant answers.
library;

int citationSourceCount(List<dynamic> citations) {
  final docIds = <int>{};
  for (final raw in citations) {
    if (raw is! Map) continue;
    final id = raw['document_id'] as int?;
    if (id != null) docIds.add(id);
  }
  return docIds.isEmpty ? citations.length : docIds.length;
}

String normalizeAnswerCitations(String text, List<dynamic> citations) {
  if (text.isEmpty || citations.isEmpty) return text;

  final n = citationSourceCount(citations);
  final chunkIndexToRef = <int, int>{};
  for (final raw in citations) {
    if (raw is! Map) continue;
    final c = Map<String, dynamic>.from(raw);
    final ref = c['ref'] as int?;
    final chunkIndex = c['chunk_index'] as int?;
    if (ref != null && chunkIndex != null) chunkIndexToRef[chunkIndex] = ref;
  }

  var out = text.replaceAllMapped(RegExp(r'片段#(\d+)'), (m) {
    final ref = chunkIndexToRef[int.parse(m.group(1)!)];
    return ref != null ? '[$ref]' : m.group(0)!;
  });

  for (final pattern in [RegExp(r'【(\d+)】'), RegExp(r'《(\d+)》')]) {
    out = out.replaceAllMapped(pattern, (m) {
      final ref = int.parse(m.group(1)!);
      return (ref >= 1 && ref <= n) ? '[$ref]' : m.group(0)!;
    });
  }

  for (final pattern in [
    RegExp(r'来源\s*(\d+)'),
    RegExp(r'文档\s*(\d+)'),
    RegExp(r'文献\s*(\d+)'),
  ]) {
    out = out.replaceAllMapped(pattern, (m) {
      final ref = int.parse(m.group(1)!);
      return (ref >= 1 && ref <= n) ? '[$ref]' : m.group(0)!;
    });
  }

  out = out.replaceAllMapped(RegExp(r'\[(\d+)\]'), (m) {
    final ref = int.parse(m.group(1)!);
    return (ref >= 1 && ref <= n) ? '[$ref]' : m.group(1)!;
  });

  return out;
}

String ensureCitationMarkers(String text, List<dynamic> citations) {
  if (text.isEmpty || citations.isEmpty) return text;
  if (RegExp(r'\[\d+\]').hasMatch(text)) return text;

  final refs = <int>{};
  for (final raw in citations) {
    if (raw is! Map) continue;
    final ref = raw['ref'] as int?;
    if (ref != null) refs.add(ref);
  }
  final sorted = refs.toList()..sort();
  if (sorted.isEmpty) {
    for (var i = 1; i <= citationSourceCount(citations); i++) {
      sorted.add(i);
    }
  }
  final markers = sorted.map((r) => '[$r]').join();
  return '${text.trim()}\n\n$markers';
}

String prepareAnswerWithCitations(String text, List<dynamic> citations) {
  return ensureCitationMarkers(normalizeAnswerCitations(text, citations), citations);
}

Map<int, int> citationRefToChunkId(List<dynamic> citations) {
  final map = <int, int>{};
  for (final raw in citations) {
    if (raw is! Map) continue;
    final c = Map<String, dynamic>.from(raw);
    final ref = c['ref'] as int?;
    final chunkId = c['chunk_id'] as int?;
    if (ref != null && chunkId != null) map[ref] = chunkId;
  }
  return map;
}
