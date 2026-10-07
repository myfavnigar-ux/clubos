import { catalogFests, catalogEvents } from "./catalog-additions";
export type Fest = {
  id: string;
  name: string;
  eyebrow: string;
  description: string;
  date: string;
  venue: string;
  color: string;
};
export type ClubEvent = {
  paymentNumber?: string;
  paymentMethod?: string;
  participation?: "individual" | "team";
  teamMin?: number;
  teamMax?: number;
  thumbnail?: string;
  imageAlt?: string;
  requirements?: string;
  eligibility?: string;
  rules?: string;
  format?: string;
  paused?: boolean;
  id: string;
  festId: string;
  title: string;
  category: string;
  description: string;
  start: string;
  end: string;
  deadline: string;
  venue: string;
  capacity: number;
  fee: number;
  icon: string;
  level: string;
};
export type Registration = {
  teamId?: string | null;
  teamName?: string;
  members?: { uid: string; name: string }[];
  trxId?: string;
  payment?: { amount?: number; number?: string; method?: string };
  ownerUid?: string | null;
  id: string;
  eventId: string;
  name: string;
  email: string;
  institution: string;
  status: string;
  own: number;
  created: string;
};
export const eventPrice = (e: ClubEvent, mode?: "individual" | "team") =>
  e.fee > 0
    ? `৳${e.fee.toLocaleString("en-BD")} / ${mode === "team" ? "team" : mode === "individual" ? "person" : "entry"}`
    : "Free entry";
export const fests: Fest[] = [
  {
    id: "carnival",
    name: "Tech Carnival 2026",
    eyebrow: "THE FLAGSHIP EXPERIENCE",
    description:
      "Three days. Big ideas. Your people. Build, compete, and discover what comes next at our signature tech festival.",
    date: "23–25 OCT 2026",
    venue: "DRMC Campus, Dhaka",
    color: "green",
  },
  {
    id: "winter",
    name: "Winter Tech Fest",
    eyebrow: "BUILD SOMETHING BRILLIANT",
    description:
      "A weekend of hands-on workshops, collaborative hacking, and new connections.",
    date: "18–19 DEC 2026",
    venue: "DRMC Innovation Lab",
    color: "purple",
  },
  {
    id: "freshers",
    name: "Freshers’ Tech Fest",
    eyebrow: "YOUR FIRST CHAPTER",
    description:
      "No experience needed. Meet the community and turn your curiosity into your first creation.",
    date: "15 JAN 2027",
    venue: "DRMC Auditorium",
    color: "orange",
  },
];
fests.push(...catalogFests);
export const events: ClubEvent[] = [
  {
    id: "ai-web",
    festId: "carnival",
    title: "AI Web Development",
    category: "Development",
    description:
      "Turn an ambitious idea into a working web experience. Use AI tools, thoughtful design, and your creativity to build something people will love. Bring a laptop and a curious mind. Individual participation; all student levels welcome.",
    start: "2026-10-23T09:00:00+06:00",
    end: "2026-10-23T12:00:00+06:00",
    deadline: "2026-10-21T23:59:00+06:00",
    venue: "Innovation Lab · Room 201",
    capacity: 60,
    fee: 0,
    icon: "code",
    level: "All levels",
  },
  {
    id: "code-sprint",
    festId: "carnival",
    title: "Code Sprint",
    category: "Programming",
    description:
      "Race the clock through a curated set of algorithmic challenges. C++, Python, and Java are supported. Individual contest with live scoring and a final solution walkthrough.",
    start: "2026-10-23T09:30:00+06:00",
    end: "2026-10-23T12:30:00+06:00",
    deadline: "2026-10-21T23:59:00+06:00",
    venue: "Computer Lab · Block B",
    capacity: 40,
    fee: 0,
    icon: "terminal",
    level: "Intermediate",
  },
  {
    id: "robo",
    festId: "carnival",
    title: "Robotics Arena",
    category: "Robotics",
    description:
      "Bring your autonomous line-following robot and put precision to the test. Each participant gets a calibration round followed by two timed runs. Hardware must be battery powered.",
    start: "2026-10-24T10:00:00+06:00",
    end: "2026-10-24T13:00:00+06:00",
    deadline: "2026-10-21T23:59:00+06:00",
    venue: "Main Hall · Arena A",
    capacity: 30,
    fee: 0,
    icon: "bot",
    level: "Intermediate",
  },
  {
    id: "design",
    festId: "carnival",
    title: "Design Beyond Screens",
    category: "Design",
    description:
      "Explore design thinking, accessible interfaces, and rapid prototyping in this guided workshop. Leave with a prototype and a fresh perspective on everyday problems.",
    start: "2026-10-24T14:00:00+06:00",
    end: "2026-10-24T16:00:00+06:00",
    deadline: "2026-10-21T23:59:00+06:00",
    venue: "Creative Studio · Room 105",
    capacity: 4,
    fee: 0,
    icon: "pen",
    level: "Beginner friendly",
  },
  {
    id: "gaming",
    festId: "carnival",
    title: "Campus Gaming Cup",
    category: "Gaming",
    description:
      "An individual Rocket League skills challenge. Compete in timed training packs on the provided equipment. Fair play and sportsmanship come first.",
    start: "2026-10-25T11:00:00+06:00",
    end: "2026-10-25T14:00:00+06:00",
    deadline: "2026-10-01T23:59:00+06:00",
    venue: "Recreation Hall",
    capacity: 24,
    fee: 0,
    icon: "game",
    level: "All levels",
  },
  {
    id: "hack",
    festId: "winter",
    title: "The Winter Hack",
    category: "Development",
    description:
      "Build a practical solution to a campus problem in a mentored individual hackathon. Open-source libraries and AI coding tools are welcome with disclosure.",
    start: "2026-12-18T09:00:00+06:00",
    end: "2026-12-18T17:00:00+06:00",
    deadline: "2026-12-16T23:59:00+06:00",
    venue: "Innovation Lab",
    capacity: 50,
    fee: 0,
    icon: "code",
    level: "All levels",
  },
  {
    id: "quiz",
    festId: "winter",
    title: "Tech Trivia Live",
    category: "Quiz",
    description:
      "From computing history to emerging technology: a fast-paced individual quiz with three rounds and a buzzer finale.",
    start: "2026-12-19T10:00:00+06:00",
    end: "2026-12-19T12:00:00+06:00",
    deadline: "2026-12-16T23:59:00+06:00",
    venue: "DRMC Auditorium",
    capacity: 80,
    fee: 0,
    icon: "spark",
    level: "All levels",
  },
  {
    id: "first-ai",
    festId: "freshers",
    title: "Your First AI Project",
    category: "Workshop",
    description:
      "A welcoming, hands-on introduction to making things with AI. Learn responsible prompting and build your first small project. No coding background required.",
    start: "2027-01-15T10:00:00+06:00",
    end: "2027-01-15T12:00:00+06:00",
    deadline: "2027-01-13T23:59:00+06:00",
    venue: "DRMC Auditorium",
    capacity: 70,
    fee: 0,
    icon: "spark",
    level: "Beginner friendly",
  },
];
events.push(...catalogEvents);
const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "Asia/Dhaka",
});
const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Dhaka",
});
export const dateLabel = (s: string) => dateFormatter.format(new Date(s));
export const timeLabel = (s: string) => timeFormatter.format(new Date(s));
export type Snapshot = {
  seatCounts?: Record<string, number>;
  viewer?: {
    uid: string;
    email: string;
    verified: boolean;
    admin: boolean;
  } | null;
  fests: Fest[];
  events: ClubEvent[];
  registrations: Registration[];
  serverTime: string;
};
