// app/layout.tsx
// App Router 최상단 레이아웃
// - 여기에 AuthProvider를 감싸두면 앱 어디서든 user 상태를 공통으로 쓸 수 있음

import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}