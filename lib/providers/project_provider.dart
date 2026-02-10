import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import '../models/project_model.dart';
import '../models/style_option.dart';
import '../services/firestore_service.dart';
import '../services/storage_service.dart';
import '../services/gemini_service.dart';
import '../services/imagen_service.dart';

class ProjectProvider extends ChangeNotifier {
  final FirestoreService _firestoreService = FirestoreService();
  final StorageService _storageService = StorageService();
  final GeminiService _geminiService = GeminiService();
  final ImagenService _imagenService = ImagenService();
  final _uuid = const Uuid();

  List<ProjectModel> _projects = [];
  ProjectModel? _currentProject;
  bool _isLoading = false;
  String? _error;
  double _progress = 0.0;
  String _progressMessage = '';

  List<ProjectModel> get projects => _projects;
  ProjectModel? get currentProject => _currentProject;
  bool get isLoading => _isLoading;
  String? get error => _error;
  double get progress => _progress;
  String get progressMessage => _progressMessage;

  // ─── Project CRUD ──────────────────────────────────────────

  void watchProjects(String userId) {
    _firestoreService.watchProjects(userId).listen((projects) {
      _projects = projects;
      notifyListeners();
    });
  }

  // ─── Upload & Analyze ──────────────────────────────────────

  /// Step 1: Upload the room photo and run AI analysis.
  Future<ProjectModel?> uploadAndAnalyze({
    required String userId,
    required File imageFile,
  }) async {
    _isLoading = true;
    _progress = 0.0;
    _progressMessage = 'Uploading photo...';
    _error = null;
    notifyListeners();

    try {
      // Upload image
      _progress = 0.2;
      notifyListeners();
      final imageUrl = await _storageService.uploadRoomPhoto(
        userId,
        imageFile,
      );

      // Analyze with Gemini
      _progress = 0.5;
      _progressMessage = 'Analyzing your room...';
      notifyListeners();
      final analysis = await _geminiService.analyzeRoom(imageFile);

      // Create project
      _progress = 0.8;
      _progressMessage = 'Creating project...';
      notifyListeners();

      final now = DateTime.now();
      final project = ProjectModel(
        id: _uuid.v4(),
        userId: userId,
        title: '${analysis.roomType} Renovation',
        originalImageUrl: imageUrl,
        roomAnalysis: analysis,
        status: ProjectStatus.analyzed,
        createdAt: now,
        updatedAt: now,
      );

      await _firestoreService.createProject(project);

      _currentProject = project;
      _progress = 1.0;
      _progressMessage = 'Done!';
      _isLoading = false;
      notifyListeners();

      return project;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  // ─── Generate Designs ──────────────────────────────────────

  /// Step 2: Generate design options using Imagen 3.
  Future<ProjectModel?> generateDesigns({
    required String userId,
    required ProjectModel project,
    required StyleOption style,
    required String accessToken,
    required Uint8List originalImageBytes,
  }) async {
    _isLoading = true;
    _progress = 0.0;
    _progressMessage = 'Generating designs...';
    _error = null;
    notifyListeners();

    try {
      // Call Imagen
      _progress = 0.3;
      notifyListeners();

      final images = await _imagenService.generateDesigns(
        originalImageBytes: originalImageBytes,
        stylePrompt: style.promptModifier,
        roomAnalysis: project.roomAnalysis?.rawAnalysis ?? '',
        accessToken: accessToken,
      );

      // Upload generated images
      _progress = 0.7;
      _progressMessage = 'Saving designs...';
      notifyListeners();

      final urls = <String>[];
      for (var i = 0; i < images.length; i++) {
        final url = await _storageService.uploadGeneratedImage(
          userId,
          project.id,
          images[i],
          i,
        );
        urls.add(url);
      }

      // Update project
      final updated = project.copyWith(
        selectedStyle: style.id,
        generatedImageUrls: urls,
        status: ProjectStatus.generated,
        updatedAt: DateTime.now(),
      );
      await _firestoreService.updateProject(updated);

      _currentProject = updated;
      _progress = 1.0;
      _isLoading = false;
      notifyListeners();

      return updated;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  // ─── Select Design ────────────────────────────────────────

  Future<void> selectDesign(
    ProjectModel project,
    String selectedUrl,
  ) async {
    final updated = project.copyWith(
      selectedGenerationUrl: selectedUrl,
      updatedAt: DateTime.now(),
    );
    await _firestoreService.updateProject(updated);
    _currentProject = updated;
    notifyListeners();
  }

  void setCurrentProject(ProjectModel project) {
    _currentProject = project;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
