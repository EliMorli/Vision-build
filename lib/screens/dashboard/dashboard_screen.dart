import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:provider/provider.dart';
import '../../config/routes.dart';
import '../../config/theme.dart';
import '../../models/project_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/project_provider.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    final auth = context.read<AuthProvider>();
    if (auth.user != null) {
      context.read<ProjectProvider>().watchProjects(auth.user!.uid);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final projectProvider = context.watch<ProjectProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('VisionBuild'),
        actions: [
          if (auth.user?.photoUrl != null)
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: GestureDetector(
                onTap: () => _showProfileMenu(context),
                child: CircleAvatar(
                  radius: 16,
                  backgroundImage: NetworkImage(auth.user!.photoUrl!),
                ),
              ),
            )
          else
            IconButton(
              icon: const Icon(Icons.person),
              onPressed: () => _showProfileMenu(context),
            ),
        ],
      ),
      body: projectProvider.projects.isEmpty
          ? _buildEmptyState(context)
          : _buildProjectList(context, projectProvider.projects),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.pushNamed(context, AppRoutes.camera),
        icon: const Icon(Icons.add_a_photo),
        label: const Text('New Project'),
        backgroundColor: AppTheme.primary,
        foregroundColor: Colors.white,
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
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
                color: AppTheme.primary.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.home_work_outlined,
                size: 48,
                color: AppTheme.primary.withOpacity(0.5),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'No projects yet',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 12),
            Text(
              'Take a photo of any room to start visualizing your renovation.',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: AppTheme.textSecondary,
                  ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            ElevatedButton.icon(
              onPressed: () => Navigator.pushNamed(context, AppRoutes.camera),
              icon: const Icon(Icons.add_a_photo),
              label: const Text('Start Your First Project'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProjectList(
      BuildContext context, List<ProjectModel> projects) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: projects.length,
      itemBuilder: (context, index) {
        final project = projects[index];
        return _ProjectCard(
          project: project,
          onTap: () => _openProject(context, project),
        );
      },
    );
  }

  void _openProject(BuildContext context, ProjectModel project) {
    final projectProvider = context.read<ProjectProvider>();
    projectProvider.setCurrentProject(project);

    // Navigate based on project status
    switch (project.status) {
      case ProjectStatus.draft:
      case ProjectStatus.analyzed:
        // TODO: Navigate to editor with existing analysis
        break;
      case ProjectStatus.generated:
        Navigator.pushNamed(
          context,
          AppRoutes.result,
          arguments: project,
        );
        break;
      case ProjectStatus.connected:
      case ProjectStatus.completed:
        // Show project details / lead status
        break;
    }
  }

  void _showProfileMenu(BuildContext context) {
    final auth = context.read<AuthProvider>();
    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.person),
              title: Text(auth.user?.displayName ?? 'User'),
              subtitle: Text(auth.user?.email ?? ''),
            ),
            const Divider(),
            ListTile(
              leading: const Icon(Icons.logout),
              title: const Text('Sign Out'),
              onTap: () async {
                Navigator.pop(ctx);
                await auth.signOut();
                if (mounted) {
                  Navigator.of(context).pushReplacementNamed(AppRoutes.onboarding);
                }
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _ProjectCard extends StatelessWidget {
  final ProjectModel project;
  final VoidCallback onTap;

  const _ProjectCard({required this.project, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Thumbnail
            ClipRRect(
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(16)),
              child: SizedBox(
                height: 160,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    CachedNetworkImage(
                      imageUrl: project.selectedGenerationUrl ??
                          project.originalImageUrl,
                      fit: BoxFit.cover,
                      placeholder: (_, __) => Container(
                        color: AppTheme.surface,
                        child:
                            const Center(child: CircularProgressIndicator()),
                      ),
                    ),
                    Positioned(
                      top: 8,
                      right: 8,
                      child: _StatusChip(status: project.status),
                    ),
                  ],
                ),
              ),
            ),

            // Info
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    project.title,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    project.roomAnalysis?.rawAnalysis ?? 'Processing...',
                    style: Theme.of(context).textTheme.bodyMedium,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final ProjectStatus status;

  const _StatusChip({required this.status});

  @override
  Widget build(BuildContext context) {
    final (label, color) = switch (status) {
      ProjectStatus.draft => ('Draft', AppTheme.textSecondary),
      ProjectStatus.analyzed => ('Analyzed', AppTheme.accent),
      ProjectStatus.generated => ('Designs Ready', AppTheme.primary),
      ProjectStatus.connected => ('Contractors Matched', AppTheme.secondary),
      ProjectStatus.completed => ('Completed', AppTheme.secondary),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.9),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
