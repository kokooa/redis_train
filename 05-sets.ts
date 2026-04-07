/**
 * 05. Sets (집합)
 *
 * 중복 없는 문자열의 집합입니다. 순서가 보장되지 않습니다.
 * 교집합, 합집합, 차집합 등 집합 연산을 지원합니다.
 * 태그, 좋아요 목록, 고유 방문자 추적 등에 활용됩니다.
 *
 * 주요 명령어: SADD, SMEMBERS, SISMEMBER, SCARD, SUNION, SINTER, SDIFF
 */
import { createClient } from "redis";

async function main(): Promise<void> {
  const client = createClient();
  await client.connect();
  console.log("=== Sets (집합) ===\n");

  // --- 기본 SADD / SMEMBERS ---
  console.log("--- 기본 SADD / SMEMBERS ---");
  await client.sAdd("tags:post:1", ["javascript", "redis", "nodejs"]);
  await client.sAdd("tags:post:1", "backend");
  await client.sAdd("tags:post:1", "redis"); // 중복 -> 무시됨

  const tags = await client.sMembers("tags:post:1");
  console.log("태그 목록:", tags);
  console.log("태그 개수:", await client.sCard("tags:post:1")); // 4 (중복 제외)

  // --- SISMEMBER: 멤버 확인 ---
  console.log("\n--- SISMEMBER ---");
  console.log("redis 포함?", await client.sIsMember("tags:post:1", "redis")); // true
  console.log("python 포함?", await client.sIsMember("tags:post:1", "python")); // false

  // --- SREM: 멤버 제거 ---
  console.log("\n--- SREM ---");
  await client.sRem("tags:post:1", "backend");
  console.log("제거 후:", await client.sMembers("tags:post:1"));

  // --- 집합 연산 ---
  console.log("\n--- 집합 연산 ---");
  // 두 사용자의 관심사
  await client.sAdd("interests:user:1", [
    "음악",
    "영화",
    "게임",
    "독서",
    "요리",
  ]);
  await client.sAdd("interests:user:2", [
    "음악",
    "운동",
    "게임",
    "여행",
    "요리",
  ]);

  console.log("user1:", await client.sMembers("interests:user:1"));
  console.log("user2:", await client.sMembers("interests:user:2"));

  // 교집합 (SINTER): 공통 관심사
  const common = await client.sInter([
    "interests:user:1",
    "interests:user:2",
  ]);
  console.log("공통 관심사 (교집합):", common);

  // 합집합 (SUNION): 모든 관심사
  const all = await client.sUnion(["interests:user:1", "interests:user:2"]);
  console.log("전체 관심사 (합집합):", all);

  // 차집합 (SDIFF): user1만의 관심사
  const onlyUser1 = await client.sDiff([
    "interests:user:1",
    "interests:user:2",
  ]);
  console.log("user1만의 관심사 (차집합):", onlyUser1);

  // --- SRANDMEMBER / SPOP ---
  console.log("\n--- SRANDMEMBER / SPOP ---");
  await client.sAdd("lottery", [
    "참가자A",
    "참가자B",
    "참가자C",
    "참가자D",
    "참가자E",
  ]);

  // SRANDMEMBER: 무작위로 가져오기 (제거하지 않음)
  const random = await client.sRandMember("lottery");
  console.log("무작위 선택 (유지):", random);

  // SPOP: 무작위로 꺼내기 (제거됨)
  const winner = await client.sPop("lottery");
  console.log("당첨자 (제거됨):", winner);
  console.log("남은 참가자:", await client.sMembers("lottery"));

  // --- 실용 예제: 고유 방문자 추적 ---
  console.log("\n--- 실용 예제: 고유 방문자 ---");
  const today = "2024-01-15";
  const visitKey = `visitors:${today}`;

  await client.sAdd(visitKey, "user:1");
  await client.sAdd(visitKey, "user:2");
  await client.sAdd(visitKey, "user:1"); // 중복 방문 -> 무시
  await client.sAdd(visitKey, "user:3");
  await client.sAdd(visitKey, "user:2"); // 중복 방문 -> 무시

  console.log("오늘 고유 방문자 수:", await client.sCard(visitKey));
  console.log("방문자 목록:", await client.sMembers(visitKey));

  // 정리
  await client.flushDb();
  await client.disconnect();
  console.log("\n완료!");
}

main().catch(console.error);
