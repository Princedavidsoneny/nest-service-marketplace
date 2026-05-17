 export function getServiceImage(service) {
  const title = String(service?.title || "").toLowerCase();
  const category = String(service?.category || "").toLowerCase();
  const description = String(service?.description || "").toLowerCase();

  const text = `${title} ${category} ${description}`;

  if (text.includes("cleaner") || text.includes("cleaning")) {
    return "/images/services/cleaner.jpg";
  }

  if (text.includes("electric") || text.includes("wiring")) {
    return "/images/services/electrician.jpg";
  }

  if (
    text.includes("plumber") ||
    text.includes("plumbing") ||
    text.includes("tap")
  ) {
    return "/images/services/plumber.jpg";
  }

  if (
    text.includes("mechanic") ||
    text.includes("car repair") ||
    text.includes("vehicle")
  ) {
    return "/images/services/mechanic.jpg";
  }

  if (
    text.includes("driver") ||
    text.includes("driving") ||
    text.includes("transport")
  ) {
    return "/images/services/driver.jpg";
  }

  if (
    text.includes("painter") ||
    text.includes("painting") ||
    text.includes("paint")
  ) {
    return "/images/services/painter.jpg";
  }

  if (
    text.includes("carpenter") ||
    text.includes("wood") ||
    text.includes("furniture")
  ) {
    return "/images/services/carpenter.jpg";
  }

  if (
    text.includes("generator") ||
    text.includes("gen repair")
  ) {
    return "/images/services/generator.jpg";
  }

  if (
    text.includes("appliance") ||
    text.includes("fridge") ||
    text.includes("washing machine")
  ) {
    return "/images/services/appliance.jpg";
  }

  if (
    text.includes("moving") ||
    text.includes("mover") ||
    text.includes("relocation")
  ) {
    return "/images/services/moving.jpg";
  }

  if (
    text.includes("labourer") ||
    text.includes("laborer") ||
    text.includes("labour")
  ) {
    return "/images/services/labourer.jpg";
  }

  if (
    text.includes("tiler") ||
    text.includes("tiling") ||
    text.includes("tiles")
  ) {
    return "/images/services/tiler.jpg";
  }

  if (
    text.includes("handyman") ||
    text.includes("handy")
  ) {
    return "/images/services/handyman.jpg";
  }

  return "/images/services/default.jpg";
}

export function formatCategory(category) {
  const value = String(category || "").trim();

  if (!value) return "General";

  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatCity(city) {
  const value = String(city || "").trim();

  return value || "Location not specified";
}

export function formatPrice(price) {
  const num = Number(price);

  if (!Number.isFinite(num) || num <= 0) {
    return "Negotiable";
  }

  return `₦${num.toLocaleString()}`;
}

export function dedupeCities(services = []) {
  const seen = new Set();

  return services
    .map((s) => formatCity(s?.city))
    .filter((city) => {
      const key = city.toLowerCase();

      if (seen.has(key)) return false;

      seen.add(key);

      return true;
    });
}