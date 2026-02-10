class StyleOption {
  final String id;
  final String name;
  final String description;
  final String previewAsset;
  final String promptModifier;

  const StyleOption({
    required this.id,
    required this.name,
    required this.description,
    required this.previewAsset,
    required this.promptModifier,
  });

  static const List<StyleOption> allStyles = [
    StyleOption(
      id: 'modern',
      name: 'Modern',
      description: 'Clean lines, neutral tones, minimalist aesthetic',
      previewAsset: 'assets/images/style_modern.png',
      promptModifier:
          'modern minimalist style with clean lines, neutral palette, '
          'matte finishes, and contemporary fixtures',
    ),
    StyleOption(
      id: 'industrial',
      name: 'Industrial',
      description: 'Exposed brick, metal accents, raw materials',
      previewAsset: 'assets/images/style_industrial.png',
      promptModifier:
          'industrial loft style with exposed brick, metal accents, '
          'Edison bulbs, concrete surfaces, and raw material finishes',
    ),
    StyleOption(
      id: 'farmhouse',
      name: 'Farmhouse',
      description: 'Warm wood, shiplap, rustic charm',
      previewAsset: 'assets/images/style_farmhouse.png',
      promptModifier:
          'modern farmhouse style with shiplap walls, warm wood tones, '
          'apron-front sink, open shelving, and rustic hardware',
    ),
    StyleOption(
      id: 'coastal',
      name: 'Coastal',
      description: 'Light blues, whites, natural textures',
      previewAsset: 'assets/images/style_coastal.png',
      promptModifier:
          'coastal style with light blue and white palette, '
          'natural woven textures, driftwood accents, and airy open feel',
    ),
    StyleOption(
      id: 'midcentury',
      name: 'Mid-Century Modern',
      description: 'Retro meets contemporary, organic curves',
      previewAsset: 'assets/images/style_midcentury.png',
      promptModifier:
          'mid-century modern style with organic curves, warm wood, '
          'bold accent colors, tapered legs, and vintage-inspired fixtures',
    ),
    StyleOption(
      id: 'scandinavian',
      name: 'Scandinavian',
      description: 'Light, airy, functional simplicity',
      previewAsset: 'assets/images/style_scandinavian.png',
      promptModifier:
          'Scandinavian style with light wood, white surfaces, '
          'functional simplicity, hygge warmth, and minimal decoration',
    ),
    StyleOption(
      id: 'luxury',
      name: 'Luxury',
      description: 'High-end finishes, marble, gold accents',
      previewAsset: 'assets/images/style_luxury.png',
      promptModifier:
          'luxury high-end style with marble countertops, gold hardware, '
          'crystal lighting, premium appliances, and designer finishes',
    ),
    StyleOption(
      id: 'transitional',
      name: 'Transitional',
      description: 'Best of traditional and contemporary',
      previewAsset: 'assets/images/style_transitional.png',
      promptModifier:
          'transitional style blending traditional warmth with contemporary '
          'clean lines, neutral palette with texture, and timeless fixtures',
    ),
  ];
}
