FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p public
RUN npx prisma generate 2>/dev/null || true
ENV NEXT_PUBLIC_BASE_PATH=/c/barunson-claude
ENV DATABASE_URL=file:./placeholder.db

RUN npm run build
RUN mkdir -p /prisma-runtime && if [ -f prisma/schema.prisma ]; then cp -r prisma /prisma-runtime/ && cp package.json /prisma-runtime/ && cd /prisma-runtime && npm install prisma --no-save 2>/dev/null; fi

# ── DB 부트스트랩 런타임 ──────────────────────────────────────────────────────
# next standalone 출력에는 db/·scripts/ 도, tsx 도 포함되지 않는다.
# 기동 시 스키마·샘플 데이터를 만들 최소 실행 환경(pg + tsx + dotenv)을 따로 만든다.
# scripts/seed.ts 는 process.cwd() 기준으로 public/products/*.jpg 를 읽으므로 같이 복사한다.
RUN mkdir -p /db-bootstrap/public \
 && cp -r db scripts /db-bootstrap/ \
 && { cp -r public/products /db-bootstrap/public/ 2>/dev/null || true; }
RUN printf '{"name":"db-bootstrap","private":true}\n' > /db-bootstrap/package.json \
 && cd /db-bootstrap \
 && npm install --no-save --no-audit --no-fund pg@^8.23.0 tsx@^4.23.12 dotenv@^17.4.2

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /prisma-runtime /prisma-runtime
COPY --from=builder /db-bootstrap /db-bootstrap
RUN chmod +x /db-bootstrap/scripts/docker-entrypoint.sh
EXPOSE 3000
CMD ["/db-bootstrap/scripts/docker-entrypoint.sh"]
