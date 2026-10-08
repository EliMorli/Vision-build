import { describe, it, expect } from "@jest/globals";
import { APPLE_DELETION_NOTE, DELETED_DATA_SUMMARY, shouldShowAppleNote } from "../deletion";

describe("deletion constants", () => {
  describe("DELETED_DATA_SUMMARY", () => {
    it("has the exact compliance-approved data summary", () => {
      expect(DELETED_DATA_SUMMARY).toBe(
        "your projects, photos, designs, chats and pros waitlist signup"
      );
    });
  });

  describe("APPLE_DELETION_NOTE", () => {
    it("has the exact compliance-approved text", () => {
      expect(APPLE_DELETION_NOTE).toBe(
        "We've also asked Apple to disconnect VisionBuild from your Apple ID. To check, open Settings, tap your name, then Sign-In & Security, then Sign in with Apple."
      );
    });
  });

  describe("shouldShowAppleNote", () => {
    it("returns true for iOS + Apple user", () => {
      expect(shouldShowAppleNote("ios", true)).toBe(true);
    });

    it("returns false for iOS + non-Apple user", () => {
      expect(shouldShowAppleNote("ios", false)).toBe(false);
    });

    it("returns false for web + Apple user", () => {
      expect(shouldShowAppleNote("web", true)).toBe(false);
    });

    it("returns false for web + non-Apple user", () => {
      expect(shouldShowAppleNote("web", false)).toBe(false);
    });

    it("returns true for android + Apple user (native platform)", () => {
      expect(shouldShowAppleNote("android", true)).toBe(true);
    });

    it("returns false for android + non-Apple user", () => {
      expect(shouldShowAppleNote("android", false)).toBe(false);
    });
  });
});
