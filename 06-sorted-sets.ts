/**
 * 06. Sorted Sets (정렬된 집합)
 *
 * Set과 비슷하지만 각 멤버에 score(점수)가 있어 자동 정렬됩니다.
 * score가 같으면 사전순으로 정렬됩니다.
 * 랭킹, 리더보드, 타임라인 등에 활용됩니다.
 *
 * 주요 명령어: ZADD, ZRANGE, ZRANK, ZSCORE, ZRANGEBYSCORE, ZINCRBY
 */
import { createClient } from "redis";

async function main(): Promise<void> {
  const client = createClient();
  await client.connect();
  console.log("=== Sorted Sets (정렬된 집합) ===\n");

  // --- 기본 ZADD / ZRANGE ---
  console.log("--- 기본 ZADD / ZRANGE ---");
  // 게임 리더보드: score = 점수
  await client.zAdd("leaderboard", [
    { score: 1500, value: "player:김철수" },
    { score: 2300, value: "player:이영희" },
    { score: 1800, value: "player:박민수" },
    { score: 3100, value: "player:정다은" },
    { score: 2100, value: "player:홍길동" },
  ]);

  // 점수 오름차순 (낮은 점수부터)
  const ascending = await client.zRange("leaderboard", 0, -1);
  console.log("오름차순:", ascending);

  // 점수 내림차순 (높은 점수부터) - REV 옵션
  const descending = await client.zRange("leaderboard", 0, -1, { REV: true });
  console.log("내림차순:", descending);

  // WITHSCORES: 점수와 함께 조회
  const withScores = await client.zRangeWithScores("leaderboard", 0, -1, {
    REV: true,
  });
  console.log("점수 포함:");
  withScores.forEach((item, i) => {
    console.log(`  ${i + 1}위: ${item.value} (${item.score}점)`);
  });

  // --- ZRANK / ZSCORE ---
  console.log("\n--- ZRANK / ZSCORE ---");
  // ZRANK: 순위 (0부터 시작, 오름차순 기준)
  const rank = await client.zRank("leaderboard", "player:이영희");
  console.log("이영희 순위 (오름차순):", rank);

  // ZSCORE: 점수 조회
  const score = await client.zScore("leaderboard", "player:이영희");
  console.log("이영희 점수:", score);

  // --- ZINCRBY: 점수 증감 ---
  console.log("\n--- ZINCRBY ---");
  await client.zIncrBy("leaderboard", 500, "player:김철수");
  console.log(
    "김철수 +500점 후:",
    await client.zScore("leaderboard", "player:김철수")
  ); // 2000

  // --- ZRANGEBYSCORE: 점수 범위로 조회 ---
  console.log("\n--- 점수 범위 조회 ---");
  // 2000점 이상인 플레이어
  const highScorers = await client.zRangeByScore("leaderboard", 2000, "+inf");
  console.log("2000점 이상:", highScorers);

  // 1500~2500점 사이
  const midRange = await client.zRangeByScoreWithScores(
    "leaderboard",
    1500,
    2500
  );
  console.log("1500~2500점:");
  midRange.forEach((item) => console.log(`  ${item.value}: ${item.score}점`));

  // --- ZCARD / ZCOUNT ---
  console.log("\n--- ZCARD / ZCOUNT ---");
  console.log("전체 멤버 수:", await client.zCard("leaderboard"));
  console.log(
    "2000점 이상 수:",
    await client.zCount("leaderboard", 2000, "+inf")
  );

  // --- ZREM: 멤버 제거 ---
  console.log("\n--- ZREM ---");
  await client.zRem("leaderboard", "player:홍길동");
  console.log("홍길동 제거 후:", await client.zRange("leaderboard", 0, -1));

  // --- 실용 예제: 인기 검색어 ---
  console.log("\n--- 실용 예제: 인기 검색어 ---");
  const searchKey = "trending:searches";

  // 검색할 때마다 score + 1
  const searches: string[] = [
    "Redis",
    "Node.js",
    "Redis",
    "Docker",
    "Redis",
    "Node.js",
    "Kubernetes",
    "Redis",
    "Docker",
    "Redis",
  ];

  for (const term of searches) {
    await client.zIncrBy(searchKey, 1, term);
  }

  // 인기 검색어 TOP 3 (내림차순)
  const topSearches = await client.zRangeWithScores(searchKey, 0, 2, {
    REV: true,
  });
  console.log("인기 검색어 TOP 3:");
  topSearches.forEach((item, i) => {
    console.log(`  ${i + 1}. ${item.value} (${item.score}회)`);
  });

  // 정리
  await client.flushDb();
  await client.disconnect();
  console.log("\n완료!");
}

main().catch(console.error);
