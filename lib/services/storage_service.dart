import 'dart:io';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:uuid/uuid.dart';

class StorageService {
  final FirebaseStorage _storage = FirebaseStorage.instance;
  final _uuid = const Uuid();

  /// Upload the user's room photo and return the download URL.
  Future<String> uploadRoomPhoto(String userId, File imageFile) async {
    final fileId = _uuid.v4();
    final ref = _storage
        .ref()
        .child('users/$userId/room_photos/$fileId.jpg');

    final uploadTask = ref.putFile(
      imageFile,
      SettableMetadata(contentType: 'image/jpeg'),
    );

    final snapshot = await uploadTask;
    return snapshot.ref.getDownloadURL();
  }

  /// Upload a generated design image (from bytes) and return the download URL.
  Future<String> uploadGeneratedImage(
    String userId,
    String projectId,
    List<int> imageBytes,
    int index,
  ) async {
    final ref = _storage
        .ref()
        .child('users/$userId/generations/$projectId/gen_$index.png');

    final uploadTask = ref.putData(
      imageBytes as dynamic,
      SettableMetadata(contentType: 'image/png'),
    );

    final snapshot = await uploadTask;
    return snapshot.ref.getDownloadURL();
  }

  /// Get a signed download URL for sharing.
  Future<String> getShareableUrl(String storagePath) async {
    final ref = _storage.ref().child(storagePath);
    return ref.getDownloadURL();
  }
}
