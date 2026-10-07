export type StudentProfile = {
  uid: string;
  displayName: string;
  email: string;
  institution: string;
  grade: string;
  phone: string;
  bio: string;
  interests: string;
  updatedAt?: unknown;
};
export type Blog = {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  body: string;
  cover: string;
  author: string;
  published: boolean;
  createdAt: number;
  updatedAt: number;
};
export type Announcement = {
  id: string;
  title: string;
  body: string;
  priority: "info" | "important";
  target: string;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
};
export type SupportContact = {
  id: string;
  name: string;
  role: string;
  phone: string;
  hours: string;
  active: boolean;
};
export const sampleSupport: SupportContact[] = [
  {
    id: "registration",
    name: "Registration help",
    role: "Tickets, seats and registration",
    phone: "+880 1XXXXXXXXX",
    hours: "Support hours will be announced",
    active: true,
  },
  {
    id: "technical",
    name: "Technical support",
    role: "Account and website help",
    phone: "+880 1XXXXXXXXX",
    hours: "Support hours will be announced",
    active: true,
  },
];
export function dialNumber(phone: string) {
  const cleaned = phone.replace(/[\s()-]/g, "");
  return /^\+?[0-9]{7,15}$/.test(cleaned) ? cleaned : null;
}
export function safeCover(url: string) {
  return (
    /^\/images\/clubos\/[a-z0-9-]+\.webp$/.test(url) ||
    /^https:\/\/[^\s<>"']+$/.test(url)
  );
}
export function safeTarget(target: string) {
  return /^(discover|blogs|profile|registrations|schedule|support|event\/[a-zA-Z0-9_-]+|blog\/[a-zA-Z0-9_-]+)$/.test(
    target,
  );
}
