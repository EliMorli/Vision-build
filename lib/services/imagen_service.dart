import 'dart:convert';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import '../config/app_config.dart';

/// Service for calling Vertex AI Imagen 3 to generate renovation designs.
///
/// Uses the Vertex AI REST API with the imagegeneration model.
/// Requires a valid GCP project with Vertex AI enabled and an
/// access token obtained via Firebase Auth or a service account.
class ImagenService {
  /// Generate renovation design images from the original room photo.
  ///
  /// [originalImageBytes] — the user's uploaded room photo.
  /// [stylePrompt] — the style modifier (from StyleOption.promptModifier).
  /// [roomAnalysis] — the room analysis summary for context.
  /// [accessToken] — OAuth2 access token for Vertex AI.
  /// [count] — number of images to generate (default 4).
  ///
  /// Returns a list of PNG image byte arrays.
  Future<List<Uint8List>> generateDesigns({
    required Uint8List originalImageBytes,
    required String stylePrompt,
    required String roomAnalysis,
    required String accessToken,
    int count = 4,
  }) async {
    final endpoint = 'https://${AppConfig.gcpRegion}-aiplatform.googleapis.com'
        '/v1/projects/${AppConfig.gcpProjectId}'
        '/locations/${AppConfig.gcpRegion}'
        '/publishers/google/models/imagen-3.0-generate-002:predict';

    final prompt = _buildPrompt(stylePrompt, roomAnalysis);

    final body = jsonEncode({
      'instances': [
        {
          'prompt': prompt,
          'image': {
            'bytesBase64Encoded': base64Encode(originalImageBytes),
          },
        },
      ],
      'parameters': {
        'sampleCount': count,
        'aspectRatio': '1:1',
        'safetyFilterLevel': 'block_few',
        'personGeneration': 'dont_allow',
        'guidanceScale': 60,
        'seed': null,
      },
    });

    final response = await http.post(
      Uri.parse(endpoint),
      headers: {
        'Authorization': 'Bearer $accessToken',
        'Content-Type': 'application/json',
      },
      body: body,
    );

    if (response.statusCode != 200) {
      throw ImagenException(
        'Imagen API error ${response.statusCode}: ${response.body}',
      );
    }

    final result = jsonDecode(response.body) as Map<String, dynamic>;
    final predictions = result['predictions'] as List<dynamic>? ?? [];

    return predictions
        .map((p) =>
            base64Decode((p as Map<String, dynamic>)['bytesBase64Encoded']))
        .map((bytes) => Uint8List.fromList(bytes))
        .toList();
  }

  String _buildPrompt(String stylePrompt, String roomAnalysis) {
    return '''
Redesign this room with a $stylePrompt.

Current room analysis: $roomAnalysis

CRITICAL REQUIREMENTS:
- PRESERVE the exact room layout: walls, windows, doors must stay in place.
- PRESERVE the room dimensions and perspective/camera angle.
- Only change surfaces, finishes, fixtures, furniture, and decor.
- The result should look like a professional interior design rendering.
- High quality, photorealistic, well-lit, 4K detail.
''';
  }
}

class ImagenException implements Exception {
  final String message;
  const ImagenException(this.message);

  @override
  String toString() => 'ImagenException: $message';
}
