import * as WebBrowser from "expo-web-browser";
import { legalUrl, type LegalPage } from "@/lib/config/legal";

/**
 * Open a hosted legal page in an in-app browser sheet
 * (SFSafariViewController page sheet on iOS, Custom Tab on Android,
 * a new tab on web).
 */
export async function openLegalPage(page: LegalPage): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(legalUrl(page), {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      controlsColor: "#1A73E8",
      dismissButtonStyle: "close",
    });
  } catch (error) {
    console.warn("Could not open legal page", page, error);
  }
}
