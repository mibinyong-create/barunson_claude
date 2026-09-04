#!/bin/sh
# 컨테이너 진입점.
#   1) (Docker Manager 표준) Prisma 프로젝트면 db push — 이 프로젝트는 해당 없음
#   2) DB 부트스트랩: 스키마 생성 + 샘플 데이터. 이미 만들어진 DB 면 건너뛴다
#   3) Next.js standalone 서버 기동
#
# 부트스트랩이 실패하면 앱을 띄우지 않는다. 스키마 없이 뜨면 모든 화면이 500 이라
# 조용히 넘어가는 것보다 컨테이너가 재시작되며 원인이 드러나는 편이 낫다.
set -e

# ── 1. Prisma (Docker Manager 가 생성하는 표준 블록. prisma/ 가 없으면 no-op) ──
if [ -f /prisma-runtime/prisma/schema.prisma ]; then
  if grep -qE 'provider[[:space:]]*=[[:space:]]*"mongodb"' /prisma-runtime/prisma/schema.prisma; then
    echo "[prisma] mongodb datasource detected - skipping db push (Prisma 6 CLI has no --url flag). Run prisma db push manually once to create indexes."
  else
    cd /prisma-runtime
    DB_URL="${DATABASE_URL:-file:/app/data/database.db}"
    sed -i '/^\s*url\s*=/d' prisma/schema.prisma
    npx prisma db push --url "$DB_URL" --accept-data-loss 2>/dev/null || true
    if [ -f prisma/seed.sql ]; then
      apk add --no-cache sqlite 2>/dev/null || true
      sqlite3 "$(echo "$DB_URL" | sed s/file://)" < prisma/seed.sql 2>/dev/null || true
    fi
    cd /app
  fi
fi

# ── 2. DB 부트스트랩 (PostgreSQL: db/schema.sql + 샘플 데이터) ────────────────
BOOTSTRAP_DIR=/db-bootstrap
if [ -f "$BOOTSTRAP_DIR/scripts/bootstrap.ts" ]; then
  cd "$BOOTSTRAP_DIR"
  if [ -f node_modules/tsx/dist/cli.mjs ]; then
    node node_modules/tsx/dist/cli.mjs scripts/bootstrap.ts
  else
    ./node_modules/.bin/tsx scripts/bootstrap.ts
  fi
else
  echo "[entrypoint] $BOOTSTRAP_DIR 없음 → DB 부트스트랩을 건너뜁니다."
fi

# ── 3. 앱 기동 ───────────────────────────────────────────────────────────────
cd /app
exec node server.js
