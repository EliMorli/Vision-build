import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/project_model.dart';
import '../models/contractor_model.dart';
import '../models/lead_model.dart';

class FirestoreService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  // ─── Projects ──────────────────────────────────────────────

  CollectionReference<Map<String, dynamic>> _projectsRef(String userId) =>
      _db.collection('users').doc(userId).collection('projects');

  Future<ProjectModel> createProject(ProjectModel project) async {
    final ref = _projectsRef(project.userId).doc(project.id);
    await ref.set(project.toFirestore());
    return project;
  }

  Future<void> updateProject(ProjectModel project) async {
    await _projectsRef(project.userId)
        .doc(project.id)
        .update(project.toFirestore());
  }

  Future<ProjectModel?> getProject(String userId, String projectId) async {
    final doc = await _projectsRef(userId).doc(projectId).get();
    if (!doc.exists) return null;
    return ProjectModel.fromFirestore(doc);
  }

  Stream<List<ProjectModel>> watchProjects(String userId) {
    return _projectsRef(userId)
        .orderBy('updatedAt', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => ProjectModel.fromFirestore(doc))
            .toList());
  }

  Future<void> deleteProject(String userId, String projectId) async {
    await _projectsRef(userId).doc(projectId).delete();
  }

  // ─── Contractors ───────────────────────────────────────────

  Future<List<ContractorModel>> findContractorsByZip(
    String zipCode, {
    List<String>? specialties,
    int limit = 5,
  }) async {
    Query<Map<String, dynamic>> query = _db
        .collection('contractors')
        .where('isActive', isEqualTo: true)
        .where('zipCode', isEqualTo: zipCode);

    if (specialties != null && specialties.isNotEmpty) {
      query = query.where(
        'specialties',
        arrayContainsAny: specialties,
      );
    }

    final snapshot = await query.limit(limit).get();
    return snapshot.docs
        .map((doc) => ContractorModel.fromFirestore(doc))
        .toList();
  }

  // ─── Leads ─────────────────────────────────────────────────

  Future<LeadModel> createLead(LeadModel lead) async {
    final ref = _db
        .collection('contractors')
        .doc(lead.contractorId)
        .collection('leads')
        .doc(lead.id);
    await ref.set(lead.toFirestore());
    return lead;
  }

  Stream<List<LeadModel>> watchLeadsForProject(String projectId) {
    return _db
        .collectionGroup('leads')
        .where('projectId', isEqualTo: projectId)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => LeadModel.fromFirestore(doc))
            .toList());
  }
}
