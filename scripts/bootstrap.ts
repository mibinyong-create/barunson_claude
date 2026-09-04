/**
 * 컨테이너 기동 시 실행되는 DB 부트스트랩.
 *   npm run db:bootstrap  (로컬에서도 동일하게 동작)
 *
 * db/schema.sql 은 DROP SCHEMA public CASCADE 로 시작하므로 재기동마다 실행하면
 * 운영 데이터가 날아간다. 그래서 "orders 테이블이 이미 있는가" 하나만 보고
 * 없을 때만 스키마 생성 + 샘플 데이터 주입을 수행한다.
 *
 * 환경변수
 *   DB_BOOTSTRAP        auto(기본) | off | force
 *                       auto  = 비어 있는 DB 에만 생성
 *                       off   = 아무것도 하지 않음
 *                       force = 기존 데이터를 지우고 재생성 (파괴적)
 *   DB_BOOTSTRAP_SEED   false 로 두면 스키마만 만들고 샘플 데이터는 넣지 않음
 *   DB_BOOTSTRAP_TIMEOUT  DB 접속 대기 최대 초 (기본 60). 공유 DB 기동을 기다린다.
 *   SEED_ORDER_COUNT    샘플 주문 건수 (scripts/seed.ts 가 소비, 기본 500)
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";

const ROOT = process.cwd();

type Mode = "auto" | "off" | "force";

function resolveMode(): Mode {
  const raw = (process.env.DB_BOOTSTRAP ?? "auto").trim().toLowerCase();
  if (raw === "" || raw === "auto" || raw === "true" || raw === "1") return "auto";
  if (raw === "off" || raw === "false" || raw === "0") return "off";
  if (raw === "force") return "force";
  console.warn(`[bootstrap] 알 수 없는 DB_BOOTSTRAP="${raw}" → auto 로 처리합니다.`);
  return "auto";
}

function resolveTimeoutMs(): number {
  const n = Number(process.env.DB_BOOTSTRAP_TIMEOUT);
  return (Number.isInteger(n) && n > 0 ? n : 60) * 1000;
}

const seedEnabled = !/^(false|0|off)$/i.test(process.env.DB_BOOTSTRAP_SEED ?? "");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 공유 PostgreSQL 은 앱보다 늦게 뜰 수 있다. 타임아웃까지 2초 간격으로 재시도한다.
 */
async function connectWithRetry(connectionString: string, timeoutMs: number): Promise<Client> {
  const deadline = Date.now() + timeoutMs;
  for (let attempt = 1; ; attempt++) {
    const client = new Client({ connectionString });
    try {
      await client.connect();
      return client;
    } catch (e) {
      await client.end().catch(() => {});
      const message = e instanceof Error ? e.message : String(e);
      if (Date.now() >= deadline) {
        throw new Error(`DB 접속 실패 (${attempt}회 시도, ${timeoutMs / 1000}초 초과): ${message}`);
      }
      console.log(`[bootstrap] DB 접속 대기 중… (${attempt}회차: ${message})`);
      await sleep(2000);
    }
  }
}

/** tsx 실행 파일 위치. 런타임 이미지와 로컬 node_modules 배치가 달라 후보를 순회한다. */
function runScript(file: string): void {
  const cliJs = path.join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");
  const [cmd, args] = existsSync(cliJs)
    ? [process.execPath, [cliJs, path.join(ROOT, file)]]
    : [path.join(ROOT, "node_modules", ".bin", "tsx"), [path.join(ROOT, file)]];

  if (cmd !== process.execPath && !existsSync(cmd)) {
    throw new Error(`tsx 를 찾을 수 없습니다: ${cliJs}`);
  }

  const result = spawnSync(cmd, args, { stdio: "inherit", cwd: ROOT, env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${file} 실행 실패 (exit ${result.status})`);
  }
}

async function main() {
  const mode = resolveMode();
  if (mode === "off") {
    console.log("[bootstrap] DB_BOOTSTRAP=off → 건너뜁니다.");
    return;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL 이 설정되지 않았습니다. 컨테이너 환경변수를 확인하세요.");
  }

  const client = await connectWithRetry(connectionString, resolveTimeoutMs());
  let alreadyInitialized: boolean;
  try {
    const { rows } = await client.query<{ present: boolean }>(
      "SELECT to_regclass('public.orders') IS NOT NULL AS present",
    );
    alreadyInitialized = rows[0]?.present === true;
  } finally {
    await client.end();
  }

  if (alreadyInitialized && mode === "auto") {
    console.log("[bootstrap] 기존 스키마를 발견했습니다 → 그대로 사용합니다. (재생성하려면 DB_BOOTSTRAP=force)");
    return;
  }

  if (alreadyInitialized) {
    console.log("[bootstrap] DB_BOOTSTRAP=force → 기존 스키마와 데이터를 삭제하고 재생성합니다.");
  } else {
    console.log("[bootstrap] 빈 DB 입니다 → 스키마를 생성합니다.");
  }

  runScript("scripts/migrate.ts");

  if (seedEnabled) {
    runScript("scripts/seed.ts");
  } else {
    console.log("[bootstrap] DB_BOOTSTRAP_SEED=false → 샘플 데이터는 넣지 않습니다.");
  }

  console.log("[bootstrap] 완료");
}

main().catch((e) => {
  console.error("\n[bootstrap] 실패:", e instanceof Error ? e.message : e);
  process.exit(1);
});
