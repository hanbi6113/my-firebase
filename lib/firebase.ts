// lib/firebase.ts
// Firebase 앱 초기화 파일
// - Next.js 개발 모드에서는 HMR(핫리로드)로 파일이 여러 번 평가될 수 있어
//   initializeApp을 중복 호출하면 에러가 날 수 있음
// - 그래서 getApps().length로 "이미 초기화된 앱이 있으면 재사용"하도록 처리

import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase 콘솔(Web 앱)의 설정값을 .env.local로 옮긴 뒤 여기서 읽는다.
// - NEXT_PUBLIC_ 는 브라우저 번들에서도 접근 가능(공개 키)
// - 뒤의 !는 "반드시 값이 있다"는 뜻(없으면 런타임에서 오류 나게 해서 빨리 발견하려는 목적)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,

  // Analytics(선택)
  // - measurementId는 없어도 앱 동작에는 영향이 없다.
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// 앱이 이미 있으면 재사용, 없으면 초기화
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// 서비스 핸들
export const auth = getAuth(app);      // 로그인/회원가입
export const db = getFirestore(app);   // 메모 텍스트 저장
export const storage = getStorage(app); // 사진 파일 저장