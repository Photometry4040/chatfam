# 우리 가족 채팅 (Family Chat Application)

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)

가족 구성원들이 쉽게 소통할 수 있는 **Apple 스타일의 실시간 채팅 애플리케이션**입니다. 할머니부터 손자손녀까지 모두가 직관적으로 사용할 수 있도록 설계되었습니다.

## ✨ 주요 기능

### 실시간 메시징
- **WebSocket 기반 실시간 통신**: 낮은 지연시간으로 즉각적인 메시지 송수신
- **자동 재연결**: 네트워크가 불안정할 때 자동으로 재연결 (지수 백오프 알고리즘)
- **하트비트 시스템**: 30초마다 서버와 통신하여 연결 상태 유지

### 채팅 기능
- **다중 채팅방**: 가족 단체방 + 개인 1:1 메시지
- **메시지 검색**: 대화 내용에서 빠르게 원하는 메시지 찾기
- **타이핑 표시**: "가족 구성원이 입력 중..." 상태 표시
- **읽음 표시**: ✓ / ✓✓ 로 메시지 읽음 상태 확인

### 사용자 인터페이스
- **Apple 디자인**: 미니멀하고 깔끔한 UI (파란색 accents)
- **다크/라이트 모드**: 사용자 선택에 따른 테마 전환
- **온라인 상태 표시**: 가족 구성원의 접속 여부 한눈에 확인
- **반응형 디자인**: 데스크톱, 태블릿, 모바일 모두 최적화

### 고급 기능 (구현 완료)
- **메시지 수정/삭제**: 보낸 메시지 수정 및 삭제 가능
- **이모지 반응**: 메시지에 반응 추가
- **메시지 고정**: 중요한 메시지 상단 고정
- **그룹 생성**: 특정 구성원들로 새로운 그룹 채팅방 생성

## 🚀 빠른 시작

### 요구사항
- Node.js 20 이상
- npm 또는 yarn

### 설치

```bash
# 저장소 클론
git clone https://github.com/Photometry4040/groupchat.git
cd groupchat

# 의존성 설치
npm install
```

### 실행

**개발 모드**
```bash
npm run dev
```

그 다음 브라우저에서 `http://localhost:5000`으로 접속하면 됩니다.

**프로덕션 빌드**
```bash
npm run build
npm start
```

## 🏗️ 프로젝트 구조

```
groupchat/
├── client/                      # React 프론트엔드
│   └── src/
│       ├── pages/
│       │   └── chat.tsx        # 메인 채팅 페이지
│       ├── components/
│       │   ├── chat/
│       │   │   ├── ChatInput.tsx        # 메시지 입력창
│       │   │   ├── ChatHeader.tsx       # 채팅방 헤더
│       │   │   ├── MessageList.tsx      # 메시지 목록
│       │   │   ├── ChatMessage.tsx      # 메시지 버블
│       │   │   ├── FamilySidebar.tsx    # 가족 목록 사이드바
│       │   │   ├── SearchMessages.tsx   # 메시지 검색
│       │   │   └── DateSeparator.tsx    # 날짜 구분선
│       │   └── ui/              # shadcn/ui 컴포넌트
│       ├── hooks/
│       │   └── useWebSocket.ts  # WebSocket 연결 훅
│       ├── lib/
│       │   └── queryClient.ts   # React Query 설정
│       └── index.css            # 글로벌 스타일
├── server/
│   ├── index.ts                 # Express 서버 진입점
│   ├── routes.ts                # WebSocket & REST API 라우트
│   ├── storage.ts               # 데이터 저장소 (인메모리)
│   └── auth.ts                  # 인증 관련 로직
├── shared/
│   └── schema.ts                # 공유 데이터 모델 & Zod 스키마
├── vite.config.ts               # Vite 설정
└── tailwind.config.ts           # Tailwind CSS 설정
```

## 🔧 기술 스택

### 프론트엔드
- **React 18.3** - UI 라이브러리
- **TypeScript** - 타입 안정성
- **Vite** - 빌드 도구
- **TailwindCSS** - 스타일링
- **shadcn/ui** - UI 컴포넌트 라이브러리
- **TanStack Query v5** - 서버 상태 관리
- **Wouter** - 라우팅
- **Lucide React** - 아이콘

### 백엔드
- **Express.js** - 웹 프레임워크
- **TypeScript** - 타입 안정성
- **WebSocket (ws)** - 실시간 양방향 통신
- **Zod** - 데이터 검증
- **In-Memory Storage** - 임시 데이터 저장

## 🔌 WebSocket 프로토콜

### 클라이언트 → 서버

```typescript
// 채팅방 진입
{ type: "join_room", payload: { roomId, userId, userName } }

// 메시지 전송
{ type: "send_message", payload: { content } }

// 입력 중 표시
{ type: "typing", payload: {} }

// 연결 유지 신호
{ type: "ping", payload: {} }
```

### 서버 → 클라이언트

```typescript
// 채팅방 기존 메시지 로드
{ type: "room_history", payload: { roomId, messages } }

// 새 메시지 수신
{ type: "new_message", payload: { id, content, senderId, senderName, timestamp, roomId } }

// 다른 사용자가 입력 중
{ type: "user_typing", payload: { userId, userName } }

// 연결 유지 응답
{ type: "pong", payload: {} }
```

## 🔐 기본 가족 구성원

애플리케이션은 다음과 같은 기본 가족 구성원들로 초기화됩니다:

| ID | 이름 | 상태 |
|---|---|---|
| `group` | 가족 단체방 | 온라인 |
| `mom` | 엄마 | 온라인 |
| `dad` | 아빠 | 온라인 |
| `brother1` | 첫째 | 온라인 |
| `brother2` | 둘째 | 오프라인 |
| `sister` | 막내 | 온라인 |

## 🌐 API 엔드포인트

### REST API

```
GET /api/members              # 모든 가족 구성원 조회
GET /api/members/:id          # 특정 구성원 정보 조회
GET /api/messages/:roomId     # 특정 채팅방의 메시지 조회
```

### WebSocket Endpoint

```
ws://localhost:5000/ws        # WebSocket 연결 경로
```

## 🚀 WebSocket 안정성 개선 사항

이 애플리케이션은 **강화된 재연결 로직**을 구현하여 불안정한 네트워크 환경에서도 안정적으로 작동합니다:

### 1. 지수 백오프 (Exponential Backoff)
- 1초 → 2초 → 4초 → 8초 → ... → 최대 30초
- 점진적으로 재연결 대기 시간을 늘려서 서버 부하 감소

### 2. 하트비트 시스템 (Heartbeat/Ping-Pong)
- 30초마다 ping 신호 전송
- 서버가 pong으로 응답하여 연결 상태 확인
- 유휴 연결 자동 종료 방지

### 3. 자동 재연결
- 네트워크 끊김 감지 시 자동 재연결 시도
- 최대 10회까지 재시도 (약 17분 동안 시도)
- 스마트 상태 관리로 중복 재연결 방지

### 4. 상세한 로깅
```
Connecting to WebSocket (attempt 1)...
WebSocket connected successfully
Reconnecting in 2000ms (attempt 2/10)...
```

## 📱 데이터 모델

### FamilyMember
```typescript
{
  id: string;           // 고유 ID
  name: string;         // 이름
  avatar?: string;      // 프로필 이미지 URL
  isOnline: boolean;    // 온라인 여부
  lastMessage?: string; // 마지막 메시지
}
```

### Message
```typescript
{
  id: string;           // 고유 메시지 ID
  content: string;      // 메시지 내용
  senderId: string;     // 발신자 ID
  senderName: string;   // 발신자 이름
  senderAvatar?: string;// 발신자 프로필 이미지
  roomId: string;       // 채팅방 ID
  timestamp: Date;      // 전송 시간
  isEdited?: boolean;   // 수정 여부
  editedAt?: Date;      // 수정 시간
  isDeleted?: boolean;  // 삭제 여부
  reactions?: Record<string, string[]>; // 반응 (이모지)
  isPinned?: boolean;   // 고정 여부
}
```

## 🎨 디자인 특징

- **Apple 미니멀리즘**: 깔끔하고 직관적인 인터페이스
- **색상 팔레트**:
  - Primary: `hsl(211 100% 50%)` (파란색)
  - 중립 톤: 회색 스케일
- **타이포그래피**: 시스템 폰트 스택 (SF Pro Display, -apple-system)
- **간격**: 일관된 8px 기본 간격 시스템
- **애니메이션**: Framer Motion을 사용한 부드러운 전환

## ⚠️ 보안 주의사항

이 프로젝트는 **가족 전용 프로토타입**으로 설계되었습니다.

### 이 코드를 자신의 환경에 배포할 경우 반드시 다음을 수행하세요:

- [ ] **Supabase RLS 정책 설정**
  - 테이블별 Row Level Security 정책 활성화
  - 사용자별 접근 제어 구현

- [ ] **환경 변수 설정**
  - `SESSION_SECRET` 환경 변수 필수 설정 (최소 32자)
  - 절대 소스코드에 하드코딩하지 마세요

- [ ] **비밀번호 보안**
  - 비밀번호는 bcrypt 등으로 해싱하여 저장
  - 평문 비밀번호 저장 금지

- [ ] **API 인증**
  - JWT 토큰 기반 인증 구현
  - 모든 API 엔드포인트에 인증 미들웨어 추가

- [ ] **Supabase Authentication**
  - 사용자 인증 시스템 설정
  - Auth 토큰을 이용한 WebSocket 연결 검증

### 개발 환경 설정

`.env.local` 파일을 생성하여 환경 변수를 설정하세요:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
SESSION_SECRET=your-secret-key-min-32-chars
NODE_ENV=development
```

**주의**: `.env.local`과 `.env*` 파일은 `.gitignore`에 의해 Git에 커밋되지 않습니다. 절대 실제 환경 변수를 소스코드에 커밋하지 마세요.

## 🔄 상태 관리

### 클라이언트
- **TanStack Query (React Query)**: 서버 상태 관리 및 캐싱
- **React Local State**: UI 상태 관리 (selectedMemberId, searchQuery 등)
- **Custom Hook (useWebSocket)**: WebSocket 연결 상태

### 서버
- **In-Memory Maps**: 메시지 및 사용자 데이터 저장
- **Connected Clients Map**: 활성 WebSocket 연결 추적

## 📚 주요 Hook 및 유틸

### useWebSocket
```typescript
const { isConnected, sendMessage, sendTyping } = useWebSocket({
  userId: "me",
  userName: "나",
  roomId: "group",
  onMessage: handleNewMessage,
  onRoomHistory: handleRoomHistory,
  onTyping: handleTyping,
});
```

- **자동 재연결**: 연결 끊김 시 자동으로 재연결
- **메시지 전송**: `sendMessage(content)`
- **타이핑 표시**: `sendTyping()`

## 🧪 테스트

현재는 수동 테스트를 통해 기능을 검증합니다:

1. 메시지 송수신
2. 다중 채팅방 전환
3. 메시지 검색
4. 타이핑 표시
5. 온라인 상태 변경
6. 네트워크 재연결

## 📦 빌드 및 배포

### 개발 빌드
```bash
npm run dev
```

### 프로덕션 빌드
```bash
npm run build
npm start
```

### 타입 체크
```bash
npm run check
```

## 🎯 향후 계획

- [ ] 데이터베이스 통합 (PostgreSQL)
- [ ] 사용자 인증 시스템
- [ ] 파일/이미지 공유
- [ ] 음성/영상 통화
- [ ] 메시지 암호화
- [ ] 푸시 알림
- [ ] 모바일 앱 (React Native)

## 📄 라이센스

MIT License - 자유롭게 사용, 수정, 배포 가능합니다.

## 👨‍💻 기여

이 프로젝트에 기여하고 싶다면:

1. Fork 하기
2. Feature 브랜치 생성 (`git checkout -b feature/amazing-feature`)
3. 변경사항 커밋 (`git commit -m 'Add amazing feature'`)
4. 브랜치에 Push (`git push origin feature/amazing-feature`)
5. Pull Request 생성

## 📧 문의

질문이나 피드백이 있다면 GitHub Issues를 통해 연락해주세요.

---

**Made with ❤️ for family communication**
