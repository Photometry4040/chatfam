# Family Chat Application - Design Guidelines

## Design Approach

**Selected Framework**: Reference-Based (Messaging Apps)  
**Primary References**: KakaoTalk, WhatsApp, Telegram  
**Rationale**: Family chat applications require familiar, intuitive messaging patterns where usability and instant recognition trump visual experimentation.

## Core Design Principles

1. **Warmth & Approachability**: Friendly, inviting interface suitable for all ages
2. **Instant Clarity**: Zero learning curve - grandmother to grandchild should understand immediately
3. **Message Priority**: Chat content takes center stage, chrome stays minimal
4. **Responsive Rhythm**: Smooth, natural message flow

## Typography System

**Font Family**: System UI stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`)

**Hierarchy**:
- Chat messages: text-base (16px) regular weight
- Sender names: text-sm (14px) medium weight
- Timestamps: text-xs (12px) regular weight, reduced opacity
- Input placeholder: text-base regular weight
- Header titles: text-lg (18px) semibold weight

## Layout System

**Spacing Primitives**: Use Tailwind units of **2, 3, 4, 6, 8**  
Examples: `p-4` for message padding, `space-y-3` for message gaps, `gap-2` for inline elements

**Grid Structure**:
- Single-column message stream (max-w-4xl centered)
- Message bubbles: max-width 65-70% of container
- Sender messages aligned right, received messages aligned left

## Component Library

### Chat Message Bubble
- Rounded corners (rounded-2xl or rounded-3xl)
- Comfortable padding (p-3 or px-4 py-3)
- Sender bubbles: align-self-end
- Received bubbles: align-self-start
- Timestamp below bubble, text-xs, minimal spacing (mt-1)
- Sender name above received messages only

### Message Input Area
- Fixed bottom position on mobile
- Text input with rounded corners (rounded-full)
- Send button integrated inside input (absolute positioning)
- Icon-based send action (Heroicons paper-airplane or similar)
- Padding: p-4 container, input py-3 px-4

### Family Members Sidebar/List
- Avatar + name pattern
- Small online status indicator (if needed)
- Clean dividers between members (border-b with subtle treatment)
- Compact spacing (py-3 px-4 per member)

### Navigation Header
- Family group name: centered, semibold
- Minimal actions (3-dot menu icon on right)
- Optional back button on left for mobile
- Fixed top, with subtle bottom border
- Height: h-14 or h-16

### Empty State
- Centered vertically and horizontally
- Friendly icon (chat-bubble, users icon)
- Brief encouraging text: "Start chatting with your family"
- No CTA button needed - input is always visible

## Interaction Patterns

**Message Sending**:
- Click send icon or press Enter
- Input clears immediately
- New message appears with subtle slide-in from right (for sent)
- Auto-scroll to latest message

**Message Loading**:
- Messages load from bottom up (newest at bottom)
- Scroll to load older messages from top
- Loading indicator at top when fetching history

**Responsive Behavior**:
- Mobile (base): Full-screen chat, hidden sidebar
- Tablet (md:): Optional sidebar toggle
- Desktop (lg:): Persistent sidebar (w-64 or w-72), main chat area flex-1

## Icon Library

**Use Heroicons via CDN** for all interface icons:
- Send: paper-airplane
- Menu: bars-3
- User avatars: user-circle (fallback)
- Back navigation: chevron-left

## Accessibility

- Proper focus states on input field (ring treatment)
- Keyboard navigation support (Tab through input, Enter to send)
- Sufficient contrast for timestamps and metadata
- Semantic HTML (main, aside, header elements)
- ARIA labels for icon-only buttons

## Animations

**Minimal, purposeful only**:
- New message slide-in: 150-200ms ease-out
- Send button subtle scale on click (scale-95 active state)
- No scroll animations or elaborate transitions

## Images

**No hero images required** - this is a functional chat application.

**Avatar Images**:
- Use circular avatars for family members (rounded-full)
- Fallback to initials or user-circle icon
- Size: w-10 h-10 or w-12 h-12 for member list
- Tiny avatars next to received messages: w-8 h-8

## Critical Implementation Notes

- Messages must handle long text with word-wrap
- Input should be always visible (sticky/fixed positioning)
- Message timestamps use relative time ("2분 전", "오늘 오후 3:24")
- Maintain scroll position when new messages arrive
- Date separators between message groups ("오늘", "어제", specific dates)