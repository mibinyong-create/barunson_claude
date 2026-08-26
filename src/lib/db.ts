import { Pool, types, type PoolClient, type QueryResultRow } from "pg";

// DATE(OID 1082) 는 기본적으로 로컬 타임존 Date 로 파싱되어 하루씩 밀릴 수 있다.
// 화면·API 모두 'YYYY-MM-DD' 문자열만 쓰므로 원문 그대로 받는다.
types.setTypeParser(types.builtins.DATE, (value) => value);
// bigint(int8) 는 문자열로 오므로 집계값을 number 로 바꿔준다.
// 다만 2^53 을 넘으면 정밀도가 깨지므로 그때는 문자열 원문을 그대로 남긴다.
types.setTypeParser(types.builtins.INT8, (value) => {
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : (value as unknown as number);
});
// numeric 도 동일
types.setTypeParser(types.builtins.NUMERIC, (value) => Number(value));

/**
 * 커넥션 풀은 "처음 쿼리할 때" 만들어진다.
 * 모듈 로드 시점에 만들면 DATABASE_URL 이 없는 빌드 환경(Docker 이미지 빌드 등)에서
 * next build 가 실패하기 때문이다.
 */
const globalForPool = globalThis as unknown as {
  __orderPool?: Pool;
  __orderPoolHooked?: boolean;
};

/** 풀 크기. 빈 문자열·오타로 0/NaN 이 되어 풀이 잠기는 것을 막는다. */
function resolvePoolMax(): number {
  const n = Number(process.env.PGPOOL_MAX);
  return Number.isInteger(n) && n > 0 ? n : 10;
}

function resolveConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL 환경변수가 설정되지 않았습니다. .env.example 을 복사해 .env 를 만들거나 컨테이너 환경변수로 주입하세요.",
    );
  }
  return url;
}

function createPool(): Pool {
  const pool = new Pool({
    connectionString: resolveConnectionString(),
    max: resolvePoolMax(),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    // 느린 쿼리 하나가 풀 슬롯을 무기한 점유하지 못하도록 양쪽에 상한을 둔다.
    statement_timeout: 15_000,
    query_timeout: 15_000,
    idle_in_transaction_session_timeout: 30_000,
  });

  // 유휴 커넥션 오류(DB 재시작·네트워크 단절 등)를 반드시 흡수한다.
  // 리스너가 없으면 Node 가 unhandled 'error' 로 프로세스를 종료시킨다.
  pool.on("error", (err) => {
    console.error("[db] idle client error:", err);
  });

  return pool;
}

/** 모듈이 여러 번 평가되어도 풀은 하나만 유지한다. */
function getPool(): Pool {
  if (!globalForPool.__orderPool) {
    globalForPool.__orderPool = createPool();

    // 재배포 시 커넥션을 정리한다. dev 는 HMR 때문에 훅을 걸지 않는다.
    if (process.env.NODE_ENV === "production" && !globalForPool.__orderPoolHooked) {
      globalForPool.__orderPoolHooked = true;
      const shutdown = () => {
        void globalForPool.__orderPool?.end();
      };
      process.once("SIGTERM", shutdown);
      process.once("SIGINT", shutdown);
    }
  }
  return globalForPool.__orderPool;
}

export async function query<T extends QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const res = await getPool().query<T>(text, params);
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
  const client = await getPool().connect();
  // ROLLBACK 까지 실패한 커넥션은 트랜잭션이 열린 채로 남으므로 재사용하면 안 된다.
  let poisoned: Error | undefined;

  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      poisoned = rollbackError as Error;
      console.error("[db] ROLLBACK failed:", rollbackError);
    }
    // 롤백 실패가 원본 예외를 덮어쓰지 않도록 항상 원본을 던진다.
    throw e;
  } finally {
    // 인자를 주면 pg 가 해당 커넥션을 풀에서 폐기한다.
    client.release(poisoned);
  }
}
