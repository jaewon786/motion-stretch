// 공통 상단 막대 — iOS 26 Liquid Glass 막대 (로고 + 개인정보 안내)

import Link from "next/link";
import Icon from "./Icon";

export default function SiteHeader() {
  return (
    <header className="sticky top-3 z-40 mx-auto mt-3 w-full max-w-6xl px-3 md:px-6">
      <div className="liquid flex items-center justify-between rounded-full py-2 pl-2 pr-4">
        <Link href="/" className="flex items-center gap-2.5 rounded-full pr-2" aria-label="모션 스트레치 첫 화면으로">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-lime text-white">
            {/* 팔을 뻗은 사람 모양의 단순한 로고 */}
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
              <circle cx="12" cy="4.5" r="2" fill="currentColor" stroke="none" />
              <path d="M5 9.5l7 1.5 7-3.5M12 11v5l-3.5 5M12 16l4 4.5" />
            </svg>
          </span>
          <span className="t-headline text-text">모션 스트레치</span>
        </Link>
        <span className="t-footnote hidden items-center gap-1.5 text-muted sm:flex">
          <Icon name="lock" /> 카메라 영상은 이 기기 밖으로 나가지 않습니다
        </span>
      </div>
    </header>
  );
}
