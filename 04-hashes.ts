/**
 * 04. Hashes (해시)
 *
 * 필드-값 쌍의 집합으로, 객체(Object)를 표현하기에 적합합니다.
 * 각 해시는 2^32 - 1개의 필드를 가질 수 있습니다.
 * 사용자 프로필, 설정값 등을 저장할 때 유용합니다.
 *
 * 주요 명령어: HSET, HGET, HMSET, HGETALL, HDEL, HEXISTS, HINCRBY
 */
import { createClient } from "redis";

async function main(): Promise<void> {
  const client = createClient();
  await client.connect();
  console.log("=== Hashes (해시) ===\n");

  // --- 기본 HSET / HGET ---
  console.log("--- 기본 HSET / HGET ---");
  // 사용자 프로필 저장
  await client.hSet("user:100", {
    name: "김철수",
    email: "kim@example.com",
    age: "28",
    city: "서울",
  });

  const userName = await client.hGet("user:100", "name");
  console.log("이름:", userName); // 김철수

  const email = await client.hGet("user:100", "email");
  console.log("이메일:", email);

  // --- HGETALL: 모든 필드 조회 ---
  console.log("\n--- HGETALL ---");
  const allFields = await client.hGetAll("user:100");
  console.log("전체 프로필:", allFields);

  // --- HMGET: 여러 필드 한번에 조회 ---
  console.log("\n--- HMGET ---");
  // node-redis v4에서는 hGetAll이나 개별 hGet 사용
  const nameAndCity: (string | null | undefined)[] = [
    await client.hGet("user:100", "name"),
    await client.hGet("user:100", "city"),
  ];
  console.log("이름, 도시:", nameAndCity);

  // --- HEXISTS / HDEL ---
  console.log("\n--- HEXISTS / HDEL ---");
  console.log("email 필드 존재?", await client.hExists("user:100", "email")); // true
  await client.hDel("user:100", "email");
  console.log("삭제 후 존재?", await client.hExists("user:100", "email")); // false

  // --- HINCRBY: 숫자 필드 증감 ---
  console.log("\n--- HINCRBY ---");
  await client.hSet("product:1", {
    name: "노트북",
    price: "1500000",
    stock: "50",
    views: "0",
  });

  await client.hIncrBy("product:1", "views", 1);
  await client.hIncrBy("product:1", "views", 1);
  await client.hIncrBy("product:1", "views", 1);
  console.log("조회수:", await client.hGet("product:1", "views")); // 3

  await client.hIncrBy("product:1", "stock", -3); // 재고 감소
  console.log("재고:", await client.hGet("product:1", "stock")); // 47

  // --- HKEYS / HVALS / HLEN ---
  console.log("\n--- HKEYS / HVALS / HLEN ---");
  const keys = await client.hKeys("product:1");
  console.log("필드 목록:", keys);

  const vals = await client.hVals("product:1");
  console.log("값 목록:", vals);

  console.log("필드 개수:", await client.hLen("product:1"));

  // --- 실용 예제: 장바구니 ---
  console.log("\n--- 실용 예제: 장바구니 ---");
  const cartKey = "cart:user:100";

  // 상품 추가 (필드=상품ID, 값=수량)
  await client.hSet(cartKey, "product:1", "2");
  await client.hSet(cartKey, "product:5", "1");
  await client.hSet(cartKey, "product:12", "3");

  // 수량 변경
  await client.hIncrBy(cartKey, "product:1", 1); // 2 -> 3

  // 장바구니 조회
  const cart = await client.hGetAll(cartKey);
  console.log("장바구니:", cart);

  // 상품 제거
  await client.hDel(cartKey, "product:5");
  console.log("제거 후:", await client.hGetAll(cartKey));

  // 정리
  await client.flushDb();
  await client.disconnect();
  console.log("\n완료!");
}

main().catch(console.error);
