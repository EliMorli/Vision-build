import 'package:cloud_firestore/cloud_firestore.dart';

enum LeadStatus { pending, sent, viewed, accepted, declined, completed }

class LeadModel {
  final String id;
  final String projectId;
  final String userId;
  final String contractorId;
  final String emailSubject;
  final String emailBody;
  final String originalImageUrl;
  final String generatedImageUrl;
  final String budgetRange;
  final String zipCode;
  final List<String> scopeOfWork;
  final LeadStatus status;
  final DateTime createdAt;
  final DateTime? respondedAt;

  const LeadModel({
    required this.id,
    required this.projectId,
    required this.userId,
    required this.contractorId,
    required this.emailSubject,
    required this.emailBody,
    required this.originalImageUrl,
    required this.generatedImageUrl,
    required this.budgetRange,
    required this.zipCode,
    required this.scopeOfWork,
    this.status = LeadStatus.pending,
    required this.createdAt,
    this.respondedAt,
  });

  factory LeadModel.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return LeadModel(
      id: doc.id,
      projectId: data['projectId'] ?? '',
      userId: data['userId'] ?? '',
      contractorId: data['contractorId'] ?? '',
      emailSubject: data['emailSubject'] ?? '',
      emailBody: data['emailBody'] ?? '',
      originalImageUrl: data['originalImageUrl'] ?? '',
      generatedImageUrl: data['generatedImageUrl'] ?? '',
      budgetRange: data['budgetRange'] ?? '',
      zipCode: data['zipCode'] ?? '',
      scopeOfWork: List<String>.from(data['scopeOfWork'] ?? []),
      status: LeadStatus.values.firstWhere(
        (e) => e.name == data['status'],
        orElse: () => LeadStatus.pending,
      ),
      createdAt: (data['createdAt'] as Timestamp).toDate(),
      respondedAt: data['respondedAt'] != null
          ? (data['respondedAt'] as Timestamp).toDate()
          : null,
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'projectId': projectId,
      'userId': userId,
      'contractorId': contractorId,
      'emailSubject': emailSubject,
      'emailBody': emailBody,
      'originalImageUrl': originalImageUrl,
      'generatedImageUrl': generatedImageUrl,
      'budgetRange': budgetRange,
      'zipCode': zipCode,
      'scopeOfWork': scopeOfWork,
      'status': status.name,
      'createdAt': Timestamp.fromDate(createdAt),
      'respondedAt':
          respondedAt != null ? Timestamp.fromDate(respondedAt!) : null,
    };
  }
}
