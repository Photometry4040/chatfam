import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Settings } from "lucide-react";

export interface FamilyMember {
  id: string;
  name: string;
  avatar?: string;
  isOnline?: boolean;
  lastMessage?: string;
}

interface FamilyMemberItemProps {
  member: FamilyMember;
  isSelected?: boolean;
  onClick?: () => void;
  onProfileSettings?: (memberId: string) => void;
}

export default function FamilyMemberItem({
  member,
  isSelected = false,
  onClick,
  onProfileSettings
}: FamilyMemberItemProps) {
  const initials = member.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 py-3 px-4 text-left transition-colors hover-elevate active-elevate-2 rounded-md",
        isSelected && "bg-sidebar-accent"
      )}
      data-testid={`member-item-${member.id}`}
    >
      <div className="relative">
        <Avatar className="w-10 h-10">
          {/* Show emoji directly if available, otherwise show initials */}
          <AvatarFallback className="bg-muted text-lg font-semibold">
            {member.avatar || initials}
          </AvatarFallback>
        </Avatar>
        {member.isOnline !== undefined && (
          <span
            className={cn(
              "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-sidebar",
              member.isOnline ? "bg-status-online" : "bg-status-offline"
            )}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sidebar-foreground truncate">
          {member.name}
        </p>
        {member.lastMessage && (
          <p className="text-sm text-muted-foreground truncate">
            {member.lastMessage}
          </p>
        )}
      </div>
      {onProfileSettings && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onProfileSettings(member.id);
          }}
          className="ml-2 p-2 rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
          aria-label={`${member.name} 프로필 설정`}
        >
          <Settings className="w-4 h-4" />
        </button>
      )}
    </button>
  );
}
