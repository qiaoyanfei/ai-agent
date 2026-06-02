import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mind_vault/core/branding.dart';
import 'package:mind_vault/widgets/empty_state.dart';

void main() {
  testWidgets('EmptyState shows branding-related copy', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: EmptyState(
            icon: Icons.folder_open_outlined,
            title: '还没有知识库',
            subtitle: '创建第一个知识库',
          ),
        ),
      ),
    );

    expect(find.text('还没有知识库'), findsOneWidget);
    expect(find.text(AppBranding.name), findsNothing);
  });

  test('AppBranding has Chinese product name', () {
    expect(AppBranding.name, '知库');
    expect(AppBranding.fullTitle, contains('知库'));
  });
}
