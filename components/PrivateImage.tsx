import { useState, useEffect, useRef } from "react";
import {
  Image,
  View,
  StyleSheet,
  ActivityIndicator,
  ImageStyle,
  StyleProp,
  ViewStyle,
} from "react-native";
import { useSignedUrl, clearSignedUrlCache } from "@/lib/hooks/useSignedUrl";
import { colors } from "@/lib/theme";
import { IsoRoom } from "./IsoRoom";

interface PrivateImageProps {
  /**
   * Storage bucket name (e.g., "room-photos")
   */
  bucket: string;

  /**
   * Storage path (e.g., "userId/projectId/original.jpg")
   * Can also be a full URL for backwards compatibility
   */
  path: string | null | undefined;

  /**
   * Style palette for the fallback IsoRoom placeholder
   * Defaults to "modern"
   */
  palette?: string;

  /**
   * Size for the IsoRoom placeholder
   * Should match the image container size
   */
  placeholderSize?: number;

  /**
   * Image style
   */
  style?: StyleProp<ImageStyle>;

  /**
   * Container style (applied when showing placeholder)
   */
  containerStyle?: StyleProp<ViewStyle>;

  /**
   * Accessibility label
   */
  accessibilityLabel?: string;

  /**
   * Whether to show a loading spinner while fetching signed URL
   * Default: false
   */
  showLoadingSpinner?: boolean;

  /**
   * Test ID for testing
   */
  testID?: string;
}

const MAX_RETRIES = 2;
const RETRY_DELAYS_MS = [500, 1500]; // Exponential backoff

/**
 * PrivateImage component
 * 
 * Displays images stored in private Supabase storage buckets.
 * 
 * Features:
 * - Automatically fetches signed URLs for storage paths
 * - Caches signed URLs until shortly before expiry
 * - Retries with fresh signed URLs on 403/400 errors (expired links)
 * - Shows IsoRoom placeholder on failure instead of broken image icon
 * - Supports both storage paths and legacy full URLs
 */
export function PrivateImage({
  bucket,
  path,
  palette = "modern",
  placeholderSize = 200,
  style,
  containerStyle,
  accessibilityLabel,
  showLoadingSpinner = false,
  testID,
}: PrivateImageProps) {
  const [retryTrigger, setRetryTrigger] = useState(0);
  const signedUrl = useSignedUrl(bucket, path, 3600 + retryTrigger); // Add retry trigger to force re-fetch
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [showPlaceholder, setShowPlaceholder] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const retryCountRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Update imageUrl when signedUrl changes
  useEffect(() => {
    if (signedUrl) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setImageUrl(signedUrl);
      setShowPlaceholder(false);
      retryCountRef.current = 0;
    }
  }, [signedUrl]);

  const handleImageError = async () => {
    if (!path || !isMountedRef.current) return;

    // If we've exhausted retries, show placeholder
    if (retryCountRef.current >= MAX_RETRIES) {
      setShowPlaceholder(true);
      setIsLoading(false);
      return;
    }

    // Clear the cache and retry with exponential backoff
    const retryDelay = RETRY_DELAYS_MS[retryCountRef.current] || 2000;
    retryCountRef.current++;

    console.log(
      `Image failed to load (retry ${retryCountRef.current}/${MAX_RETRIES}), retrying in ${retryDelay}ms...`
    );

    // Clear the cache to force a fresh signed URL
    clearSignedUrlCache(bucket, path);

    // Wait before retrying
    await new Promise((resolve) => setTimeout(resolve, retryDelay));

    if (!isMountedRef.current) return;

    // Trigger a re-fetch by incrementing retryTrigger (changes hook dependency)
    setRetryTrigger(prev => prev + 1);
    setImageUrl(null);
    setIsLoading(true);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setShowPlaceholder(false);
  };

  // Show placeholder if no path provided
  if (!path) {
    return (
      <View style={[styles.placeholderContainer, containerStyle]} testID={testID}>
        <IsoRoom
          palette={palette as any}
          size={placeholderSize}
          accessible={true}
          accessibilityLabel={accessibilityLabel || "Room placeholder"}
        />
      </View>
    );
  }

  // Show loading spinner while waiting for signed URL
  if (!imageUrl && showLoadingSpinner) {
    return (
      <View style={[styles.placeholderContainer, containerStyle]} testID={testID}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Show placeholder if image failed to load after retries
  if (showPlaceholder) {
    return (
      <View
        style={[styles.placeholderContainer, containerStyle]}
        testID={testID}
        accessible={true}
        accessibilityLabel={accessibilityLabel || "Room placeholder (image unavailable)"}
      >
        <IsoRoom
          palette={palette as any}
          size={placeholderSize}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        />
      </View>
    );
  }

  // Show the image
  return (
    <View style={containerStyle} testID={testID}>
      {imageUrl && (
        <Image
          source={{ uri: imageUrl }}
          style={style}
          onError={handleImageError}
          onLoad={handleImageLoad}
          accessibilityLabel={accessibilityLabel}
        />
      )}
      {isLoading && showLoadingSpinner && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholderContainer: {
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
});
