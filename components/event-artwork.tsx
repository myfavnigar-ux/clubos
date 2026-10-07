import { safeCover } from "@/lib/community-types";
import type { ClubEvent } from "@/lib/data";

const eventArtwork: Record<string, { file: string; description: string }> = {
  "web-workshop": {
    file: "web-workshop",
    description:
      "A mentor helping a beginner assemble their first website at a laptop",
  },
  "fresh-code": {
    file: "fresh-code",
    description:
      "Beginner coders exploring a branching algorithm path and code brackets",
  },
  "space-quest": {
    file: "space-quest",
    description:
      "An astronomy explorer with a telescope and a model of planetary orbits",
  },
  "green-energy": {
    file: "green-energy",
    description:
      "Students experimenting with solar panels and a miniature wind turbine",
  },
  "innovation-showcase": {
    file: "innovation-showcase",
    description:
      "A student presenting an assistive technology prototype at a science exhibition",
  },
  "photo-story": {
    file: "photo-story",
    description:
      "A campus photographer composing a story through a sequence of photographs",
  },
  "motion-lab": {
    file: "motion-lab",
    description:
      "An animation student working with motion frames and colorful props",
  },
  "poster-jam": {
    file: "poster-jam",
    description:
      "Hands arranging bold geometric paper shapes into an original poster",
  },
  "ai-web": {
    file: "ai-web",
    description:
      "An AI robot arm assembling a colorful website on a desktop screen",
  },
  "code-sprint": {
    file: "code-sprint",
    description:
      "Programming puzzles, a laptop and a stopwatch for a timed coding challenge",
  },
  robo: {
    file: "robotics",
    description: "A wheeled robot following a curved track",
  },
  design: {
    file: "design",
    description:
      "Color swatches, a pencil and brush for a creative design workshop",
  },
  gaming: {
    file: "gaming",
    description: "A colorful game controller for the campus gaming competition",
  },
  hack: {
    file: "hack",
    description:
      "A winter hackathon workspace with laptops and a campus prototype",
  },
  quiz: {
    file: "quiz",
    description: "A technology quiz stage with podium buzzers",
  },
  "first-ai": {
    file: "first-ai",
    description:
      "A student learning to build a first AI project with a friendly AI helper",
  },
};

export function artworkFor(event: ClubEvent) {
  return eventArtwork[event.id];
}

export function festivalArtwork(id?: string) {
  return (
    {
      science: {
        file: "science-fest",
        description:
          "A lively student science fair with astronomy, clean energy and invention exhibits",
      },
      creative: {
        file: "creative-fest",
        description:
          "A colorful campus media fair with photography, animation and printmaking",
      },
      carnival: {
        file: "campus",
        description:
          "A colorful campus technology carnival with creative maker exhibits",
      },
      winter: {
        file: "winter-fest",
        description:
          "A warmly lit winter technology fair with student maker booths",
      },
      freshers: {
        file: "freshers-fest",
        description:
          "New students exploring welcoming beginner workshop stations",
      },
    } as Record<string, { file: string; description: string }>
  )[id || "carnival"];
}

export function EventArtwork({
  event,
  detail = false,
  compact = false,
}: {
  event: ClubEvent;
  detail?: boolean;
  compact?: boolean;
}) {
  if (event.thumbnail && safeCover(event.thumbnail)) return <img className="event-illustration" src={event.thumbnail} alt={detail ? event.imageAlt || event.title : ""} width={960} height={640} loading={detail?"eager":"lazy"} decoding="async"/>;
  const art = artworkFor(event);
  if (!art)
    return (
      <div className="event-art-placeholder">
        <strong>{event.title}</strong>
        <span>{event.category}</span>
      </div>
    );
  return (
    <img
      className="event-illustration"
      src={`/images/clubos/${art.file}-480.webp`}
      srcSet={
        compact
          ? undefined
          : `/images/clubos/${art.file}-480.webp 480w, /images/clubos/${art.file}-960.webp 960w`
      }
      sizes={
        detail
          ? "(max-width: 800px) 100vw, 65vw"
          : "(max-width: 640px) 100vw, (max-width: 1150px) 45vw, 30vw"
      }
      width={960}
      height={640}
      alt={detail ? art.description : ""}
      loading={detail ? "eager" : "lazy"}
      decoding="async"
    />
  );
}
