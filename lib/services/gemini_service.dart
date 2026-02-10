import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:google_generative_ai/google_generative_ai.dart';
import '../config/app_config.dart';
import '../models/project_model.dart';

class GeminiService {
  late final GenerativeModel _flashModel;
  late final GenerativeModel _proModel;

  GeminiService() {
    _flashModel = GenerativeModel(
      model: 'gemini-1.5-flash',
      apiKey: AppConfig.geminiApiKey,
    );
    _proModel = GenerativeModel(
      model: 'gemini-1.5-pro',
      apiKey: AppConfig.geminiApiKey,
    );
  }

  // ─── Room Analysis (Gemini Flash — fast & cheap) ───────────

  /// Analyze a room photo and return structured analysis data.
  Future<RoomAnalysis> analyzeRoom(File imageFile) async {
    final imageBytes = await imageFile.readAsBytes();

    final prompt = Content.multi([
      TextPart(_roomAnalysisPrompt),
      DataPart('image/jpeg', imageBytes),
    ]);

    final response = await _flashModel.generateContent([prompt]);
    final text = response.text ?? '';

    return _parseRoomAnalysis(text);
  }

  /// Analyze a room photo from bytes (e.g., from Firebase Storage).
  Future<RoomAnalysis> analyzeRoomFromBytes(Uint8List imageBytes) async {
    final prompt = Content.multi([
      TextPart(_roomAnalysisPrompt),
      DataPart('image/jpeg', imageBytes),
    ]);

    final response = await _flashModel.generateContent([prompt]);
    final text = response.text ?? '';

    return _parseRoomAnalysis(text);
  }

  // ─── Lead Email Generation (Gemini Pro — smart & thorough) ─

  /// Generate the "Perfect Lead" contractor email by comparing
  /// the original room photo with the generated design.
  Future<LeadEmailResult> generateLeadEmail({
    required Uint8List currentImage,
    required Uint8List goalImage,
    required String zipCode,
    required String budgetRange,
    required String userName,
    required String roomType,
  }) async {
    final prompt = Content.multi([
      TextPart(_leadEmailPrompt(
        zipCode: zipCode,
        budgetRange: budgetRange,
        userName: userName,
        roomType: roomType,
      )),
      TextPart('Image A — Current State:'),
      DataPart('image/jpeg', currentImage),
      TextPart('Image B — Goal State:'),
      DataPart('image/png', goalImage),
    ]);

    final response = await _proModel.generateContent([prompt]);
    final text = response.text ?? '';

    return _parseLeadEmail(text, zipCode, budgetRange);
  }

  // ─── Prompts ───────────────────────────────────────────────

  static const String _roomAnalysisPrompt = '''
You are an expert interior designer and construction analyst. Analyze the
provided room photo and return ONLY a valid JSON object (no markdown, no
explanation) with this exact schema:

{
  "roomType": "kitchen|bathroom|bedroom|living_room|dining_room|office|other",
  "currentStyle": "a short style description, e.g. dated oak traditional",
  "estimatedSqFt": 150,
  "keyElements": [
    "oak cabinets",
    "tile flooring",
    "fluorescent lighting",
    "laminate countertops"
  ],
  "rawAnalysis": "A 2-3 sentence human-readable summary of what you see."
}

Be specific about materials, finishes, and notable features. Estimate
square footage based on visual cues. Identify elements that would need
to change in a renovation.
''';

  static String _leadEmailPrompt({
    required String zipCode,
    required String budgetRange,
    required String userName,
    required String roomType,
  }) =>
      '''
You are an expert construction project manager. You will receive two images:
"Current State" (Image A) and "Goal State" (Image B).

1. Compare the images. Identify the specific work required to transform
   from State A to State B (e.g., "Replace flooring", "Paint cabinets",
   "Install island").
2. Do NOT suggest structural changes (moving walls) unless the difference
   between the images obviously requires it.
3. Draft a high-conversion email to a contractor that summarizes this job
   professionally.

Return ONLY a valid JSON object (no markdown) with this schema:

{
  "emailSubject": "New Lead: $roomType Remodel in $zipCode - Budget $budgetRange",
  "scopeOfWork": [
    "Flooring: Replace tile with hardwood/LVP",
    "Cabinets: Reface existing layout (Dark Grey) + New Hardware",
    "Lighting: Install recessed lighting and pendant over island"
  ],
  "projectType": "Kitchen Modernization",
  "emailBody": "The full professional email body as a string. Include:\\n- Project Snapshot (type, budget, timeline)\\n- Scope of Work (bulleted)\\n- A note that before/after photos are available via link.\\nSign off as VisionBuild."
}

Client context:
- Name: $userName
- Zip Code: $zipCode
- Budget Range: $budgetRange
- Room Type: $roomType
- Timeline: Flexible
''';

  // ─── Parsing ───────────────────────────────────────────────

  RoomAnalysis _parseRoomAnalysis(String text) {
    try {
      // Strip markdown fencing if present
      final cleaned = text
          .replaceAll(RegExp(r'```json\s*'), '')
          .replaceAll(RegExp(r'```\s*'), '')
          .trim();
      final json = jsonDecode(cleaned) as Map<String, dynamic>;
      return RoomAnalysis(
        roomType: json['roomType'] ?? 'other',
        currentStyle: json['currentStyle'] ?? '',
        estimatedSqFt: json['estimatedSqFt'] ?? 0,
        keyElements: List<String>.from(json['keyElements'] ?? []),
        rawAnalysis: json['rawAnalysis'] ?? '',
      );
    } catch (e) {
      // Fallback: return a basic analysis with the raw text
      return RoomAnalysis(
        roomType: 'other',
        currentStyle: 'unknown',
        estimatedSqFt: 0,
        keyElements: [],
        rawAnalysis: text,
      );
    }
  }

  LeadEmailResult _parseLeadEmail(
    String text,
    String zipCode,
    String budgetRange,
  ) {
    try {
      final cleaned = text
          .replaceAll(RegExp(r'```json\s*'), '')
          .replaceAll(RegExp(r'```\s*'), '')
          .trim();
      final json = jsonDecode(cleaned) as Map<String, dynamic>;
      return LeadEmailResult(
        emailSubject: json['emailSubject'] ?? '',
        scopeOfWork: List<String>.from(json['scopeOfWork'] ?? []),
        projectType: json['projectType'] ?? '',
        emailBody: json['emailBody'] ?? '',
      );
    } catch (e) {
      return LeadEmailResult(
        emailSubject: 'New Renovation Lead in $zipCode',
        scopeOfWork: [],
        projectType: 'Renovation',
        emailBody: text,
      );
    }
  }
}

class LeadEmailResult {
  final String emailSubject;
  final List<String> scopeOfWork;
  final String projectType;
  final String emailBody;

  const LeadEmailResult({
    required this.emailSubject,
    required this.scopeOfWork,
    required this.projectType,
    required this.emailBody,
  });
}
