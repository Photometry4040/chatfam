# Family Chat Application (우리 가족 채팅)

## Overview

This is a family-oriented real-time chat application built with React, Express, and WebSockets. The application provides a warm, intuitive messaging interface inspired by popular messaging apps like KakaoTalk, WhatsApp, and Telegram. It's designed to be accessible for all age groups, from grandparents to grandchildren, with zero learning curve.

The application features real-time messaging, multiple chat rooms (family group and individual members), online status tracking, and a responsive design that works across desktop and mobile devices.

## Recent Changes (2025-11-30)

- Implemented complete real-time chat functionality with WebSocket
- Created family member sidebar with online/offline status
- Built message list with date separators and sender grouping
- Added dark/light mode theme toggle
- Fixed room switching to properly clear and load messages per room

## User Preferences

Preferred communication style: Simple, everyday language (Korean/한국어).

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript, using Vite as the build tool and bundler.

**UI Component Library**: Shadcn/ui with Radix UI primitives, providing accessible and customizable components. The design system uses TailwindCSS for styling with a custom theme configuration that supports light and dark modes.

**State Management**: 
- TanStack Query (React Query) for server state management and caching
- Local React state (useState, useContext) for UI state
- WebSocket connection managed through custom `useWebSocket` hook

**Routing**: Wouter for lightweight client-side routing

**Key Components**:
- `ChatMessage.tsx` - Message bubble with sender info and timestamp
- `ChatInput.tsx` - Message input with send button
- `ChatHeader.tsx` - Room title and member count
- `MessageList.tsx` - Scrollable message list with date separators
- `FamilySidebar.tsx` - Family member list with online status
- `FamilyMemberItem.tsx` - Individual member row
- `DateSeparator.tsx` - Date dividers in message list
- `EmptyChat.tsx` - Empty state when no messages
- `ThemeToggle.tsx` - Dark/light mode toggle

**Custom Hooks**:
- `useWebSocket.ts` - WebSocket connection with auto-reconnect, room joining, message sending

### Backend Architecture

**Framework**: Express.js with TypeScript running on Node.js

**Real-time Communication**: WebSocket Server (ws library) at path `/ws`
- Message types: `send_message`, `join_room`, `typing`
- Response types: `room_history`, `new_message`, `user_typing`
- Maintains connected client map with user info and current room

**REST API Endpoints**:
- `GET /api/members` - List all family members
- `GET /api/members/:id` - Get single family member
- `GET /api/messages/:roomId` - Get messages for a room

### Data Storage

**Current Implementation**: In-memory storage using Map data structures

**Models**:
- `FamilyMember`: id, name, avatar, isOnline, lastMessage
- `Message`: id, content, senderId, senderName, senderAvatar, roomId, timestamp

**Storage Interface** (`IStorage`):
- User management: getUser, getUserByUsername, createUser
- Family members: getFamilyMembers, getFamilyMember, createFamilyMember, updateOnlineStatus, updateLastMessage
- Messages: getMessages, createMessage

**Default Family Members**: group (가족 단체방), mom (엄마), dad (아빠), sister (영신), brother (영준)

### Key Files

- `shared/schema.ts` - Data models and Zod validation schemas
- `server/routes.ts` - WebSocket and REST API handlers
- `server/storage.ts` - In-memory storage implementation
- `client/src/pages/chat.tsx` - Main chat page
- `client/src/hooks/useWebSocket.ts` - WebSocket connection hook