// lib/auth-context.tsx
"use client";
// 로그인 상태를 전역으로 쓰기 위한 Context
// - onAuthStateChanged로 로그인 유지(새로고침해도 로그인 유지)
// - user/로딩/로그아웃 기능 제공

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";

type AuthState = {
  user: User | null;     // 현재 로그인한 사용자(없으면 null)
  loading: boolean;      // Firebase가 로그인 상태를 판별 중이면 true
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Firebase Auth 구독 시작
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u ?? null);
      setLoading(false);
    });

    // 컴포넌트 언마운트 시 구독 해제
    return () => unsub();
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      logout: async () => {
        await signOut(auth);
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  // Provider 바깥에서 쓰면 오류로 바로 알려주기(실수 방지)
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}