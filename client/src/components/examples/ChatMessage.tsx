import ChatMessage from "../chat/ChatMessage";

export default function ChatMessageExample() {
  const ownMessage = {
    id: "1",
    content: "안녕하세요! 오늘 저녁에 다 같이 모일 수 있나요?",
    senderId: "me",
    senderName: "나",
    timestamp: new Date(),
    isOwn: true,
  };

  const receivedMessage = {
    id: "2",
    content: "네, 좋아요! 몇 시에 만날까요?",
    senderId: "mom",
    senderName: "엄마",
    timestamp: new Date(Date.now() - 60000),
    isOwn: false,
  };

  return (
    <div className="space-y-4 p-4 bg-background">
      <ChatMessage message={receivedMessage} showSender />
      <ChatMessage message={ownMessage} />
    </div>
  );
}
