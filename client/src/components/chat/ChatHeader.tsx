import { Button } from "@/components/ui/button";
import { Menu, Users, RotateCcw } from "lucide-react";

interface ChatHeaderProps {
  title: string;
  memberCount?: number;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export default function ChatHeader({
  title,
  memberCount,
  onMenuClick,
  showMenuButton = true,
  onRefresh,
  isRefreshing = false
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

      <div className="flex items-center gap-1">
        {onRefresh && (
          <Button
            size="icon"
            variant="ghost"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="메시지 새로고침"
          >
            <RotateCcw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        )}
        {showMenuButton && <div className="w-9 lg:hidden" />}
      </div>
    </header>
  );
}
