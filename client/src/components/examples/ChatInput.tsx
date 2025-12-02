import ChatInput from "../chat/ChatInput";

export default function ChatInputExample() {
  const handleSend = (content: string) => {
    console.log("Sending message:", content);
  };

  return (
    <div className="bg-background">
      <ChatInput onSendMessage={handleSend} />
    </div>
  );
}
