/**
 * Release config guard: fails if app.json / eas.json drift from what the
 * App Store and Google Play submission answers rely on.
 */
import * as fs from "fs";
import * as path from "path";

const root = path.resolve(__dirname, "..", "..");
const app = JSON.parse(fs.readFileSync(path.join(root, "app.json"), "utf8")).expo;
const eas = JSON.parse(fs.readFileSync(path.join(root, "eas.json"), "utf8"));

const CAMERA_TEXT =
  "Take a photo of your room so VisionBuild can create redesign ideas. Photos are private unless you make a project public.";
const PHOTOS_TEXT =
  "Choose a room photo so VisionBuild can create redesign ideas. Photos are private unless you make a project public.";

function plugin(name: string): any {
  for (const p of app.plugins) {
    if (p === name) return {};
    if (Array.isArray(p) && p[0] === name) return p[1] ?? {};
  }
  return undefined;
}

describe("app.json release config", () => {
  it("has store identity", () => {
    expect(app.ios.bundleIdentifier).toBe("com.visionbuild.app");
    expect(app.android.package).toBe("com.visionbuild.app");
    expect(app.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(app.scheme).toBe("visionbuild");
  });

  it("is iPhone-only for launch and declares no non-exempt encryption", () => {
    expect(app.ios.supportsTablet).toBe(false);
    expect(app.ios.config.usesNonExemptEncryption).toBe(false);
  });

  it("uses the square icon-B splash on brand blue (SDK 52 centered splash)", () => {
    const splash = plugin("expo-splash-screen");
    expect(splash).toEqual({
      image: "./assets/images/splash-icon.png",
      imageWidth: 200,
      resizeMode: "contain",
      backgroundColor: "#1A73E8",
    });
    expect(app.splash).toEqual({
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#1A73E8",
    });
    const png = fs.readFileSync(path.join(root, "assets", "images", "splash-icon.png"));
    // PNG IHDR: width/height at bytes 16-23, color type 6 = RGBA (transparent)
    expect(png.readUInt32BE(16)).toBe(1024);
    expect(png.readUInt32BE(20)).toBe(1024);
    expect(png[25]).toBe(6);
  });

  it("enables Sign in with Apple", () => {
    expect(app.ios.usesAppleSignIn).toBe(true);
    expect(plugin("expo-apple-authentication")).toBeDefined();
  });

  it("uses the approved permission text everywhere", () => {
    expect(app.ios.infoPlist.NSCameraUsageDescription).toBe(CAMERA_TEXT);
    expect(app.ios.infoPlist.NSPhotoLibraryUsageDescription).toBe(PHOTOS_TEXT);
    expect(plugin("expo-camera").cameraPermission).toBe(CAMERA_TEXT);
    expect(plugin("expo-camera").microphonePermission).toBe(false);
    expect(plugin("expo-camera").recordAudioAndroid).toBe(false);
    expect(plugin("expo-image-picker").photosPermission).toBe(PHOTOS_TEXT);
    expect(plugin("expo-image-picker").cameraPermission).toBe(CAMERA_TEXT);
    expect(plugin("expo-image-picker").microphonePermission).toBe(false);
  });

  it("requests only CAMERA on Android and blocks media/location/ad permissions", () => {
    expect(app.android.permissions).toEqual(["CAMERA"]);
    const blocked: string[] = app.android.blockedPermissions;
    for (const p of [
      "android.permission.READ_MEDIA_IMAGES",
      "android.permission.READ_MEDIA_VIDEO",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "android.permission.RECORD_AUDIO",
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_COARSE_LOCATION",
      "com.google.android.gms.permission.AD_ID",
    ]) {
      expect(blocked).toContain(p);
    }
  });

  it("has a privacy manifest matching the App Privacy answers", () => {
    const pm = app.ios.privacyManifests;
    expect(pm.NSPrivacyTracking).toBe(false);
    expect(pm.NSPrivacyTrackingDomains).toEqual([]);
    const types = pm.NSPrivacyCollectedDataTypes.map((t: any) => t.NSPrivacyCollectedDataType).sort();
    expect(types).toEqual(
      [
        "NSPrivacyCollectedDataTypeCustomerSupport",
        "NSPrivacyCollectedDataTypeEmailAddress",
        "NSPrivacyCollectedDataTypeName",
        "NSPrivacyCollectedDataTypeOtherUserContent",
        "NSPrivacyCollectedDataTypePhotosorVideos",
        "NSPrivacyCollectedDataTypeProductInteraction",
        "NSPrivacyCollectedDataTypeUserID",
      ].sort()
    );
    for (const t of pm.NSPrivacyCollectedDataTypes) {
      expect(t.NSPrivacyCollectedDataTypeLinked).toBe(true);
      expect(t.NSPrivacyCollectedDataTypeTracking).toBe(false);
      expect(t.NSPrivacyCollectedDataTypePurposes).toEqual([
        "NSPrivacyCollectedDataTypePurposeAppFunctionality",
      ]);
    }
    const apis = Object.fromEntries(
      pm.NSPrivacyAccessedAPITypes.map((a: any) => [a.NSPrivacyAccessedAPIType, a.NSPrivacyAccessedAPITypeReasons])
    );
    expect(apis).toEqual({
      NSPrivacyAccessedAPICategoryUserDefaults: ["CA92.1"],
      NSPrivacyAccessedAPICategoryFileTimestamp: ["C617.1"],
      NSPrivacyAccessedAPICategorySystemBootTime: ["35F9.1"],
      NSPrivacyAccessedAPICategoryDiskSpace: ["E174.1"],
    });
  });
});

describe("eas.json", () => {
  it("has development, preview and production profiles", () => {
    expect(Object.keys(eas.build)).toEqual(expect.arrayContaining(["development", "preview", "production"]));
  });

  it("never enables mock mode outside the development profile", () => {
    expect(eas.build.base.env.EXPO_PUBLIC_DEV_MOCK_SESSION).toBe("false");
    for (const p of ["preview", "production"]) {
      expect(eas.build[p].env?.EXPO_PUBLIC_DEV_MOCK_SESSION).not.toBe("true");
    }
  });

  it("builds a store bundle in production and has a submit profile", () => {
    expect(eas.build.production.android.buildType).toBe("app-bundle");
    expect(eas.submit.production.ios).toBeDefined();
    expect(eas.submit.production.android).toBeDefined();
  });
});
