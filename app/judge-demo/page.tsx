import type { Metadata } from "next";
import JudgeDemo from "@/components/judge-demo";
export const metadata: Metadata = {
  title: "ClubOS | Public judge demo",
  description:
    "Evaluate student registration and organizer workflows with isolated sample data. No email verification or 2FA.",
  robots: { index: false, follow: false },
};
export default function JudgeDemoPage() {
  return <JudgeDemo />;
}
