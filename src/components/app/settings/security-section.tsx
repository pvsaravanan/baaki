"use client";
import { useEffect, useState } from "react";
import { apiPatch, ApiError } from "@/lib/http";
import { lockAvailability, unlockWithDevice } from "@/lib/app-lock";
import { useAppData } from "@/components/app/app-data";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { Row, Section } from "./layout";

export function SecuritySection() {
  const { preference, refresh } = useAppData();
  const { success, error } = useToast();

  const [lockNote, setLockNote] = useState<string | null>(null);
  const [lockAvailable, setLockAvailable] = useState(false);
  const [savingLock, setSavingLock] = useState(false);
  useEffect(() => {
    lockAvailability()
      .then(({ available, reason }) => {
        setLockAvailable(available);
        setLockNote(reason ?? null);
      })
      .catch(() => setLockNote("The app lock isn't available on this phone."));
  }, []);

  async function handleAppLock(on: boolean) {
    setSavingLock(true);
    try {
      // Turning it on proves the unlock works before the app starts relying on it;
      // turning it off needs the same, so a phone left open can't drop the lock.
      // (If the phone has lost its screen lock the lock already stands aside, and
      // there is nothing to unlock with — let it be switched off.)
      const canAsk = on || (await lockAvailability().catch(() => ({ available: false }))).available;
      if (canAsk && !(await unlockWithDevice(on ? "Turn on the app lock" : "Turn off the app lock"))) return;
      await apiPatch("/api/preferences", { appLock: on });
      success(on ? "App lock is on" : "App lock is off");
      refresh();
    } catch (e2) {
      error(e2 instanceof ApiError ? e2.message : "Could not change the app lock");
    } finally {
      setSavingLock(false);
    }
  }

  return (
    <Section id="security" title="Security" description="Keep baaki private on your phone.">
      <Row
        title="App lock"
        description={
          lockNote ?? "Ask for your fingerprint or screen lock when baaki opens, and after a minute away."
        }
      >
        <Switch
          checked={preference.appLock}
          disabled={savingLock || (!lockAvailable && !preference.appLock)}
          onChange={() => handleAppLock(!preference.appLock)}
          label="App lock"
        />
      </Row>
    </Section>
  );
}
