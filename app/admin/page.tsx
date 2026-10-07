import type { Metadata } from "next";
import ClubApp from "../club-app";

export const metadata: Metadata = {
  title: "ClubOS Admin | Organizer console",
  description: "Manage ClubOS festivals, events, registrations and attendance.",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <ClubApp adminMode />;
}
