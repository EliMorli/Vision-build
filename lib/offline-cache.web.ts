import AsyncStorage from "@react-native-async-storage/async-storage";

const OFFLINE_CACHE_KEYS_PREFIX = "@visionbuild:offline:";

/**
 * Get the offline cache directory for a specific user (web stub)
 */
export function getUserOfflineCacheDir(_userId: string): string {
  return "";
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
 * Wipe all offline cache data for a user (web: AsyncStorage only)
 */
export async function wipeOfflineCache(userId: string): Promise<void> {
  if (!userId) return;

  try {
    // Remove all AsyncStorage offline cache entries for this user
    const cacheKeys = await getOfflineCacheKeys(userId);
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch (error) {
    console.error("offline_cache_wipe_failed");
    throw error;
  }
}

/**
 * Store offline cache data
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
 * Cache an image file (web stub - returns null)
 */
export async function cacheImageFile(
  _userId: string,
  _filePath: string,
  _sourceUri: string
): Promise<string | null> {
  return null;
}

/**
 * Get cached image file (web stub - returns null)
 */
export async function getCachedImageFile(
  _userId: string,
  _filePath: string
): Promise<string | null> {
  return null;
}
