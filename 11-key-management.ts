/**
 * 11. Key Management (키 관리)
 *
 * Redis 키를 관리하는 다양한 명령어를 다룹니다.
 * 키 네이밍 규칙, 검색, 타입 확인 등을 학습합니다.
 *
 * 주요 명령어: KEYS, SCAN, TYPE, RENAME, EXISTS, DEL, UNLINK
 */
import { createClient } from "redis";

async function main(): Promise<void> {
  const client = createClient();
  await client.connect();
  console.log("=== Key Management (키 관리) ===\n");

  // --- 키 네이밍 규칙 ---
  console.log("--- 키 네이밍 규칙 ---");
  console.log("Redis에서는 콜론(:)으로 네임스페이스를 구분합니다:");
  console.log("  user:100:profile  (사용자 100의 프로필)");
  console.log("  cache:api:/users  (API 캐시)");
  console.log("  session:abc123    (세션)");
  console.log("  queue:email       (이메일 큐)");

  // 예시 데이터 생성
  await client.set("user:1:name", "김철수");
  await client.set("user:1:email", "kim@test.com");
  await client.set("user:2:name", "이영희");
  await client.set("user:2:email", "lee@test.com");
  await client.hSet("user:1:profile", { age: "28", city: "서울" });
  await client.sAdd("user:1:tags", ["developer", "gamer"]);
  await client.zAdd("ranking:game", [
    { score: 100, value: "player1" },
    { score: 200, value: "player2" },
  ]);
  await client.rPush("queue:tasks", ["task1", "task2"]);

  // --- TYPE: 키의 자료구조 타입 확인 ---
  console.log("\n--- TYPE ---");
  console.log("user:1:name →", await client.type("user:1:name")); // string
  console.log("user:1:profile →", await client.type("user:1:profile")); // hash
  console.log("user:1:tags →", await client.type("user:1:tags")); // set
  console.log("ranking:game →", await client.type("ranking:game")); // zset
  console.log("queue:tasks →", await client.type("queue:tasks")); // list

  // --- EXISTS: 키 존재 확인 ---
  console.log("\n--- EXISTS ---");
  console.log("user:1:name 존재?", await client.exists("user:1:name")); // 1
  console.log("user:999:name 존재?", await client.exists("user:999:name")); // 0

  // 여러 키 한번에 확인
  const existCount = await client.exists([
    "user:1:name",
    "user:2:name",
    "user:3:name",
  ]);
  console.log("3개 중 존재하는 키 수:", existCount); // 2

  // --- KEYS: 패턴으로 키 검색 ---
  console.log("\n--- KEYS (주의: 프로덕션에서는 SCAN 사용) ---");
  // * : 모든 문자
  // ? : 한 문자
  // [ae] : a 또는 e
  const userKeys = await client.keys("user:1:*");
  console.log("user:1:* 패턴:", userKeys);

  const allUserKeys = await client.keys("user:*");
  console.log("user:* 패턴:", allUserKeys);

  // --- SCAN: 프로덕션용 키 검색 (커서 기반, 논블로킹) ---
  console.log("\n--- SCAN (프로덕션 권장) ---");

  // SCAN은 커서 기반으로 조금씩 조회하여 서버 부담이 적음
  const scannedKeys: string[] = [];
  for await (const key of client.scanIterator({ MATCH: "user:*", COUNT: 10 })) {
    scannedKeys.push(key as unknown as string);
  }
  console.log("SCAN user:* 결과:", scannedKeys);

  // --- RENAME: 키 이름 변경 ---
  console.log("\n--- RENAME ---");
  await client.set("old_key", "데이터");
  await client.rename("old_key", "new_key");
  console.log("이름 변경 후:", await client.get("new_key"));
  console.log("원래 키:", await client.get("old_key")); // null

  // --- DEL vs UNLINK ---
  console.log("\n--- DEL vs UNLINK ---");
  await client.set("del_test1", "v1");
  await client.set("del_test2", "v2");

  // DEL: 동기적 삭제 (블로킹)
  const delCount = await client.del(["del_test1", "del_test2"]);
  console.log("DEL 삭제 개수:", delCount);

  // UNLINK: 비동기적 삭제 (논블로킹, 큰 키에 유리)
  await client.set("unlink_test", "big data");
  await client.unlink("unlink_test");
  console.log("UNLINK 후:", await client.get("unlink_test")); // null

  // --- DUMP / OBJECT ENCODING ---
  console.log("\n--- OBJECT ENCODING ---");
  await client.set("small_num", "123");
  await client.set("long_string", "a".repeat(100));

  // Redis 내부 인코딩 확인 (메모리 최적화 이해)
  console.log(
    "small_num 인코딩:",
    await client.sendCommand(["OBJECT", "ENCODING", "small_num"])
  ); // int
  console.log(
    "long_string 인코딩:",
    await client.sendCommand(["OBJECT", "ENCODING", "long_string"])
  ); // embstr 또는 raw
  // 정리
  await client.flushDb();
  await client.disconnect();
  console.log("\n완료!");
}

main().catch(console.error);
