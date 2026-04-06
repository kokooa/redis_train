/**
 * 03. Lists (리스트)
 *
 * Linked List 기반의 자료구조입니다.
 * 양쪽 끝에서의 삽입/삭제가 O(1)로 매우 빠릅니다.
 * 큐(Queue), 스택(Stack), 메시지 큐 등에 활용됩니다.
 *
 * 주요 명령어: LPUSH, RPUSH, LPOP, RPOP, LRANGE, LLEN, LINDEX, LTRIM
 */
const { createClient } = require("redis");

async function main() {
  const client = createClient();
  await client.connect();
  console.log("=== Lists (리스트) ===\n");

  // --- LPUSH / RPUSH ---
  console.log("--- LPUSH / RPUSH ---");
  // RPUSH: 오른쪽(끝)에 추가
  await client.rPush("fruits", "사과");
  await client.rPush("fruits", "바나나");
  await client.rPush("fruits", "포도");
  // 결과: [사과, 바나나, 포도]

  // LPUSH: 왼쪽(앞)에 추가
  await client.lPush("fruits", "딸기");
  // 결과: [딸기, 사과, 바나나, 포도]

  // LRANGE: 범위 조회 (0 ~ -1 = 전체)
  const allFruits = await client.lRange("fruits", 0, -1);
  console.log("전체 리스트:", allFruits);

  // LLEN: 리스트 길이
  console.log("리스트 길이:", await client.lLen("fruits"));

  // --- LPOP / RPOP ---
  console.log("\n--- LPOP / RPOP ---");
  const left = await client.lPop("fruits");
  console.log("LPOP (왼쪽 꺼내기):", left); // 딸기
  const right = await client.rPop("fruits");
  console.log("RPOP (오른쪽 꺼내기):", right); // 포도
  console.log("남은 리스트:", await client.lRange("fruits", 0, -1));

  // --- 큐(Queue) 패턴: FIFO ---
  console.log("\n--- 큐(Queue) 패턴: FIFO ---");
  // RPUSH로 넣고 LPOP으로 꺼내면 = Queue (선입선출)
  await client.rPush("queue:tasks", "작업1");
  await client.rPush("queue:tasks", "작업2");
  await client.rPush("queue:tasks", "작업3");

  console.log("처리:", await client.lPop("queue:tasks")); // 작업1 (먼저 들어간 것 먼저 나옴)
  console.log("처리:", await client.lPop("queue:tasks")); // 작업2
  console.log("처리:", await client.lPop("queue:tasks")); // 작업3

  // --- 스택(Stack) 패턴: LIFO ---
  console.log("\n--- 스택(Stack) 패턴: LIFO ---");
  // LPUSH로 넣고 LPOP으로 꺼내면 = Stack (후입선출)
  await client.lPush("stack:history", "페이지A");
  await client.lPush("stack:history", "페이지B");
  await client.lPush("stack:history", "페이지C");

  console.log("뒤로가기:", await client.lPop("stack:history")); // 페이지C (마지막에 넣은 것 먼저)
  console.log("뒤로가기:", await client.lPop("stack:history")); // 페이지B

  // --- LINDEX / LPOS ---
  console.log("\n--- LINDEX ---");
  await client.rPush("colors", ["빨강", "주황", "노랑", "초록", "파랑"]);
  console.log("인덱스 0:", await client.lIndex("colors", 0)); // 빨강
  console.log("인덱스 -1:", await client.lIndex("colors", -1)); // 파랑 (마지막)

  // --- LTRIM: 리스트 잘라내기 (최근 N개만 유지) ---
  console.log("\n--- LTRIM (최근 N개만 유지) ---");
  for (let i = 1; i <= 10; i++) {
    await client.lPush("recent:logs", `로그 #${i}`);
  }
  console.log("TRIM 전:", await client.lRange("recent:logs", 0, -1));

  // 최근 5개만 유지
  await client.lTrim("recent:logs", 0, 4);
  console.log("TRIM 후 (최근 5개):", await client.lRange("recent:logs", 0, -1));

  // 정리
  await client.flushDb();
  await client.disconnect();
  console.log("\n완료!");
}

main().catch(console.error);
