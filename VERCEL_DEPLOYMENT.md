# Vercel 배포 가이드

## 배포 전 준비

### 1. GitHub에 푸시
```bash
git add .
git commit -m "Phase 5 완료: Supabase Realtime 통합"
git push origin main
```

### 2. Vercel CLI 설치
```bash
npm install -g vercel
```

## 배포 옵션

### 옵션 A: GitHub UI에서 배포 (권장)

1. **Vercel 대시보드 접속**
   - https://vercel.com/dashboard
   - 로그인 (GitHub 계정으로)

2. **새 프로젝트 추가**
   - "Add New..." → "Project"
   - GitHub 저장소 선택: `chatfam`

3. **프로젝트 설정**
   - Framework: "Other" (자동 감지)
   - Root Directory: `./` (기본값)
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **환경 변수 설정**
   - "Environment Variables" 탭
   - 다음 변수들 추가:
     ```
     VITE_SUPABASE_URL = https://gqvyzqodyspvwlwfjmfg.supabase.co
     VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdxdnl6cW9keXNwdndsd2ZqbWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNTI1NDIsImV4cCI6MjA2NzcyODU0Mn0.qAZp9j0NY_b-NhHDejNoO_NGOQ_602-74gr0cZCJwbk
     NODE_ENV = production
     ```

5. **배포**
   - "Deploy" 클릭
   - 배포 완료 대기 (약 2-3분)

### 옵션 B: Vercel CLI로 배포

```bash
# 로그인
vercel login

# 배포
vercel

# 프로덕션 배포
vercel --prod
```

## 배포 후 확인

### 1. Supabase 설정
- Supabase 대시보드에서 CORS 설정 확인
- https://app.supabase.com → 프로젝트 선택 → Settings → API

### 2. Realtime 활성화
- Supabase 대시보드 → Realtime 탭
- `chat_messages`, `chat_typing_indicators` 테이블 활성화 확인

### 3. 배포된 사이트 접속
```
https://[프로젝트명].vercel.app
```

## 환경 변수 관리

### 개발 환경 (.env.local)
```
VITE_SUPABASE_URL=https://gqvyzqodyspvwlwfjmfg.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PORT=5000
NODE_ENV=development
```

### 프로덕션 환경 (Vercel)
- Vercel 대시보드에서 설정
- GitHub 푸시 시 자동으로 재배포

## 문제 해결

### 빌드 실패
```bash
# 로컬에서 빌드 테스트
npm run build

# 타입 체크
npm run check
```

### Realtime 구독 실패
- Supabase 프로젝트 → Realtime 활성화 확인
- 네트워크 탭에서 WebSocket 연결 확인

### 메시지 전송 실패
- RLS 정책 확인 (Supabase 대시보드)
- 환경 변수 설정 확인
- 브라우저 콘솔 오류 확인

## 롤백

배포 문제 발생 시:
```bash
# 이전 버전으로 돌아가기
vercel rollback
```

## 모니터링

### Vercel Analytics
- Vercel 대시보드 → Analytics 탭
- 성능, 에러, 방문자 수 확인

### Supabase 로그
- Supabase 대시보드 → Logs 탭
- 데이터베이스 쿼리 및 에러 확인
