/**
 * 08. Transactions (트랜잭션)
 *
 * 여러 명령어를 원자적(atomic)으로 실행합니다.
 * MULTI로 시작하여 EXEC로 일괄 실행합니다.
 * 트랜잭션 내 명령어들은 다른 클라이언트의 명령어와 섞이지 않습니다.
 *
 * 주요 명령어: MULTI, EXEC, DISCARD, WATCH
 */
const { createClient } = require("redis");

async function main() {
  const client = createClient();
  await client.connect();
  console.log("=== Transactions (트랜잭션) ===\n");

  // --- 기본 트랜잭션 (MULTI/EXEC) ---
  console.log("--- 기본 트랜잭션 ---");

  // multi()로 트랜잭션 시작, exec()로 일괄 실행
  const results = await client
    .multi()
    .set("tx:key1", "value1")
    .set("tx:key2", "value2")
    .get("tx:key1")
    .get("tx:key2")
    .exec();

  console.log("트랜잭션 결과:", results);
  // [OK, OK, "value1", "value2"] - 모든 명령의 결과가 배열로 반환

  // --- 트랜잭션으로 원자적 이체 ---
  console.log("\n--- 원자적 이체 예제 ---");

  // 초기 잔액 설정
  await client.set("balance:A", "1000");
  await client.set("balance:B", "500");
  console.log(
    "이체 전 - A:",
    await client.get("balance:A"),
    "B:",
    await client.get("balance:B")
  );

  // A -> B로 300원 이체 (원자적)
  const transferAmount = 300;
  await client
    .multi()
    .decrBy("balance:A", transferAmount)
    .incrBy("balance:B", transferAmount)
    .exec();

  console.log(
    "이체 후 - A:",
    await client.get("balance:A"),
    "B:",
    await client.get("balance:B")
  );

  // --- WATCH를 이용한 낙관적 락 (Optimistic Locking) ---
  console.log("\n--- WATCH (낙관적 락) ---");

  await client.set("stock:item:1", "10");

  // 재고 차감 시뮬레이션
  async function purchaseItem(clientInstance, itemKey, userId) {
    // WATCH: 키 변경 감시 시작
    await clientInstance.watch(itemKey);

    const stock = parseInt(await clientInstance.get(itemKey));
    console.log(`  [${userId}] 현재 재고 확인: ${stock}`);

    if (stock <= 0) {
      await clientInstance.unWatch();
      console.log(`  [${userId}] 재고 없음 - 구매 실패`);
      return false;
    }

    // 트랜잭션 실행 - WATCH한 키가 변경되었으면 null 반환
    const result = await clientInstance.multi().decrBy(itemKey, 1).exec();

    if (result === null) {
      console.log(`  [${userId}] 다른 사용자가 먼저 변경 - 재시도 필요`);
      return false;
    }

    console.log(`  [${userId}] 구매 성공! 남은 재고: ${result[0]}`);
    return true;
  }

  // 순차 구매 테스트
  await purchaseItem(client, "stock:item:1", "user1");
  await purchaseItem(client, "stock:item:1", "user2");
  console.log("최종 재고:", await client.get("stock:item:1"));

  // --- 트랜잭션 내 에러 처리 ---
  console.log("\n--- 에러 처리 ---");

  await client.set("number", "100");
  await client.set("text", "hello");

  try {
    // INCR을 문자열에 적용하면 에러 발생
    // 하지만 트랜잭션의 다른 명령은 정상 실행됨 (부분 실패 가능)
    const errorResults = await client
      .multi()
      .incr("number") // 성공: 101
      .incr("text") // 실패: 문자열에 INCR 불가
      .incr("number") // 성공: 102
      .exec();

    console.log("결과:", errorResults);
  } catch (err) {
    console.log("트랜잭션 에러:", err.message);
  }

  console.log("number 최종값:", await client.get("number"));

  // 정리
  await client.flushDb();
  await client.disconnect();
  console.log("\n완료!");
}

main().catch(console.error);
