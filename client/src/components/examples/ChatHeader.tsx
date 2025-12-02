import ChatHeader from "../chat/ChatHeader";

export default function ChatHeaderExample() {
  return (
    <div className="bg-background">
      <ChatHeader
        title="우리 가족"
        memberCount={5}
        onMenuClick={() => console.log("Menu clicked")}
      />
    </div>
  );
}
