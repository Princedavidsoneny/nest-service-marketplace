 export function normalizeProfileImage(value) {
  const text = String(value || "").trim();
  if (!text) return null;

  if (/^https?:\/\//i.test(text)) return text;
  if (text.startsWith("/uploads/")) return text;

  return null;
}

export function publicImageUrl(req, value) {
  const text = String(value || "").trim();
  if (!text) return "";

  if (/^https?:\/\//i.test(text)) return text;

  if (text.startsWith("/uploads/")) {
    return `${req.protocol}://${req.get("host")}${text}`;
  }

  return "";
}