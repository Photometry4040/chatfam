import { Button } from "@/components/ui/button";
import { Menu, Users } from "lucide-react";

interface ChatHeaderProps {
  title: string;
  memberCount?: number;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export default function ChatHeader({ 
  title, 
  memberCount,
  onMenuClick,
  showMenuButton = true
}: ChatHeaderProps) {
  return (
    <header className="h-14 flex items-center justify-between gap-2 px-4 border-b border-border bg-background sticky top-0 z-50">
      {showMenuButton && (
        <Button
          size="icon"
          variant="ghost"
          onClick={onMenuClick}
          className="lg:hidden"
          data-testid="button-menu"
          aria-label="메뉴 열기"
        >
          <Menu className="w-5 h-5" />
        </Button>
      )}
      
      <div className="flex-1 flex items-center justify-center gap-2">
        <h1 className="text-lg font-semibold truncate">{title}</h1>
        {memberCount !== undefined && (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            {memberCount}
          </span>
        )}
      </div>
      
      {showMenuButton && <div className="w-9 lg:hidden" />}
    </header>
  );
}
