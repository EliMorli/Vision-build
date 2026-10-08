import AsyncStorage from "@react-native-async-storage/async-storage";
// @ts-ignore - expo-file-system types are bundled with expo
import * as FileSystem from "expo-file-system";

const OFFLINE_CACHE_KEYS_PREFIX = "@visionbuild:offline:";
const OFFLINE_USER_DIR_PREFIX = "offline_cache_";

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
    console.error("Error wiping offline cache:", error);
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

    // Download and cache the file
    const localPath = `${userDir}${filePath}`;
    await FileSystem.downloadAsync(sourceUri, localPath);
    
    return localPath;
  } catch (error) {
    console.error("Error caching image file:", error);
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
    console.error("Error getting cached image:", error);
    return null;
  }
}
