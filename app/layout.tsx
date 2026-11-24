import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// 한글 글꼴 — Pretendard 가변 글꼴 파일 1개를 앱 안에 넣어 쓴다 (npm 패키지 pretendard, OFL 라이선스)
// DESIGN 5는 Noto Sans KR(next/font/google)이었지만, 빌드 때 Google Fonts에서 한글 조각 파일 수백 개를 받다가
// 시간 초과로 빌드가 실패해서 외부 다운로드가 없는 이 방식으로 바꿨다. (Check 단계 CHECK.md에 Gap으로 기록)
const pretendard = localFont({
  src: "../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  variable: "--font-noto-kr",
  weight: "45 920",
  display: "swap",
  preload: false, // 파일이 2MB라 미리 불러오지 않고, 그동안은 기본 글꼴로 보여 준다
});

// HUD 숫자·라벨용 고정폭 글꼴 — Geist Mono 가변 글꼴 파일 (npm 패키지 geist, OFL 라이선스, 외부 다운로드 없음)
const hudMono = localFont({
  src: "../node_modules/geist/dist/fonts/geist-mono/GeistMono-Variable.woff2",
  variable: "--font-hud-mono",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  // 브라우저 탭 제목과 검색·공유 미리보기에 쓰이는 앱 소개
  title: "모션 스트레치",
  description:
    "종목별 스트레칭을 3D 캐릭터로 보여 주고, 카메라로 내 자세를 비교해 정확한 자세로 따라 하게 돕는 부상 예방 웹앱",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${pretendard.variable} ${hudMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {/* 좁은 화면(스마트폰) 안내 — PRD 4번 예외 흐름, DESIGN 1-1 (폭 768px 미만에서만 보임) */}
        <div
          role="note"
          className="sticky top-0 z-50 border-b border-line bg-lime px-4 py-2 text-center text-sm font-medium text-ink md:hidden"
        >
          📱 PC·노트북 웹캠에서 이용해 주세요. 이 화면에서는 카메라 없이 보기 모드만 쓸 수 있어요.
        </div>
        {children}
      </body>
    </html>
  );
}
