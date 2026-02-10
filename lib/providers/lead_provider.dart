import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import '../models/project_model.dart';
import '../models/contractor_model.dart';
import '../models/lead_model.dart';
import '../services/firestore_service.dart';
import '../services/gemini_service.dart';

class LeadProvider extends ChangeNotifier {
  final FirestoreService _firestoreService = FirestoreService();
  final GeminiService _geminiService = GeminiService();
  final _uuid = const Uuid();

  List<ContractorModel> _matchedContractors = [];
  LeadEmailResult? _emailResult;
  bool _isLoading = false;
  String? _error;
  String _progressMessage = '';

  List<ContractorModel> get matchedContractors => _matchedContractors;
  LeadEmailResult? get emailResult => _emailResult;
  bool get isLoading => _isLoading;
  String? get error => _error;
  String get progressMessage => _progressMessage;

  /// Step 3a: Generate the lead email using Gemini Pro.
  Future<LeadEmailResult?> generateProjectBrief({
    required Uint8List currentImage,
    required Uint8List goalImage,
    required String zipCode,
    required String budgetRange,
    required String userName,
    required String roomType,
  }) async {
    _isLoading = true;
    _progressMessage = 'Generating project brief...';
    _error = null;
    notifyListeners();

    try {
      _emailResult = await _geminiService.generateLeadEmail(
        currentImage: currentImage,
        goalImage: goalImage,
        zipCode: zipCode,
        budgetRange: budgetRange,
        userName: userName,
        roomType: roomType,
      );

      _isLoading = false;
      notifyListeners();
      return _emailResult;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  /// Step 3b: Find matching contractors by zip code.
  Future<List<ContractorModel>> findContractors({
    required String zipCode,
    required String roomType,
  }) async {
    _isLoading = true;
    _progressMessage = 'Finding local contractors...';
    _error = null;
    notifyListeners();

    try {
      _matchedContractors = await _firestoreService.findContractorsByZip(
        zipCode,
        specialties: [roomType],
      );

      _isLoading = false;
      notifyListeners();
      return _matchedContractors;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return [];
    }
  }

  /// Step 3c: Dispatch leads to matched contractors.
  Future<void> dispatchLeads({
    required ProjectModel project,
    required String budgetRange,
    required String zipCode,
  }) async {
    if (_emailResult == null || _matchedContractors.isEmpty) return;

    _isLoading = true;
    _progressMessage = 'Sending leads to contractors...';
    notifyListeners();

    try {
      for (final contractor in _matchedContractors) {
        final lead = LeadModel(
          id: _uuid.v4(),
          projectId: project.id,
          userId: project.userId,
          contractorId: contractor.id,
          emailSubject: _emailResult!.emailSubject,
          emailBody: _emailResult!.emailBody,
          originalImageUrl: project.originalImageUrl,
          generatedImageUrl: project.selectedGenerationUrl ?? '',
          budgetRange: budgetRange,
          zipCode: zipCode,
          scopeOfWork: _emailResult!.scopeOfWork,
          status: LeadStatus.pending,
          createdAt: DateTime.now(),
        );

        await _firestoreService.createLead(lead);
      }

      _isLoading = false;
      _progressMessage = 'Leads sent!';
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  void clearState() {
    _matchedContractors = [];
    _emailResult = null;
    _error = null;
    notifyListeners();
  }
}
