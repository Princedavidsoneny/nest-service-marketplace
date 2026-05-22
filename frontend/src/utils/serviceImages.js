 const DEFAULT_IMAGE = "/images/services/default.jpg";

const SERVICE_IMAGE_RULES = [
  {
    image: "/images/services/cleaner.jpg",
    keywords: ["cleaner", "cleaning", "clean", "housekeeping", "maid"],
  },
  {
    image: "/images/services/electrician.jpg",
    keywords: ["electrician", "electric", "electrical", "wiring", "wire", "light"],
  },
  {
    image: "/images/services/plumber.jpg",
    keywords: ["plumber", "plumbing", "tap", "pipe", "water", "sink", "toilet"],
  },
  {
    image: "/images/services/mechanic.jpg",
    keywords: ["mechanic", "car repair", "vehicle", "auto", "automobile", "engine"],
  },
  {
    image: "/images/services/driver.jpg",
    keywords: ["driver", "driving", "transport", "chauffeur", "car hire"],
  },
  {
    image: "/images/services/painter.jpg",
    keywords: ["painter", "painting", "paint", "wall paint"],
  },
  {
    image: "/images/services/carpenter.jpg",
    keywords: ["carpenter", "carpentry", "wood", "furniture", "cabinet"],
  },
  {
    image: "/images/services/generator.jpg",
    keywords: ["generator", "gen repair", "generator repair", "gen"],
  },
  {
    image: "/images/services/appliance.jpg",
    keywords: [
      "appliance",
      "fridge",
      "freezer",
      "washing machine",
      "ac repair",
      "air conditioner",
      "technician",
      "repair",
    ],
  },
  {
    image: "/images/services/moving.jpg",
    keywords: ["moving", "mover", "relocation", "packing", "delivery"],
  },
  {
    image: "/images/services/labourer.jpg",
    keywords: ["labourer", "laborer", "labour", "labor", "site worker"],
  },
  {
    image: "/images/services/tiler.jpg",
    keywords: ["tiler", "tiling", "tiles", "floor tile", "wall tile"],
  },
  {
    image: "/images/services/handyman.jpg",
    keywords: [
      "handyman",
      "handy",
      "welder",
      "welding",
      "iron",
      "general",
      "home repairs",
      "maintenance",
    ],
  },
];

export function getServiceImage(service) {
  const text = [
    service?.title,
    service?.category,
    service?.description,
    service?.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const match = SERVICE_IMAGE_RULES.find((rule) =>
    rule.keywords.some((keyword) => text.includes(keyword))
  );

  return match?.image || DEFAULT_IMAGE;
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