 export function normalizeServiceId(input) {
  const id = Number(input);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function fmtBookingDate(value) {
  if (!value) return "an unspecified date";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}