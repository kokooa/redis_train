/**
 * 09. Expiry & Caching (만료 & 캐싱)
 *
 * Redis의 핵심 활용 사례 중 하나인 캐싱 패턴을 다룹니다.
 * TTL(Time To Live)을 설정하여 데이터를 자동으로 만료시킬 수 있습니다.
 *
 * 주요 명령어: EXPIRE, TTL, PEXPIRE, PTTL, PERSIST, EXPIREAT
 */
import { createClient } from "redis";

interface UserRecord {
  id: number;
  name: string;
  role: string;
}

async function main(): Promise<void> {
  const client = createClient();
  await client.connect();
  console.log("=== Expiry & Caching (만료 & 캐싱) ===\n");

  // --- TTL 기본 ---
  console.log("--- TTL 기본 ---");

  await client.set("temp:data", "임시 데이터");

  // EXPIRE: 만료 시간 설정 (초)
  await client.expire("temp:data", 10);
  console.log("TTL:", await client.ttl("temp:data"), "초"); // 10

  // PTTL: 밀리초 단위 TTL
  console.log("PTTL:", await client.pTtl("temp:data"), "ms");

  // TTL이 없는 키
  await client.set("permanent", "영구 데이터");
  console.log("영구 키 TTL:", await client.ttl("permanent")); // -1 (만료 없음)

  // 존재하지 않는 키
  console.log("없는 키 TTL:", await client.ttl("nonexistent")); // -2

  // --- PERSIST: TTL 제거 ---
  console.log("\n--- PERSIST ---");
  await client.set("will_persist", "데이터", { EX: 30 });
  console.log("설정된 TTL:", await client.ttl("will_persist"));

  await client.persist("will_persist");
  console.log("PERSIST 후 TTL:", await client.ttl("will_persist")); // -1

  // --- 만료 관찰 ---
  console.log("\n--- 만료 관찰 ---");
  await client.set("short_lived", "곧 사라짐", { EX: 2 });
  console.log("설정 직후:", await client.get("short_lived"));
  console.log("TTL:", await client.ttl("short_lived"));

  console.log("2초 대기 중...");
  await new Promise<void>((resolve) => setTimeout(resolve, 2100));

  console.log("2초 후:", await client.get("short_lived")); // null (만료됨)
  console.log("TTL:", await client.ttl("short_lived")); // -2 (키 없음)

  // --- Cache-Aside 패턴 ---
  console.log("\n--- Cache-Aside 패턴 ---");

  // 가상의 DB 조회 함수
  async function fetchFromDB(userId: number): Promise<UserRecord> {
    console.log(`  [DB] user:${userId} 조회 중... (느린 작업)`);
    await new Promise<void>((resolve) => setTimeout(resolve, 100)); // DB 지연 시뮬레이션
    return { id: userId, name: "홍길동", role: "developer" };
  }

  // 캐시를 활용한 조회
  async function getUser(userId: number): Promise<UserRecord> {
    const cacheKey = `cache:user:${userId}`;

    // 1. 캐시 확인
    const cached = await client.get(cacheKey);
    if (cached) {
      console.log(`  [CACHE HIT] user:${userId}`);
      return JSON.parse(cached) as UserRecord;
    }

    // 2. 캐시 미스 -> DB 조회
    console.log(`  [CACHE MISS] user:${userId}`);
    const data = await fetchFromDB(userId);

    // 3. 캐시에 저장 (60초 TTL)
    await client.set(cacheKey, JSON.stringify(data), { EX: 60 });

    return data;
  }

  // 첫 번째 호출: CACHE MISS -> DB 조회
  const start1 = Date.now();
  const user1 = await getUser(1);
  console.log(`  결과: ${JSON.stringify(user1)} (${Date.now() - start1}ms)`);

  // 두 번째 호출: CACHE HIT -> 캐시에서 반환
  const start2 = Date.now();
  const user2 = await getUser(1);
  console.log(`  결과: ${JSON.stringify(user2)} (${Date.now() - start2}ms)`);

  // --- Write-Through 캐시 패턴 ---
  console.log("\n--- Write-Through 캐시 패턴 ---");

  async function updateUser(userId: number, data: UserRecord): Promise<void> {
    const cacheKey = `cache:user:${userId}`;

    // 1. DB 업데이트 (시뮬레이션)
    console.log(`  [DB] user:${userId} 업데이트`);

    // 2. 캐시도 함께 업데이트
    await client.set(cacheKey, JSON.stringify(data), { EX: 60 });
    console.log(`  [CACHE] user:${userId} 갱신`);
  }

  await updateUser(1, { id: 1, name: "홍길동", role: "admin" });
  const updated = await getUser(1); // CACHE HIT
  console.log("  업데이트된 데이터:", updated);

  // --- 캐시 무효화 ---
  console.log("\n--- 캐시 무효화 ---");

  async function invalidateCache(userId: number): Promise<void> {
    const cacheKey = `cache:user:${userId}`;
    await client.del(cacheKey);
    console.log(`  [CACHE] user:${userId} 무효화`);
  }

  await invalidateCache(1);
  await getUser(1); // CACHE MISS -> DB 재조회

  // 정리
  await client.flushDb();
  await client.disconnect();
  console.log("\n완료!");
}

main().catch(console.error);
