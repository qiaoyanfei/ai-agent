import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/branding.dart';
import '../../core/config.dart';
import '../../core/native_bridge.dart';
import '../../core/theme.dart';
import '../../providers/app_providers.dart';

class SettingsPage extends ConsumerStatefulWidget {
  const SettingsPage({super.key});

  @override
  ConsumerState<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends ConsumerState<SettingsPage> {
  Map<String, String>? _deviceInfo;
  bool _loadingNative = true;

  @override
  void initState() {
    super.initState();
    _loadNative();
  }

  Future<void> _loadNative() async {
    final info = await NativeBridge.getDeviceInfo();
    if (mounted) {
      setState(() {
        _deviceInfo = info;
        _loadingNative = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final themeMode = ref.watch(themeModeProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(title: const Text('设置')),
      body: ListView(
        children: [
          const SizedBox(height: 8),
          ListTile(
            leading: Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: isDark ? AppColors.primaryLightDark : AppColors.primaryLight,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.auto_stories, color: AppColors.primary),
            ),
            title: Text(AppBranding.name, style: const TextStyle(fontWeight: FontWeight.w600)),
            subtitle: Text(AppBranding.tagline),
          ),
          const Divider(),
          const ListTile(
            title: Text('外观'),
            subtitle: Text('跟随系统 / 浅色 / 深色'),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: SegmentedButton<ThemeMode>(
              segments: const [
                ButtonSegment(value: ThemeMode.system, label: Text('系统'), icon: Icon(Icons.brightness_auto)),
                ButtonSegment(value: ThemeMode.light, label: Text('浅色'), icon: Icon(Icons.light_mode)),
                ButtonSegment(value: ThemeMode.dark, label: Text('深色'), icon: Icon(Icons.dark_mode)),
              ],
              selected: {themeMode},
              onSelectionChanged: (s) => ref.read(themeModeProvider.notifier).setMode(s.first),
            ),
          ),
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 24, 16, 8),
            child: Text('关于', style: TextStyle(fontWeight: FontWeight.w600)),
          ),
          ListTile(
            title: const Text('产品说明'),
            subtitle: Text(AppBranding.aboutDescription),
          ),
          ListTile(
            title: const Text('API 地址'),
            subtitle: Text(apiBaseUrl),
          ),
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Text('原生桥接（Platform Channel）', style: TextStyle(fontWeight: FontWeight.w600)),
          ),
          if (_loadingNative)
            const ListTile(title: Text('加载设备信息…'))
          else
            ..._deviceInfo!.entries.map(
              (e) => ListTile(
                dense: true,
                title: Text(e.key),
                trailing: Text(e.value, style: const TextStyle(color: AppColors.textSecondary)),
              ),
            ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}
