import 'package:cloud_firestore/cloud_firestore.dart';

class ContractorModel {
  final String id;
  final String businessName;
  final String contactName;
  final String email;
  final String phone;
  final String zipCode;
  final String city;
  final String state;
  final List<String> specialties;
  final double rating;
  final int completedJobs;
  final bool isActive;
  final DateTime createdAt;

  const ContractorModel({
    required this.id,
    required this.businessName,
    required this.contactName,
    required this.email,
    required this.phone,
    required this.zipCode,
    required this.city,
    required this.state,
    required this.specialties,
    this.rating = 0.0,
    this.completedJobs = 0,
    this.isActive = true,
    required this.createdAt,
  });

  factory ContractorModel.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return ContractorModel(
      id: doc.id,
      businessName: data['businessName'] ?? '',
      contactName: data['contactName'] ?? '',
      email: data['email'] ?? '',
      phone: data['phone'] ?? '',
      zipCode: data['zipCode'] ?? '',
      city: data['city'] ?? '',
      state: data['state'] ?? '',
      specialties: List<String>.from(data['specialties'] ?? []),
      rating: (data['rating'] ?? 0.0).toDouble(),
      completedJobs: data['completedJobs'] ?? 0,
      isActive: data['isActive'] ?? true,
      createdAt: (data['createdAt'] as Timestamp).toDate(),
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'businessName': businessName,
      'contactName': contactName,
      'email': email,
      'phone': phone,
      'zipCode': zipCode,
      'city': city,
      'state': state,
      'specialties': specialties,
      'rating': rating,
      'completedJobs': completedJobs,
      'isActive': isActive,
      'createdAt': Timestamp.fromDate(createdAt),
    };
  }
}
