-- The website's login columns. On the phone there's one profile and no login,
-- so nothing reads or writes them. Dropping "authId" also drops its unique index.
ALTER TABLE "User" DROP COLUMN "passwordHash",
DROP COLUMN "authId";
