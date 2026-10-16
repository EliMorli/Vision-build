import { useState, useEffect } from "react";
import { Platform } from "react-native";
import NetInfo from "@react-native-community/netinfo";

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
}

function initialConnected(): boolean {
  if (Platform.OS === "web" && typeof navigator !== "undefined" && "onLine" in navigator) {
    return navigator.onLine;
  }
  return true;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: initialConnected(),
    isInternetReachable: null,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setStatus({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
      });
    });

    // On web, NetInfo only listens to `navigator.connection` change events when
    // that API exists (Chromium), which do not fire for every offline/online
    // transition. Listen to the window events too so the banner always tracks
    // navigator.onLine.
    let removeWebListeners: (() => void) | undefined;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const onOnline = () => setStatus((s) => ({ ...s, isConnected: true }));
      const onOffline = () => setStatus({ isConnected: false, isInternetReachable: false });
      window.addEventListener("online", onOnline);
      window.addEventListener("offline", onOffline);
      removeWebListeners = () => {
        window.removeEventListener("online", onOnline);
        window.removeEventListener("offline", onOffline);
      };
    }

    return () => {
      unsubscribe();
      removeWebListeners?.();
    };
  }, []);

  return status;
}
