import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import * as Crypto from "expo-crypto";

const OFFLINE_CACHE_KEYS_PREFIX = "@visionbuild:offline:";
const OFFLINE_USER_DIR_PREFIX = "offline_cache_";

/**
 * Sanitize a file path to ensure it's safe for the filesystem
 * Hash the path to avoid special characters and length issues
 */
function sanitizeFilePath(filePath: string): string {
  // Create a hash of the path for safe filename
  const hash = Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    filePath
  );
  
  // Return a promise-based hash but we'll use a simpler approach for now
  // Replace anything outside [A-Za-z0-9._-] with underscore
  return filePath.replace(/[^A-Za-z0-9._-]/g, '_');
}

/**
 * Get the offline cache directory for a specific user
 */
export function getUserOfflineCacheDir(userId: string): string {
  return `${FileSystem.documentDirectory}${OFFLINE_USER_DIR_PREFIX}${userId}/`;
}

/**
 * Get all AsyncStorage keys for offline cache data
 */
async function getOfflineCacheKeys(userId: string): Promise<string[]> {
  const allKeys = await AsyncStorage.getAllKeys();
  const userPrefix = `${OFFLINE_CACHE_KEYS_PREFIX}${userId}:`;
  return allKeys.filter(key => key.startsWith(userPrefix));
}

/**
 * Wipe all offline cache data for a user
 * Called on sign-out and account deletion
 */
export async function wipeOfflineCache(userId: string): Promise<void> {
  if (!userId) return;

  try {
    // Remove all AsyncStorage offline cache entries for this user
    const cacheKeys = await getOfflineCacheKeys(userId);
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }

    // Remove all cached files in user's offline directory
    const userDir = getUserOfflineCacheDir(userId);
    const dirInfo = await FileSystem.getInfoAsync(userDir);
    
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(userDir, { idempotent: true });
    }
  } catch (error) {
    console.error("offline_cache_wipe_failed");
    throw error;
  }
}

/**
 * Store offline cache data (data only, not URLs)
 */
export async function setOfflineCacheData(
  userId: string,
  key: string,
  data: any
): Promise<void> {
  const cacheKey = `${OFFLINE_CACHE_KEYS_PREFIX}${userId}:${key}`;
  await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
}

/**
 * Get offline cache data
 */
export async function getOfflineCacheData(
  userId: string,
  key: string
): Promise<any | null> {
  const cacheKey = `${OFFLINE_CACHE_KEYS_PREFIX}${userId}:${key}`;
  const data = await AsyncStorage.getItem(cacheKey);
  return data ? JSON.parse(data) : null;
}

/**
 * Cache an image file for offline use
 * Stores the file under the user's ID, NOT the signed URL
 */
export async function cacheImageFile(
  userId: string,
  filePath: string,
  sourceUri: string
): Promise<string | null> {
  try {
    const userDir = getUserOfflineCacheDir(userId);
    
    // Ensure directory exists
    const dirInfo = await FileSystem.getInfoAsync(userDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(userDir, { intermediates: true });
    }

    // Sanitize the file path
    const sanitizedPath = sanitizeFilePath(filePath);

    // Download and cache the file
    const localPath = `${userDir}${sanitizedPath}`;
    await FileSystem.downloadAsync(sourceUri, localPath);
    
    return localPath;
  } catch (error) {
    console.error("offline_image_cache_failed");
    return null;
  }
}

/**
 * Get cached image file path
 */
export async function getCachedImageFile(
  userId: string,
  filePath: string
): Promise<string | null> {
  try {
    const localPath = `${getUserOfflineCacheDir(userId)}${filePath}`;
    const fileInfo = await FileSystem.getInfoAsync(localPath);
    
    return fileInfo.exists ? localPath : null;
  } catch (error) {
    console.error("offline_image_get_failed");
    return null;
  }
}
