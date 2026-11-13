"use client";
import { Capacitor, registerPlugin } from "@capacitor/core";

/**
 * The optional app lock: the phone's own fingerprint / face unlock, with its
 * PIN, pattern or password as the fallback (Face ID / Touch ID and the
 * passcode on iPhone) — baaki keeps no password of its own. Only works in the
 * phone app; in a browser the lock is unavailable.
 */

// Capacitor plugin objects look "thenable", so a promise must never resolve
// to one (awaiting it hangs forever): import the module, then call through it.
const biometrics = () => import("@aparajita/capacitor-biometric-auth");

/** Whether the lock can be used here, and if not, why (for Settings). */
export async function lockAvailability(): Promise<{ available: boolean; reason?: string }> {
  if (!Capacitor.isNativePlatform()) {
    return { available: false, reason: "Available in the phone app." };
  }
  const { BiometricAuth } = await biometrics();
  const result = await BiometricAuth.checkBiometry();
  // Device credentials are the fallback, so a screen lock is all that's needed;
  // without one, a lock could never be opened again.
  if (!result.deviceIsSecure) {
    return {
      available: false,
      reason:
        Capacitor.getPlatform() === "ios"
          ? "Set a passcode on your iPhone first."
          : "Set a screen lock (PIN, pattern or password) on your phone first.",
    };
  }
  return { available: true };
}

/**
 * Hides the app from the recent-apps screen / app switcher (on) or shows it
 * again (off). Meant to follow the app lock setting. Does nothing in a browser.
 */
export async function setPrivacyScreen(enabled: boolean): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await registerPlugin<{ setEnabled(options: { enabled: boolean }): Promise<void> }>("PrivacyScreen").setEnabled({ enabled });
  } catch {
    // An older install without the plugin: the lock still works, only the preview isn't hidden.
  }
}

/** Ask for fingerprint / screen lock. Resolves true when the person unlocked. */
export async function unlockWithDevice(reason = "Unlock baaki"): Promise<boolean> {
  try {
    const { BiometricAuth } = await biometrics();
    await BiometricAuth.authenticate({
      reason,
      androidTitle: "Unlock baaki",
      androidSubtitle: "Use your fingerprint or screen lock",
      allowDeviceCredential: true,
      androidConfirmationRequired: false,
    });
    return true;
  } catch {
    // Cancelled or failed; the lock screen offers to try again.
    return false;
  }
}
