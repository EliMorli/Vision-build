/// Central configuration for VisionBuild.
///
/// In production, these values should come from environment variables
/// or a secure config management system. For development, set them
/// in your .env file and load via flutter_dotenv or similar.
class AppConfig {
  // Gemini API (Google AI Studio)
  static const String geminiApiKey =
      String.fromEnvironment('GEMINI_API_KEY', defaultValue: '');

  // Vertex AI project (for Imagen 3)
  static const String gcpProjectId =
      String.fromEnvironment('GCP_PROJECT_ID', defaultValue: '');
  static const String gcpRegion =
      String.fromEnvironment('GCP_REGION', defaultValue: 'us-central1');

  // Lead pricing
  static const double leadPriceUsd = 50.0;

  // Generation settings
  static const int maxGenerationsPerRequest = 4;
  static const int imageWidth = 1024;
  static const int imageHeight = 1024;

  // Budget range options
  static const List<String> budgetRanges = [
    'Under \$5,000',
    '\$5,000 - \$10,000',
    '\$10,000 - \$25,000',
    '\$25,000 - \$50,000',
    '\$50,000 - \$100,000',
    '\$100,000+',
  ];
}
