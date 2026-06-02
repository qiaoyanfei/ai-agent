/// 产品品牌（对外展示名，与 pubspec 包名 mind_vault 可分离）
abstract final class AppBranding {
  static const String name = '知库';
  static const String tagline = 'AI 知识库问答';
  static const String fullTitle = '$name · $tagline';
  static const String loginSubtitle = '上传文档，基于你的资料智能问答';
  static const String aboutDescription =
      '知库帮助你将 PDF、TXT、Markdown 整理成个人知识库，'
      '通过 RAG 检索与大模型生成可追溯来源的问答。';
  static const String nativeChannel = 'com.aiagent.mind_vault/native';
}
