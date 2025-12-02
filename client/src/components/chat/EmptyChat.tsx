import { MessageCircle } from "lucide-react";

interface EmptyChatProps {
  title?: string;
  description?: string;
}

export default function EmptyChat({ 
  title = "채팅을 시작하세요",
  description = "가족들과 대화를 나눠보세요"
}: EmptyChatProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <MessageCircle className="w-8 h-8 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-xs">
        {description}
      </p>
    </div>
  );
}
