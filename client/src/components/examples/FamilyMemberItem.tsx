import FamilyMemberItem from "../chat/FamilyMemberItem";

export default function FamilyMemberItemExample() {
  const member = {
    id: "1",
    name: "엄마",
    isOnline: true,
    lastMessage: "저녁 뭐 먹을까?",
  };

  return (
    <div className="w-72 bg-sidebar p-2">
      <FamilyMemberItem
        member={member}
        isSelected={false}
        onClick={() => console.log("Clicked member:", member.name)}
      />
    </div>
  );
}
