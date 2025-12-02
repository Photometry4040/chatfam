interface DateSeparatorProps {
  date: Date;
}

function formatDate(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  if (targetDate.getTime() === today.getTime()) {
    return "오늘";
  }
  if (targetDate.getTime() === yesterday.getTime()) {
    return "어제";
  }
  
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  if (year === now.getFullYear()) {
    return `${month}월 ${day}일`;
  }
  
  return `${year}년 ${month}월 ${day}일`;
}

export default function DateSeparator({ date }: DateSeparatorProps) {
  return (
    <div className="flex items-center justify-center py-4">
      <span className="px-3 py-1 text-xs text-muted-foreground bg-muted rounded-full">
        {formatDate(date)}
      </span>
    </div>
  );
}
