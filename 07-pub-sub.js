/**
 * 07. Pub/Sub (발행/구독)
 *
 * 메시지를 발행(publish)하면 구독(subscribe)한 모든 클라이언트가 받습니다.
 * 실시간 알림, 채팅, 이벤트 브로드캐스트 등에 활용됩니다.
 * 메시지는 저장되지 않습니다 (구독 전 메시지는 받을 수 없음).
 *
 * 주요 명령어: SUBSCRIBE, PUBLISH, UNSUBSCRIBE, PSUBSCRIBE
 */
const { createClient } = require("redis");

async function main() {
  // Pub/Sub에는 별도의 연결이 필요합니다
  const subscriber = createClient();
  const publisher = createClient();

  await subscriber.connect();
  await publisher.connect();
  console.log("=== Pub/Sub (발행/구독) ===\n");

  // --- 기본 구독/발행 ---
  console.log("--- 기본 구독/발행 ---");

  // 채널 구독
  let messageCount = 0;
  await subscriber.subscribe("chat:room:1", (message, channel) => {
    messageCount++;
    console.log(`[${channel}] 수신: ${message}`);
  });
  console.log("'chat:room:1' 채널 구독 완료");

  // 메시지 발행
  await publisher.publish("chat:room:1", "안녕하세요!");
  await publisher.publish("chat:room:1", "Redis Pub/Sub 테스트입니다.");
  await publisher.publish("chat:room:1", "실시간 메시지 전달!");

  // 구독하지 않은 채널에 발행 (수신 안됨)
  await publisher.publish("chat:room:2", "이 메시지는 수신되지 않습니다");

  // 메시지 수신 대기
  await new Promise((resolve) => setTimeout(resolve, 100));
  console.log(`총 수신 메시지: ${messageCount}개\n`);

  // --- 패턴 구독 (PSUBSCRIBE) ---
  console.log("--- 패턴 구독 ---");

  const subscriber2 = createClient();
  await subscriber2.connect();

  let patternCount = 0;
  // chat:* 패턴으로 모든 채팅방 구독
  await subscriber2.pSubscribe("chat:*", (message, channel) => {
    patternCount++;
    console.log(`[패턴매치 ${channel}] ${message}`);
  });
  console.log("'chat:*' 패턴 구독 완료");

  await publisher.publish("chat:room:1", "room1 메시지");
  await publisher.publish("chat:room:2", "room2 메시지");
  await publisher.publish("chat:room:3", "room3 메시지");
  await publisher.publish("news:breaking", "이건 수신 안됨"); // 패턴 불일치

  await new Promise((resolve) => setTimeout(resolve, 100));
  console.log(`패턴 매치 수신: ${patternCount}개\n`);

  // --- 다중 채널 구독 ---
  console.log("--- 다중 채널 구독 ---");

  const subscriber3 = createClient();
  await subscriber3.connect();

  const received = [];
  for (const channel of ["news:tech", "news:sports", "news:weather"]) {
    await subscriber3.subscribe(channel, (message, ch) => {
      received.push({ channel: ch, message });
    });
  }
  console.log("3개 뉴스 채널 구독 완료");

  await publisher.publish("news:tech", "새로운 AI 모델 출시");
  await publisher.publish("news:sports", "월드컵 결승전 결과");
  await publisher.publish("news:weather", "내일 전국 비 예보");

  await new Promise((resolve) => setTimeout(resolve, 100));
  console.log("수신된 뉴스:");
  received.forEach((r) => console.log(`  [${r.channel}] ${r.message}`));

  // --- 구독 해제 ---
  console.log("\n--- 구독 해제 ---");
  await subscriber.unsubscribe("chat:room:1");
  console.log("chat:room:1 구독 해제");

  const beforeCount = messageCount;
  await publisher.publish("chat:room:1", "해제 후 메시지");
  await new Promise((resolve) => setTimeout(resolve, 100));
  console.log(
    `해제 후 수신 여부: ${messageCount > beforeCount ? "수신됨" : "수신 안됨"}`
  );

  // 정리
  await subscriber2.pUnsubscribe("chat:*");
  await subscriber3.unsubscribe();

  await subscriber.disconnect();
  await subscriber2.disconnect();
  await subscriber3.disconnect();
  await publisher.disconnect();
  console.log("\n완료!");
}

main().catch(console.error);
