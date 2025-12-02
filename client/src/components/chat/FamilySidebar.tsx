import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Search, Home } from "lucide-react";
import FamilyMemberItem, { type FamilyMember } from "./FamilyMemberItem";
import ThemeToggle from "../ThemeToggle";
import { cn } from "@/lib/utils";

interface FamilySidebarProps {
  members: FamilyMember[];
  selectedMemberId?: string;
  onSelectMember: (memberId: string) => void;
  familyName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function FamilySidebar({
  members,
  selectedMemberId,
  onSelectMember,
  familyName,
  isOpen,
  onClose,
}: FamilySidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMembers = members.filter((member) =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
          data-testid="sidebar-overlay"
        />
      )}

      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-72 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-200 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-14 flex items-center justify-between gap-2 px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <Home className="w-5 h-5 text-primary" />
            <h2 className="font-semibold truncate">{familyName}</h2>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              className="lg:hidden"
              data-testid="button-close-sidebar"
              aria-label="사이드바 닫기"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="가족 찾기..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-members"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2">
          <div className="py-2">
            <p className="px-2 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              가족 구성원 ({members.length})
            </p>
            {filteredMembers.length > 0 ? (
              <div className="space-y-1">
                {filteredMembers.map((member) => (
                  <FamilyMemberItem
                    key={member.id}
                    member={member}
                    isSelected={member.id === selectedMemberId}
                    onClick={() => {
                      onSelectMember(member.id);
                      onClose();
                    }}
                  />
                ))}
              </div>
            ) : (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                검색 결과가 없습니다
              </p>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
