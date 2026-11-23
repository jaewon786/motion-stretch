// 개발용 자세 확인 화면 경로 (/dev/poses) — 개발 서버에서만 열리고, 배포 환경에서는 404
import { notFound } from "next/navigation";
import PoseLab from "@/components/dev/PoseLab";

export default function DevPosesPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <PoseLab />;
}
