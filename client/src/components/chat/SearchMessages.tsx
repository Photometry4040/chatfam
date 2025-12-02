import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Search } from "lucide-react";

interface SearchMessagesProps {
  query: string;
  onQueryChange: (query: string) => void;
  resultCount?: number;
}

export default function SearchMessages({
  query,
  onQueryChange,
  resultCount,
}: SearchMessagesProps) {
  return (
    <div className="px-4 py-3 border-b border-border bg-card">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="메시지 검색..."
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            className="pl-9"
            data-testid="input-search-messages"
          />
        </div>
        {query && (
          <>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {resultCount || 0}개 찾음
            </span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onQueryChange("")}
              className="h-9 w-9"
              data-testid="button-clear-search"
              aria-label="검색 초기화"
            >
              <X className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
