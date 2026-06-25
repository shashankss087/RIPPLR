#!/bin/sh
set -e

# Create + seed the SQLite database on first boot (or whenever the volume is
# empty). On a persistent disk this runs once; on an ephemeral filesystem it
# re-seeds on every cold start — fine for a demo.
DB_PATH="${DATABASE_URL#file:}"
if [ ! -f "$DB_PATH" ]; then
  echo "No database at $DB_PATH — creating schema and seeding demo data..."
  npx prisma db push --skip-generate
  npx tsx prisma/seed.ts
else
  echo "Database found at $DB_PATH — skipping seed."
fi

echo "Starting RIPPLR Orchestrator on port ${PORT:-3000}..."
exec npm run start
