/**
 * 01. Redis 연결 (Connection)
 *
 * Redis는 인메모리 데이터 스토어로, 클라이언트-서버 모델로 동작합니다.
 * 기본 포트: 6379
 */
import { createClient } from "redis";

async function main(): Promise<void> {
  // Redis 클라이언트 생성
  const client = createClient({
    url: "redis://localhost:6379",
  });

  // 에러 핸들링
  client.on("error", (err: Error) => console.error("Redis Client Error:", err));

  // 연결
  console.log("Redis 서버에 연결 중...");
  await client.connect();
  console.log("연결 성공!");

  // PING - 서버 상태 확인
  const pong = await client.ping();
  console.log("PING 응답:", pong); // PONG

  // 서버 정보 확인
  const info = await client.info("server");
  const version = info.match(/redis_version:(.*)/)?.[1];
  console.log("Redis 버전:", version?.trim());

  // 현재 DB 크기 (키 개수)
  const dbSize = await client.dbSize();
  console.log("현재 DB 키 개수:", dbSize);

  // 연결 종료
  await client.disconnect();
  console.log("연결 종료");
}

main().catch(console.error);
