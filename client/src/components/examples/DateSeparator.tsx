import DateSeparator from "../chat/DateSeparator";

export default function DateSeparatorExample() {
  return (
    <div className="bg-background">
      <DateSeparator date={new Date()} />
    </div>
  );
}
