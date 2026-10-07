import type React from "react";
export function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...props} />
    </label>
  );
}
export function saveFile(name: string, text: string, type: string) {
  const u = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
export function Badge({ status }: { status: string }) {
  return (
    <span className={"status " + status}>
      {status === "checked_in"
        ? "Checked in"
        : status === "pending_payment"
          ? "Payment review"
          : status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
