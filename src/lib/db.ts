import { Pool, types, type PoolClient, type QueryResultRow } from "pg";

// DATE(OID 1082) 는 기본적으로 로컬 타임존 Date 로 파싱되어 하루씩 밀릴 수 있다.
// 화면·API 모두 'YYYY-MM-DD' 문자열만 쓰므로 원문 그대로 받는다.
types.setTypeParser(types.builtins.DATE, (value) => value);
// bigint(20) 는 문자열로 오므로 집계값을 number 로 바꿔준다. (건수/금액 범위상 안전)
types.setTypeParser(types.builtins.INT8, (value) => Number(value));
// numeric 도 동일
types.setTypeParser(types.builtins.NUMERIC, (value) => Number(value));

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://order_admin:order_admin_pw@localhost:5433/order_manager";

// Next.js dev 는 모듈을 여러 번 평가하므로 전역에 풀을 캐시해 커넥션 누수를 막는다.
const globalForPool = globalThis as unknown as { __orderPool?: Pool };

export const pool: Pool =
  globalForPool.__orderPool ??
  new Pool({
    connectionString,
    max: Number(process.env.PGPOOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPool.__orderPool = pool;
}

export async function query<T extends QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const res = await pool.query<T>(text, params);
  return res.rows;
}

export async function queryOne<T extends QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/** 콜백 전체를 하나의 트랜잭션으로 실행한다. 예외 발생 시 ROLLBACK. */
export async function transaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
