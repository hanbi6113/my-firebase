// app/notes/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

import Image from "next/image";
import { useRouter } from "next/navigation";

import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

/**
 * 메모 데이터(화면 표시용)
 * - 저장소에는 createdAt 같은 필드도 있지만, 여기서는 UI에 필요한 것만 최소로 씀
 */
type Note = {
  id: string;
  text: string;
  imageUrl: string | null;
};

const ATTACH_ICON_SRC = "/icons/attach.png";

export default function NotesPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  // 메모 입력 상태
  const [text, setText] = useState("");

  // 파일 input 접근용 ref(파일 선택/초기화를 위해 필요)
  const fileRef = useRef<HTMLInputElement | null>(null);

  // 화면 목록 상태
  const [notes, setNotes] = useState<Note[]>([]);

  // 제출 UX 상태
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // 첨부 UI용 상태(선택된 파일명 + 미리보기 URL)
  const [fileName, setFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // 미리보기 URL(blob:)은 메모리 누수가 날 수 있어서, 바뀔 때마다 정리해줌
  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // 로그인 안 했으면 메인으로 보내기(가드)
  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  // 로그인한 유저의 메모만 실시간 구독
  useEffect(() => {
    if (!user) return;

    // 유저별 컬렉션 구조: users/{uid}/notes
    const col = collection(db, "users", user.uid, "notes");
    const q = query(col, orderBy("createdAt", "desc"));

    const unsub = onSnapshot(q, (snap) => {
      const rows: Note[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          text: String(data.text ?? ""),
          imageUrl: data.imageUrl ?? null,
        };
      });
      setNotes(rows);
    });

    return () => unsub();
  }, [user]);

 
  const onPickFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;

    // 파일 선택 취소한 경우(취소 버튼 눌렀을 때)
    if (!f) {
      setFileName("");
      setPreviewUrl(null);
      return;
    }

    setFileName(f.name);

    // accept="image/*"라 보통 이미지지만, 안전하게 체크
    if (f.type.startsWith("image/")) {
      // 기존 blob url이 있으면 먼저 해제(메모리 누수 방지)
      setPreviewUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return URL.createObjectURL(f);
      });
    } else {
      setPreviewUrl(null);
    }
  };

  /**
   * 첨부 제거(파일 선택 초기화 + 미리보기 제거)
   */
  const clearFile = () => {
    if (fileRef.current) fileRef.current.value = "";
    setFileName("");
    setPreviewUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return null;
    });
  };

  /**
   * 저장 버튼(메모 + 사진 업로드)
   * - 메모 텍스트: Firestore
   * - 사진 파일: Storage 업로드 후 다운로드 URL을 Firestore에 기록
   */
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!user) return;

    const trimmed = text.trim();
    const file = fileRef.current?.files?.[0] ?? null;

    // 둘 다 비어있으면 저장하지 않음
    if (!trimmed && !file) {
      setMsg("메모 내용 또는 사진 중 최소 하나는 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    try {
      // 1) Firestore에 문서 먼저 생성(뼈대)
      const col = collection(db, "users", user.uid, "notes");
      const noteRef = await addDoc(col, {
        text: trimmed,
        imageUrl: null, // 사진 있으면 아래에서 업로드 후 업데이트
        createdAt: serverTimestamp(),
      });

      // 2) 사진이 있으면 Storage 업로드 → URL 발급 → Firestore 업데이트
      if (file) {
        const path = `users/${user.uid}/notes/${noteRef.id}/${Date.now()}-${file.name}`;
        const storageRef = ref(storage, path);

        // 파일 업로드(파일 크기/타입 제한은 나중에 강화 가능)
        await uploadBytes(storageRef, file);

        // 다운로드 URL 발급
        const url = await getDownloadURL(storageRef);

        // Firestore에 imageUrl 업데이트
        await updateDoc(doc(db, "users", user.uid, "notes", noteRef.id), {
          imageUrl: url,
        });
      }

      // 3) 입력 초기화
      setText("");
      clearFile();
      setMsg("저장 완료!");
    } catch (err: any) {
      console.error(err);
      setMsg(err?.message ?? "저장 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  // auth 판별 중이면 로딩 표시
  if (loading) {
    return <div className="min-h-screen grid place-items-center text-zinc-600">로딩 중...</div>;
  }

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-3xl px-6 py-8">
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-zinc-900">메모장</h1>
          </div>

          <button
            onClick={async () => {
              await logout();
              router.replace("/");
            }}
            className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
          >
            로그아웃
          </button>
        </div>

        {/* 작성 폼 */}
        <form onSubmit={onSubmit} className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <label className="block">
            <span className="text-sm font-medium text-zinc-800">메모</span>
            <textarea
              className="mt-1 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm min-h-[100px]"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="메모를 입력하세요..."
            />
          </label>

          {/* 사진 첨부 UI: 아주 작은 이미지 아이콘 + 텍스트 버튼 */}
          <div className="mt-4">
            <span className="text-sm font-medium text-zinc-800">사진 첨부(선택)</span>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              {/* 실제 파일 input은 숨기고, label로 클릭 유도 */}
              <input
                ref={fileRef}
                id="note-image"
                type="file"
                accept="image/*"
                onChange={onPickFile}
                className="sr-only"
              />

              <label
                htmlFor="note-image"
                className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
                title="사진 첨부"
              >
                {/* 아주 작은 아이콘 (원하면 12/14/16으로 조정 가능) */}
                <Image
                  src={ATTACH_ICON_SRC}
                  alt=""
                  width={20}
                  height={20}
                  className="opacity-90"
                />
                <span>파일 첨부</span>
              </label>

              {/* 선택된 파일명(너무 길면 ... 처리) */}
              {fileName ? (
                <span className="max-w-[40ch] truncate text-xs text-zinc-600" title={fileName}>
                  {fileName}
                </span>
              ) : (
                <span className="text-xs text-zinc-500">선택된 파일 없음</span>
              )}

              {/* 파일 제거(선택했을 때만 보이게) */}
              {fileName && (
                <button
                  type="button"
                  onClick={clearFile}
                  className="text-xs font-semibold text-zinc-600 hover:underline"
                >
                  제거
                </button>
              )}
            </div>

            {/* 선택한 이미지 미리보기(있을 때만) */}
            {previewUrl && (
              <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200 bg-white">
                <img src={previewUrl} alt="선택한 사진 미리보기" className="w-full h-auto" />
              </div>
            )}
          </div>

          {msg && (
            <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
              {msg}
            </div>
          )}

          <button
            disabled={submitting}
            className="mt-5 w-full rounded-md bg-[#003F8D] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? "저장 중..." : "저장"}
          </button>
        </form>

        {/* 목록 */}
        <div className="mt-8 space-y-4">
          {notes.map((n) => (
            <article key={n.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              {n.imageUrl && (
                <div className="mb-3 overflow-hidden rounded-xl border border-zinc-200 bg-white">
                  {/* 이미지 표시(학습용으로 img 사용: 단순) */}
                  <img src={n.imageUrl} alt="첨부 이미지" className="w-full h-auto" />
                </div>
              )}

              {n.text && <p className="whitespace-pre-line text-sm leading-6 text-zinc-800">{n.text}</p>}
              {!n.text && !n.imageUrl && <p className="text-sm text-zinc-500">내용 없음</p>}
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}