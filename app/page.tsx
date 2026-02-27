// app/page.tsx
"use client";
// 요구사항: "메인이 로그인/회원가입 화면"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // 로그인/회원가입 모드 토글
  const [mode, setMode] = useState<"login" | "signup">("login");

  // 폼 상태
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // UX 상태
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // 이미 로그인한 상태라면 메모장으로 이동
  useEffect(() => {
    if (!loading && user) router.replace("/notes");
  }, [loading, user, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    // 아주 기본적인 유효성 체크(학습용)
    if (!email.trim() || !password.trim()) {
      setMsg("이메일/비밀번호를 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "signup") {
        // 회원가입
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        // 로그인
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }

      router.replace("/notes");
    } catch (err: any) {
      // Firebase 에러는 학습용으로 그대로 노출(나중에 사용자 친화적으로 가공 가능)
      setMsg(err?.message ?? "로그인/회원가입 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    // auth 상태 판별 중일 때 깜빡임 방지
    return <div className="min-h-screen grid place-items-center text-zinc-600">로딩 중...</div>;
  }

  return (
    <main className="min-h-screen bg-zinc-50 grid place-items-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-extrabold text-zinc-900">메모장</h1>
        <p className="mt-1 text-sm text-zinc-600">
          {mode === "login" ? "로그인" : "회원가입"}을 해주세요.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-zinc-800">이메일</span>
            <input
              className="mt-1 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="you@example.com"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-zinc-800">비밀번호</span>
            <input
              className="mt-1 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="6자 이상 권장"
            />
          </label>

          {msg && (
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
              {msg}
            </div>
          )}

          <button
            disabled={submitting}
            className="w-full rounded-md bg-[#003F8D] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? "처리 중..." : mode === "login" ? "로그인" : "회원가입"}
          </button>

          <button
            type="button"
            onClick={() => setMode((m) => (m === "login" ? "signup" : "login"))}
            className="w-full rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900"
          >
            {mode === "login" ? "회원가입으로 전환" : "로그인으로 전환"}
          </button>
        </form>
      </div>
    </main>
  );
}