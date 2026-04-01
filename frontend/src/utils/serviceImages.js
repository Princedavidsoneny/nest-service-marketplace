 export function getServiceImage(service) {
  const title = String(service?.title || "").toLowerCase();
  const category = String(service?.category || "").toLowerCase();
  const text = `${title} ${category}`;

  if (text.includes("cleaner")) {
    return "/images/services/cleaner.jpg";
  }

  if (text.includes("electric")) {
    return "/images/services/electrician.jpg";
  }

  if (text.includes("plumber")) {
    return "/images/services/plumber.jpg";
  }

  if (text.includes("mechanic")) {
    return "/images/services/mechanic.jpg";
  }

  if (text.includes("labourer") || text.includes("laborer")) {
    return "/images/services/labourer.jpg";
  }

  if (text.includes("tiler") || text.includes("tiling")) {
    return "/images/services/tiler.jpg";
  }

  if (text.includes("handyman") || text.includes("handy")) {
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
  if (!Number.isFinite(num) || num <= 0) return "Negotiable";
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