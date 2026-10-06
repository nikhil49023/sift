#!/bin/sh
set -eu
node --import tsx backend/scripts/migrate.ts
exec node --import tsx backend/src/server.ts
