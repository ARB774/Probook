-- Store only a slow password hash; plaintext passwords never enter PostgreSQL.
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
