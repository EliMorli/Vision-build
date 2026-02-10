import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_config.dart';
import '../../config/routes.dart';
import '../../config/theme.dart';
import '../../models/project_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/lead_provider.dart';

class LeadHandoffScreenArgs {
  final ProjectModel project;

  const LeadHandoffScreenArgs({required this.project});
}

class LeadHandoffScreen extends StatefulWidget {
  final LeadHandoffScreenArgs args;

  const LeadHandoffScreen({super.key, required this.args});

  @override
  State<LeadHandoffScreen> createState() => _LeadHandoffScreenState();
}

class _LeadHandoffScreenState extends State<LeadHandoffScreen> {
  final _zipController = TextEditingController();
  String? _selectedBudget;
  int _step = 0; // 0 = input, 1 = brief preview, 2 = success

  @override
  void dispose() {
    _zipController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Get Estimates'),
      ),
      body: SafeArea(
        child: switch (_step) {
          0 => _buildInputStep(context),
          1 => _buildBriefPreview(context),
          2 => _buildSuccess(context),
          _ => const SizedBox(),
        },
      ),
    );
  }

  // ─── Step 0: Budget & Zip ──────────────────────────────────

  Widget _buildInputStep(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Almost there!',
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          const SizedBox(height: 8),
          Text(
            'We need a couple of details to match you with the best local contractors.',
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: AppTheme.textSecondary,
                ),
          ),
          const SizedBox(height: 32),

          // Budget
          Text('Budget Range',
              style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: AppConfig.budgetRanges
                .map((range) => ChoiceChip(
                      label: Text(range),
                      selected: _selectedBudget == range,
                      onSelected: (_) =>
                          setState(() => _selectedBudget = range),
                      selectedColor: AppTheme.primary.withOpacity(0.15),
                      checkmarkColor: AppTheme.primary,
                    ))
                .toList(),
          ),

          const SizedBox(height: 24),

          // Zip
          Text('Zip Code', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          TextField(
            controller: _zipController,
            keyboardType: TextInputType.number,
            maxLength: 5,
            decoration: const InputDecoration(
              hintText: 'Enter your zip code',
              counterText: '',
            ),
          ),

          const SizedBox(height: 32),

          ElevatedButton.icon(
            onPressed: _canProceed ? () => _generateBrief(context) : null,
            icon: const Icon(Icons.description),
            label: const Text('Generate Project Brief'),
            style: ElevatedButton.styleFrom(
              minimumSize: const Size(double.infinity, 52),
            ),
          ),
        ],
      ),
    );
  }

  bool get _canProceed =>
      _selectedBudget != null && _zipController.text.length == 5;

  // ─── Step 1: Brief Preview ─────────────────────────────────

  Widget _buildBriefPreview(BuildContext context) {
    final leadProvider = context.watch<LeadProvider>();

    if (leadProvider.isLoading) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 16),
            Text(
              leadProvider.progressMessage,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
        ),
      );
    }

    final email = leadProvider.emailResult;
    if (email == null) return const SizedBox();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Icon(Icons.check_circle, color: AppTheme.secondary),
              const SizedBox(width: 8),
              Text('Project Brief Generated',
                  style: Theme.of(context).textTheme.titleLarge),
            ],
          ),
          const SizedBox(height: 16),

          // Email preview card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Subject: ${email.emailSubject}',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                  const Divider(height: 24),

                  Text('Scope of Work:',
                      style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 8),
                  ...email.scopeOfWork.map(
                    (item) => Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('  \u2022  '),
                          Expanded(child: Text(item)),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 16),
                  Text(
                    email.emailBody,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Contractor matches
          if (leadProvider.matchedContractors.isNotEmpty) ...[
            Text(
              'Matched ${leadProvider.matchedContractors.length} Contractors',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            ...leadProvider.matchedContractors.map(
              (c) => ListTile(
                leading: CircleAvatar(
                  backgroundColor: AppTheme.primary.withOpacity(0.1),
                  child:
                      Icon(Icons.business, color: AppTheme.primary, size: 20),
                ),
                title: Text(c.businessName),
                subtitle: Text('${c.city} \u2022 ${c.specialties.join(", ")}'),
                trailing:
                    Text('${c.rating}/5', style: const TextStyle(fontSize: 13)),
              ),
            ),
          ],

          const SizedBox(height: 24),

          ElevatedButton.icon(
            onPressed: () => _dispatch(context),
            icon: const Icon(Icons.send),
            label: const Text('Connect with Contractors'),
            style: ElevatedButton.styleFrom(
              minimumSize: const Size(double.infinity, 52),
              backgroundColor: AppTheme.secondary,
            ),
          ),
        ],
      ),
    );
  }

  // ─── Step 2: Success ───────────────────────────────────────

  Widget _buildSuccess(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: AppTheme.secondary.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.check_circle,
                size: 56,
                color: AppTheme.secondary,
              ),
            ),
            const SizedBox(height: 32),
            Text(
              'Leads Sent!',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 12),
            Text(
              'Your project brief has been sent to matched contractors. '
              'You\'ll receive responses within 24-48 hours.',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: AppTheme.textSecondary,
                  ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 40),
            ElevatedButton(
              onPressed: () => Navigator.of(context)
                  .pushNamedAndRemoveUntil(AppRoutes.dashboard, (_) => false),
              child: const Text('Back to Dashboard'),
            ),
          ],
        ),
      ),
    );
  }

  // ─── Actions ───────────────────────────────────────────────

  Future<void> _generateBrief(BuildContext context) async {
    setState(() => _step = 1);

    final auth = context.read<AuthProvider>();
    final leadProvider = context.read<LeadProvider>();
    final project = widget.args.project;

    // In production, download the actual image bytes from Firebase Storage.
    // For now, we pass empty bytes as a placeholder.
    final currentImage = Uint8List(0); // TODO: Download from Storage
    final goalImage = Uint8List(0); // TODO: Download from Storage

    await leadProvider.generateProjectBrief(
      currentImage: currentImage,
      goalImage: goalImage,
      zipCode: _zipController.text,
      budgetRange: _selectedBudget!,
      userName: auth.user?.displayName ?? '',
      roomType: project.roomAnalysis?.roomType ?? 'room',
    );

    await leadProvider.findContractors(
      zipCode: _zipController.text,
      roomType: project.roomAnalysis?.roomType ?? 'renovation',
    );
  }

  Future<void> _dispatch(BuildContext context) async {
    final leadProvider = context.read<LeadProvider>();

    await leadProvider.dispatchLeads(
      project: widget.args.project,
      budgetRange: _selectedBudget!,
      zipCode: _zipController.text,
    );

    setState(() => _step = 2);
  }
}
