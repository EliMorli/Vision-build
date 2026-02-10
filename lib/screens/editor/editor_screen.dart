import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/routes.dart';
import '../../config/theme.dart';
import '../../models/project_model.dart';
import '../../models/style_option.dart';
import '../../providers/auth_provider.dart';
import '../../providers/project_provider.dart';
import '../result/result_screen.dart';

class EditorScreenArgs {
  final ProjectModel project;
  final File imageFile;

  const EditorScreenArgs({required this.project, required this.imageFile});
}

class EditorScreen extends StatefulWidget {
  final EditorScreenArgs args;

  const EditorScreen({super.key, required this.args});

  @override
  State<EditorScreen> createState() => _EditorScreenState();
}

class _EditorScreenState extends State<EditorScreen> {
  StyleOption? _selectedStyle;

  @override
  Widget build(BuildContext context) {
    final projectProvider = context.watch<ProjectProvider>();
    final analysis = widget.args.project.roomAnalysis;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Choose Your Style'),
      ),
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Room analysis summary
            if (analysis != null)
              Container(
                margin: const EdgeInsets.all(16),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.primary.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: AppTheme.primary.withOpacity(0.2),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.check_circle,
                            color: AppTheme.secondary, size: 20),
                        const SizedBox(width: 8),
                        Text(
                          'Room Analyzed',
                          style:
                              Theme.of(context).textTheme.titleMedium?.copyWith(
                                    color: AppTheme.secondary,
                                  ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '${_capitalize(analysis.roomType)}, '
                      'approx ${analysis.estimatedSqFt} sq ft, '
                      '${analysis.currentStyle}',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    if (analysis.keyElements.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: analysis.keyElements
                            .map((e) => Chip(
                                  label: Text(e,
                                      style: const TextStyle(fontSize: 12)),
                                  backgroundColor:
                                      AppTheme.primary.withOpacity(0.1),
                                  padding: EdgeInsets.zero,
                                  materialTapTargetSize:
                                      MaterialTapTargetSize.shrinkWrap,
                                ))
                            .toList(),
                      ),
                    ],
                  ],
                ),
              ),

            // Style grid
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                'Select a Design Style',
                style: Theme.of(context).textTheme.titleLarge,
              ),
            ),
            const SizedBox(height: 12),

            Expanded(
              child: GridView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  childAspectRatio: 1.2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                ),
                itemCount: StyleOption.allStyles.length,
                itemBuilder: (context, index) {
                  final style = StyleOption.allStyles[index];
                  final isSelected = _selectedStyle?.id == style.id;

                  return InkWell(
                    onTap: () => setState(() => _selectedStyle = style),
                    borderRadius: BorderRadius.circular(16),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? AppTheme.primary.withOpacity(0.1)
                            : Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isSelected
                              ? AppTheme.primary
                              : const Color(0xFFDADCE0),
                          width: isSelected ? 2 : 1,
                        ),
                      ),
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            _styleIcon(style.id),
                            size: 32,
                            color: isSelected
                                ? AppTheme.primary
                                : AppTheme.textSecondary,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            style.name,
                            style: Theme.of(context)
                                .textTheme
                                .titleMedium
                                ?.copyWith(
                                  color: isSelected
                                      ? AppTheme.primary
                                      : AppTheme.textPrimary,
                                ),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            style.description,
                            style: Theme.of(context).textTheme.bodyMedium,
                            textAlign: TextAlign.center,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),

            // Generate button
            Padding(
              padding: const EdgeInsets.all(16),
              child: projectProvider.isLoading
                  ? Column(
                      children: [
                        LinearProgressIndicator(
                          value: projectProvider.progress,
                          backgroundColor: AppTheme.primary.withOpacity(0.1),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          projectProvider.progressMessage,
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ],
                    )
                  : ElevatedButton.icon(
                      onPressed:
                          _selectedStyle != null ? () => _generate(context) : null,
                      icon: const Icon(Icons.auto_awesome),
                      label: const Text('Generate 4 Designs'),
                      style: ElevatedButton.styleFrom(
                        minimumSize: const Size(double.infinity, 52),
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  IconData _styleIcon(String styleId) {
    switch (styleId) {
      case 'modern':
        return Icons.crop_square;
      case 'industrial':
        return Icons.factory;
      case 'farmhouse':
        return Icons.cottage;
      case 'coastal':
        return Icons.waves;
      case 'midcentury':
        return Icons.weekend;
      case 'scandinavian':
        return Icons.ac_unit;
      case 'luxury':
        return Icons.diamond;
      case 'transitional':
        return Icons.compare;
      default:
        return Icons.style;
    }
  }

  String _capitalize(String s) {
    if (s.isEmpty) return s;
    return s[0].toUpperCase() + s.substring(1).replaceAll('_', ' ');
  }

  Future<void> _generate(BuildContext context) async {
    if (_selectedStyle == null) return;

    final auth = context.read<AuthProvider>();
    final projectProvider = context.read<ProjectProvider>();
    final userId = auth.user?.uid;
    if (userId == null) return;

    final imageBytes = await widget.args.imageFile.readAsBytes();

    // In production, obtain the access token from Firebase Auth
    // or a server-side token exchange for Vertex AI.
    const accessToken = ''; // TODO: Implement token retrieval

    final result = await projectProvider.generateDesigns(
      userId: userId,
      project: widget.args.project,
      style: _selectedStyle!,
      accessToken: accessToken,
      originalImageBytes: Uint8List.fromList(imageBytes),
    );

    if (result != null && mounted) {
      Navigator.of(context).pushNamed(
        AppRoutes.result,
        arguments: ResultScreenArgs(project: result),
      );
    }
  }
}
