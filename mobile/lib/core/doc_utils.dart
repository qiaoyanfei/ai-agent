bool isEditableDocumentFilename(String filename) {
  final lower = filename.toLowerCase();
  return lower.endsWith('.md') ||
      lower.endsWith('.markdown') ||
      lower.endsWith('.txt');
}

bool isMarkdownFilename(String filename) {
  final lower = filename.toLowerCase();
  return lower.endsWith('.md') || lower.endsWith('.markdown');
}
