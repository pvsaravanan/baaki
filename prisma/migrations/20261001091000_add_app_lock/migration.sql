-- Ask for the phone's fingerprint / screen lock when the app opens.
ALTER TABLE "UserPreference" ADD COLUMN "appLock" BOOLEAN NOT NULL DEFAULT false;
