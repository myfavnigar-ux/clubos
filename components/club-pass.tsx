"use client";
import { useEffect, useState } from "react";
import { ClubEvent, Registration, dateLabel, timeLabel } from "@/lib/data";

export const passPayload = (id: string) => `clubos:${id}`;
const escape = (s: string) =>
  s
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, "")
    .replace(
      /[<>&"']/g,
      (c) =>
        ({
          "<": "&lt;",
          ">": "&gt;",
          "&": "&amp;",
          '"': "&quot;",
          "'": "&apos;",
        })[c]!,
    );
function fitText(
  s: string,
  width: number,
  maxLines: number,
  initialSize: number,
  bold = false,
) {
  const ctx = document.createElement("canvas").getContext("2d")!;
  let size = initialSize,
    result: string[] = [];
  for (; size >= 10; size--) {
    ctx.font = `${bold ? "700 " : ""}${size}px Arial`;
    result = [];
    let line = "";
    for (const character of s.replace(/\s+/g, " ").trim()) {
      if (line && ctx.measureText(line + character).width > width) {
        result.push(line.trim());
        line = character;
      } else line += character;
    }
    if (line) result.push(line.trim());
    if (result.length <= maxLines) break;
  }
  return { size, lines: result };
}
async function qr(id: string) {
  const { default: QRCode } = await import("qrcode");
  return QRCode.toString(passPayload(id), {
    type: "svg",
    margin: 4,
    errorCorrectionLevel: "M",
    color: { dark: "#123e32", light: "#ffffff" },
  });
}

export function PassQR({ id }: { id: string }) {
  const [src, setSrc] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let current = true;
    qr(id)
      .then((svg) => {
        if (current)
          setSrc("data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg));
      })
      .catch(() => {
        if (current) setFailed(true);
      });
    return () => {
      current = false;
    };
  }, [id]);
  return (
    <div className="pass-qr">
      {src ? (
        <img
          src={src}
          width="124"
          height="124"
          alt="QR code containing this ticket ID"
        />
      ) : (
        <span>{failed ? "Use ticket ID below" : "Preparing QR…"}</span>
      )}
      <small>SCAN AT THE DOOR</small>
    </div>
  );
}

export async function downloadPass(
  ticket: Registration,
  event: ClubEvent,
  festival: string,
) {
  const code = (await qr(ticket.id)).replace(
    "<svg ",
    '<svg x="480" y="622" width="210" height="210" ',
  );
  const titleFit = fitText(event.title, 644, 3, 41, true);
  const nameFit = fitText(ticket.name, 385, 3, 23, true);
  const venueFit = fitText(event.venue, 644, 3, 20);
  const festivalFit = fitText(festival, 644, 1, 17);
  const tspans = (fit: { lines: string[] }, dy: number) =>
    fit.lines
      .map(
        (line, i) => `<tspan x="58" dy="${i ? dy : 0}">${escape(line)}</tspan>`,
      )
      .join("");
  const title = tspans(titleFit, 51),
    name = tspans(nameFit, 29),
    venue = tspans(venueFit, 25);
  const status = ticket.status.replace("_", " ").toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="1000" viewBox="0 0 760 1000">
  <rect width="760" height="1000" rx="32" fill="#f1f5e9"/>
  <path d="M32 0H728Q760 0 760 32V575H0V32Q0 0 32 0" fill="#123e32"/>
  <circle cx="697" cy="99" r="142" fill="none" stroke="#c4f16b" stroke-opacity=".22"/>
  <circle cx="697" cy="99" r="100" fill="none" stroke="#c4f16b" stroke-opacity=".22"/>
  <g font-family="Arial,Helvetica,sans-serif">
  <text x="58" y="84" fill="#c4f16b" font-size="35" font-weight="700">clubos</text>
  <text x="58" y="134" fill="#d3e3d7" font-size="15" letter-spacing="3">YOUR DIGITAL CAMPUS PASS</text>
  <text x="58" y="209" fill="#c4f16b" font-size="${festivalFit.size}">${escape(festival)}</text>
  <text x="58" y="267" fill="white" font-size="${titleFit.size}" font-weight="700">${title}</text>
  <text x="58" y="452" fill="#e0ebe3" font-size="23">${escape(dateLabel(event.start))} · ${escape(timeLabel(event.start))} BST</text>
  <text x="58" y="498" fill="#e0ebe3" font-size="${venueFit.size}">${venue}</text>
  <path d="M25 575H735" stroke="#a7b895" stroke-width="2" stroke-dasharray="9 8"/>
  <circle cx="0" cy="575" r="18" fill="white"/><circle cx="760" cy="575" r="18" fill="white"/>
  <text x="58" y="634" fill="#56704e" font-size="13" letter-spacing="2">REGISTERED TO</text>
  <text x="58" y="675" fill="#173c33" font-size="${nameFit.size}" font-weight="700">${name}</text>
  <rect x="58" y="759" width="210" height="43" rx="21" fill="${ticket.status === "cancelled" ? "#f2dcd9" : "#d5eab7"}"/>
  <text x="78" y="786" fill="#173c33" font-size="16" font-weight="700">${escape(status)}</text>
  ${code}
  <text x="485" y="856" fill="#47623c" font-size="13" letter-spacing="2">SCAN AT THE DOOR</text>
  <text x="58" y="886" fill="#47623c" font-size="13">TICKET ID · ${escape(ticket.id)}</text>
  <text x="58" y="945" fill="#56704e" font-size="14">Demo pass · Valid only within your ClubOS workspace.</text>
  <text x="58" y="968" fill="#56704e" font-size="13">Status is checked against the server at entry.</text>
  </g></svg>`;
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `clubos-pass-${ticket.id.slice(0, 8)}.svg`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
