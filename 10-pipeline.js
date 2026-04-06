/**
 * 10. Pipeline (파이프라인)
 *
 * 여러 명령어를 한번에 서버로 보내서 네트워크 왕복 시간(RTT)을 줄입니다.
 * 트랜잭션과 달리 원자성은 보장하지 않지만 성능이 크게 향상됩니다.
 * 대량의 명령어를 처리할 때 필수적입니다.
 */
const { createClient } = require("redis");

async function main() {
  const client = createClient();
  await client.connect();
  console.log("=== Pipeline (파이프라인) ===\n");

  // --- 파이프라인 vs 개별 실행 성능 비교 ---
  console.log("--- 성능 비교: 개별 vs 파이프라인 ---");
  const COUNT = 1000;

  // 개별 실행
  const start1 = Date.now();
  for (let i = 0; i < COUNT; i++) {
    await client.set(`individual:${i}`, `value:${i}`);
  }
  const time1 = Date.now() - start1;
  console.log(`개별 실행 ${COUNT}개: ${time1}ms`);

  // 파이프라인 실행
  const start2 = Date.now();
  const pipeline = client.multi(); // multi()를 파이프라인처럼 활용
  for (let i = 0; i < COUNT; i++) {
    pipeline.set(`pipeline:${i}`, `value:${i}`);
  }
  await pipeline.exec();
  const time2 = Date.now() - start2;
  console.log(`파이프라인 ${COUNT}개: ${time2}ms`);
  console.log(`속도 향상: ${(time1 / time2).toFixed(1)}배 빠름`);

  // --- 파이프라인으로 대량 읽기 ---
  console.log("\n--- 파이프라인으로 대량 읽기 ---");

  const readPipeline = client.multi();
  for (let i = 0; i < 5; i++) {
    readPipeline.get(`pipeline:${i}`);
  }
  const readResults = await readPipeline.exec();
  console.log("읽기 결과:", readResults);

  // --- 파이프라인으로 혼합 명령 ---
  console.log("\n--- 혼합 명령 파이프라인 ---");

  const mixedResults = await client
    .multi()
    .set("pipe:name", "Redis")
    .set("pipe:version", "7")
    .get("pipe:name")
    .get("pipe:version")
    .del("pipe:name")
    .exists("pipe:name")
    .exec();

  console.log("혼합 결과:", mixedResults);
  // [OK, OK, "Redis", "7", 1, 0]

  // --- 실용 예제: 대량 데이터 초기화 ---
  console.log("\n--- 실용 예제: 대량 초기 데이터 ---");

  const users = [
    { id: 1, name: "김철수", score: 85 },
    { id: 2, name: "이영희", score: 92 },
    { id: 3, name: "박민수", score: 78 },
    { id: 4, name: "정다은", score: 95 },
    { id: 5, name: "홍길동", score: 88 },
  ];

  const initPipeline = client.multi();
  for (const user of users) {
    // 해시에 사용자 정보 저장
    initPipeline.hSet(`user:${user.id}`, {
      name: user.name,
      score: user.score.toString(),
    });
    // Sorted Set에 점수 등록
    initPipeline.zAdd("ranking", { score: user.score, value: user.name });
  }
  await initPipeline.exec();
  console.log("대량 초기화 완료");

  // 결과 확인
  const ranking = await client.zRangeWithScores("ranking", 0, -1, {
    REV: true,
  });
  console.log("랭킹:");
  ranking.forEach((item, i) =>
    console.log(`  ${i + 1}. ${item.value}: ${item.score}점`)
  );

  // 정리
  await client.flushDb();
  await client.disconnect();
  console.log("\n완료!");
}

main().catch(console.error);
