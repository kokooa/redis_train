/**
 * 02. Strings (문자열)
 *
 * Redis의 가장 기본적인 자료구조입니다.
 * 문자열, 숫자, 직렬화된 JSON 등 모든 종류의 데이터를 저장할 수 있습니다.
 * 최대 512MB까지 저장 가능합니다.
 *
 * 주요 명령어: SET, GET, MSET, MGET, INCR, DECR, APPEND, SETEX
 */
const { createClient } = require("redis");

async function main() {
  const client = createClient();
  await client.connect();
  console.log("=== Strings (문자열) ===\n");

  // --- 기본 SET / GET ---
  console.log("--- 기본 SET / GET ---");
  await client.set("name", "Redis");
  const name = await client.get("name");
  console.log("GET name:", name); // "Redis"

  // 존재하지 않는 키
  const notExist = await client.get("nonexistent");
  console.log("존재하지 않는 키:", notExist); // null

  // --- 숫자 증감 (INCR / DECR) ---
  console.log("\n--- 숫자 증감 ---");
  await client.set("counter", "0");
  await client.incr("counter"); // 1
  await client.incr("counter"); // 2
  await client.incr("counter"); // 3
  console.log("INCR 3번 후:", await client.get("counter")); // "3"

  await client.decr("counter"); // 2
  console.log("DECR 1번 후:", await client.get("counter")); // "2"

  await client.incrBy("counter", 10); // 12
  console.log("INCRBY 10 후:", await client.get("counter")); // "12"

  // --- 다중 SET / GET (MSET / MGET) ---
  console.log("\n--- 다중 SET / GET ---");
  await client.mSet(["city", "Seoul", "country", "Korea", "lang", "Korean"]);
  const values = await client.mGet(["city", "country", "lang"]);
  console.log("MGET:", values); // ["Seoul", "Korea", "Korean"]

  // --- TTL (만료 시간) ---
  console.log("\n--- TTL (만료 시간) ---");
  // SETEX: 키에 값과 만료시간(초)을 동시에 설정
  await client.setEx("session:abc123", 5, "user_data_here");
  console.log("session 값:", await client.get("session:abc123"));
  console.log("남은 TTL(초):", await client.ttl("session:abc123"));

  // SET에 EX 옵션 사용
  await client.set("temp_key", "temp_value", { EX: 10 }); // 10초 후 만료
  console.log("temp_key TTL:", await client.ttl("temp_key"));

  // --- NX / XX 옵션 ---
  console.log("\n--- NX / XX 옵션 ---");
  // NX: 키가 존재하지 않을 때만 SET (분산 락에 활용)
  await client.set("lock:resource", "owner1", { NX: true });
  console.log("첫 번째 NX SET:", await client.get("lock:resource")); // "owner1"

  await client.set("lock:resource", "owner2", { NX: true });
  console.log("두 번째 NX SET (실패):", await client.get("lock:resource")); // 여전히 "owner1"

  // XX: 키가 이미 존재할 때만 SET
  await client.set("lock:resource", "updated", { XX: true });
  console.log("XX SET (성공):", await client.get("lock:resource")); // "updated"

  // --- APPEND ---
  console.log("\n--- APPEND ---");
  await client.set("greeting", "Hello");
  await client.append("greeting", " World!");
  console.log("APPEND 후:", await client.get("greeting")); // "Hello World!"

  // --- JSON 저장 ---
  console.log("\n--- JSON 저장 ---");
  const user = { id: 1, name: "홍길동", age: 30 };
  await client.set("user:1", JSON.stringify(user));
  const stored = JSON.parse(await client.get("user:1"));
  console.log("저장된 JSON:", stored);

  // 정리
  await client.flushDb();
  await client.disconnect();
  console.log("\n완료!");
}

main().catch(console.error);
