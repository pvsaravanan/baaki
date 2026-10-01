-- The app now runs on the device with a single local user, so there is no
-- server API to rate-limit.
DROP TABLE IF EXISTS "RateLimitBucket";
