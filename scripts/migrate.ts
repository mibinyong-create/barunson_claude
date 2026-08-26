/**
 * 스키마 재생성 스크립트.
 *   npm run db:migrate
 *
 * db/schema.sql 은 DROP SCHEMA public CASCADE 로 시작하므로
 * 기존 데이터는 모두 삭제됩니다.
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";

const ROOT = process.cwd();

async function main() {
  // 이 스크립트는 DROP SCHEMA public CASCADE 를 실행한다.
  // 기본값으로 폴백하면 의도치 않은 DB 를 날릴 수 있으므로 반드시 명시해야 한다.
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL 이 설정되지 않았습니다. .env 를 확인하세요.");
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    for (const file of ["db/schema.sql", "db/reference-data.sql"]) {
      const sql = await readFile(path.join(ROOT, file), "utf8");
      process.stdout.write(`▸ ${file} 실행 중… `);
      await client.query(sql);
      console.log("완료");
    }

    const { rows } = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       ORDER BY table_name`,
    );
    console.log(`\n생성된 테이블 ${rows.length}개:`);
    console.log(rows.map((r) => `  - ${r.table_name}`).join("\n"));
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("\n마이그레이션 실패:", e);
  process.exit(1);
});
