import 'package:cloud_firestore/cloud_firestore.dart';

enum ProjectStatus { draft, analyzed, generated, connected, completed }

class ProjectModel {
  final String id;
  final String userId;
  final String title;
  final String originalImageUrl;
  final RoomAnalysis? roomAnalysis;
  final String? selectedStyle;
  final List<String> generatedImageUrls;
  final String? selectedGenerationUrl;
  final ProjectStatus status;
  final LeadInfo? leadInfo;
  final DateTime createdAt;
  final DateTime updatedAt;

  const ProjectModel({
    required this.id,
    required this.userId,
    required this.title,
    required this.originalImageUrl,
    this.roomAnalysis,
    this.selectedStyle,
    this.generatedImageUrls = const [],
    this.selectedGenerationUrl,
    this.status = ProjectStatus.draft,
    this.leadInfo,
    required this.createdAt,
    required this.updatedAt,
  });

  factory ProjectModel.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return ProjectModel(
      id: doc.id,
      userId: data['userId'] ?? '',
      title: data['title'] ?? '',
      originalImageUrl: data['originalImageUrl'] ?? '',
      roomAnalysis: data['roomAnalysis'] != null
          ? RoomAnalysis.fromMap(data['roomAnalysis'])
          : null,
      selectedStyle: data['selectedStyle'],
      generatedImageUrls:
          List<String>.from(data['generatedImageUrls'] ?? []),
      selectedGenerationUrl: data['selectedGenerationUrl'],
      status: ProjectStatus.values.firstWhere(
        (e) => e.name == data['status'],
        orElse: () => ProjectStatus.draft,
      ),
      leadInfo: data['leadInfo'] != null
          ? LeadInfo.fromMap(data['leadInfo'])
          : null,
      createdAt: (data['createdAt'] as Timestamp).toDate(),
      updatedAt: (data['updatedAt'] as Timestamp).toDate(),
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'userId': userId,
      'title': title,
      'originalImageUrl': originalImageUrl,
      'roomAnalysis': roomAnalysis?.toMap(),
      'selectedStyle': selectedStyle,
      'generatedImageUrls': generatedImageUrls,
      'selectedGenerationUrl': selectedGenerationUrl,
      'status': status.name,
      'leadInfo': leadInfo?.toMap(),
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': Timestamp.fromDate(updatedAt),
    };
  }

  ProjectModel copyWith({
    String? title,
    String? originalImageUrl,
    RoomAnalysis? roomAnalysis,
    String? selectedStyle,
    List<String>? generatedImageUrls,
    String? selectedGenerationUrl,
    ProjectStatus? status,
    LeadInfo? leadInfo,
    DateTime? updatedAt,
  }) {
    return ProjectModel(
      id: id,
      userId: userId,
      title: title ?? this.title,
      originalImageUrl: originalImageUrl ?? this.originalImageUrl,
      roomAnalysis: roomAnalysis ?? this.roomAnalysis,
      selectedStyle: selectedStyle ?? this.selectedStyle,
      generatedImageUrls: generatedImageUrls ?? this.generatedImageUrls,
      selectedGenerationUrl:
          selectedGenerationUrl ?? this.selectedGenerationUrl,
      status: status ?? this.status,
      leadInfo: leadInfo ?? this.leadInfo,
      createdAt: createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

class RoomAnalysis {
  final String roomType;
  final String currentStyle;
  final int estimatedSqFt;
  final List<String> keyElements;
  final String rawAnalysis;

  const RoomAnalysis({
    required this.roomType,
    required this.currentStyle,
    required this.estimatedSqFt,
    required this.keyElements,
    required this.rawAnalysis,
  });

  factory RoomAnalysis.fromMap(Map<String, dynamic> map) {
    return RoomAnalysis(
      roomType: map['roomType'] ?? '',
      currentStyle: map['currentStyle'] ?? '',
      estimatedSqFt: map['estimatedSqFt'] ?? 0,
      keyElements: List<String>.from(map['keyElements'] ?? []),
      rawAnalysis: map['rawAnalysis'] ?? '',
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'roomType': roomType,
      'currentStyle': currentStyle,
      'estimatedSqFt': estimatedSqFt,
      'keyElements': keyElements,
      'rawAnalysis': rawAnalysis,
    };
  }
}

class LeadInfo {
  final String budgetRange;
  final String zipCode;
  final String? projectBrief;
  final List<String> matchedContractorIds;
  final DateTime? submittedAt;

  const LeadInfo({
    required this.budgetRange,
    required this.zipCode,
    this.projectBrief,
    this.matchedContractorIds = const [],
    this.submittedAt,
  });

  factory LeadInfo.fromMap(Map<String, dynamic> map) {
    return LeadInfo(
      budgetRange: map['budgetRange'] ?? '',
      zipCode: map['zipCode'] ?? '',
      projectBrief: map['projectBrief'],
      matchedContractorIds:
          List<String>.from(map['matchedContractorIds'] ?? []),
      submittedAt: map['submittedAt'] != null
          ? (map['submittedAt'] as Timestamp).toDate()
          : null,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'budgetRange': budgetRange,
      'zipCode': zipCode,
      'projectBrief': projectBrief,
      'matchedContractorIds': matchedContractorIds,
      'submittedAt':
          submittedAt != null ? Timestamp.fromDate(submittedAt!) : null,
    };
  }
}
