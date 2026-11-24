// 공통 상단 막대 — 로고(누르면 첫 화면)와 개인정보 안내 배지
// Design Ref: DESIGN 1-1 "모션 스트레치 (로고)"

import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 md:px-8">
      <Link href="/" className="flex items-center gap-2.5" aria-label="모션 스트레치 첫 화면으로">
        <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-lime text-ink shadow-[0_0_24px_rgba(198,255,61,0.45)]">
          {/* 사람이 팔을 뻗은 모양의 단순한 로고 */}
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden>
            <circle cx="12" cy="4.5" r="2" fill="currentColor" stroke="none" />
            <path d="M5 9.5l7 1.5 7-3.5M12 11v5l-3.5 5M12 16l4 4.5" />
          </svg>
        </span>
        <span className="flex flex-col leading-none">
          <span className="text-lg font-black tracking-tight text-ice">모션 스트레치</span>
          <span className="hud-label mt-1 text-[9px]">pose lab · v1</span>
        </span>
      </Link>
      <span className="hidden items-center gap-1.5 rounded-full border border-line bg-ink/40 px-3 py-1.5 text-xs text-muted backdrop-blur sm:flex">
        <span aria-hidden>🔒</span> 카메라 영상은 이 기기 밖으로 나가지 않습니다
      </span>
    </header>
  );
}
