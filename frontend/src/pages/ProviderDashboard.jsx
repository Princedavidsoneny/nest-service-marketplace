 import { useEffect, useMemo, useState } from "react";
import { createService, fetchMyServices } from "../services";
import {
  fetchServiceImages,
  uploadServiceImage,
  deleteServiceImage,
} from "../api/serviceImages";

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:5000"
).replace(/\/+$/, "");

function money(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "Negotiable";
  return `₦${n.toLocaleString()}`;
}

function fallbackServiceImage(service) {
  const text = `${service?.title || ""} ${service?.category || ""}`.toLowerCase();

  if (text.includes("plumb")) return "/images/services/plumber.jpg";
  if (text.includes("electric")) return "/images/services/electrician.jpg";
  if (text.includes("clean")) return "/images/services/cleaner.jpg";
  if (text.includes("mechanic")) return "/images/services/mechanic.jpg";
  if (text.includes("labour") || text.includes("labor")) return "/images/services/labourer.jpg";
  if (text.includes("tile")) return "/images/services/tiler.jpg";
  if (text.includes("paint")) return "/images/services/painter.jpg";
  if (text.includes("carpent")) return "/images/services/carpenter.jpg";
  if (text.includes("move")) return "/images/services/moving.jpg";

  return "/images/services/default.jpg";
}

function publicImageUrl(value) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (String(value).startsWith("/")) return `${API_BASE}${value}`;
  return `${API_BASE}/${String(value).replace(/^\/+/, "")}`;
}

function dedupeById(list = []) {
  const map = new Map();

  for (const item of list) {
    if (!item || item.id == null) continue;
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  }

  return Array.from(map.values());
}

function friendlyErrorMessage(error) {
  const raw = String(error?.message || "").toLowerCase();

  if (raw.includes("missing token") || raw.includes("invalid token")) {
    return "Please log in again and try.";
  }

  if (raw.includes("forbidden")) {
    return "Only providers can create services.";
  }

  if (raw.includes("title")) {
    return "Service title is required.";
  }

  if (raw.includes("category")) {
    return "Please select a category.";
  }

  if (raw.includes("description")) {
    return "Please enter a service description.";
  }

  return error?.message || "Something went wrong. Please try again.";
}

function normalizeService(service) {
  return {
    ...service,
    title: service?.title || "Untitled service",
    category: service?.category || "general",
    city: service?.city || "N/A",
    priceFrom: Number(service?.priceFrom || service?.price_from || 0) || 0,
    description: service?.description || "No description provided.",
    coverImage: service?.coverImage || "",
    images: Array.isArray(service?.images) ? service.images : [],
  };
}

export default function ProviderDashboard() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [uploadingFor, setUploadingFor] = useState(null);
  const [deletingImageId, setDeletingImageId] = useState(null);
  const [imageFiles, setImageFiles] = useState({});
  const [serviceImageMap, setServiceImageMap] = useState({});
  const [galleryError, setGalleryError] = useState("");
  const [galleryMsg, setGalleryMsg] = useState("");

  const [form, setForm] = useState({
    title: "",
    category: "",
    customCategory: "",
    city: "",
    priceFrom: "",
    description: "",
  });

  const categoryOptions = [
    "plumber",
    "electrician",
    "cleaner",
    "mechanic",
    "labourer",
    "tiler",
    "painter",
    "carpenter",
    "generator repair",
    "appliance repair",
    "moving service",
    "general",
    "other",
  ];

  async function loadServiceImages(serviceId) {
    try {
      const data = await fetchServiceImages(serviceId);
      const images = Array.isArray(data?.images) ? data.images : [];
      setServiceImageMap((prev) => ({
        ...prev,
        [serviceId]: images,
      }));
    } catch {
      setServiceImageMap((prev) => ({
        ...prev,
        [serviceId]: [],
      }));
    }
  }

  async function loadAllImages(serviceList) {
    await Promise.all(
      serviceList.map(async (service) => {
        await loadServiceImages(service.id);
      })
    );
  }

  async function load() {
    try {
      setLoading(true);
      setErr("");

      const data = await fetchMyServices();
      const list = Array.isArray(data) ? data : data?.rows || [];
      const normalized = dedupeById(list).map(normalizeService);

      setServices(normalized);
      await loadAllImages(normalized);
    } catch (e) {
      setErr(e?.message || "Failed to load your services");
      setServices([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!msg && !galleryMsg) return;
    const t = setTimeout(() => {
      setMsg("");
      setGalleryMsg("");
    }, 2500);
    return () => clearTimeout(t);
  }, [msg, galleryMsg]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm({
      title: "",
      category: "",
      customCategory: "",
      city: "",
      priceFrom: "",
      description: "",
    });
  }

  function handleImageFileChange(serviceId, file) {
    setImageFiles((prev) => ({
      ...prev,
      [serviceId]: file || null,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setErr("");
      setMsg("");
      setGalleryError("");
      setGalleryMsg("");

      const title = form.title.trim();
      const selectedCategory = form.category.trim();
      const customCategory = form.customCategory.trim();
      const category =
        selectedCategory === "other" ? customCategory : selectedCategory;
      const city = form.city.trim();
      const description = form.description.trim();
      const priceNumber = Number(form.priceFrom || 0);

      if (!title) {
        setErr("Service title is required.");
        return;
      }

      if (!selectedCategory) {
        setErr("Category is required.");
        return;
      }

      if (selectedCategory === "other" && !customCategory) {
        setErr("Please enter your custom category.");
        return;
      }

      if (!description) {
        setErr("Description is required.");
        return;
      }

      if (form.priceFrom && (!Number.isFinite(priceNumber) || priceNumber < 0)) {
        setErr("Starting price must be a valid number.");
        return;
      }

      setSaving(true);

      await createService({
        title,
        category,
        city,
        priceFrom: form.priceFrom ? priceNumber : null,
        description,
      });

      setMsg("Service created successfully.");
      resetForm();
      await load();
    } catch (e) {
      setErr(friendlyErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadImage(serviceId) {
    try {
      setGalleryError("");
      setGalleryMsg("");

      const file = imageFiles[serviceId];
      if (!file) {
        setGalleryError("Please choose an image first.");
        return;
      }

      setUploadingFor(serviceId);

      await uploadServiceImage(serviceId, file);
      await loadServiceImages(serviceId);

      setImageFiles((prev) => ({
        ...prev,
        [serviceId]: null,
      }));

      setGalleryMsg("Service image uploaded successfully.");
    } catch (e) {
      setGalleryError(friendlyErrorMessage(e));
    } finally {
      setUploadingFor(null);
    }
  }

  async function handleDeleteImage(serviceId, imageId) {
    try {
      setGalleryError("");
      setGalleryMsg("");
      setDeletingImageId(imageId);

      await deleteServiceImage(imageId);
      await loadServiceImages(serviceId);

      setGalleryMsg("Image deleted successfully.");
    } catch (e) {
      setGalleryError(friendlyErrorMessage(e));
    } finally {
      setDeletingImageId(null);
    }
  }

  const stats = useMemo(() => {
    const total = services.length;
    const withCity = services.filter((s) => s?.city && s.city !== "N/A").length;
    const priced = services.filter((s) => Number(s?.priceFrom || 0) > 0).length;
    const categories = new Set(
      services.map((s) => String(s?.category || "").trim()).filter(Boolean)
    ).size;

    return { total, withCity, priced, categories };
  }, [services]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-10 grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">
              Provider Dashboard
            </h1>
            <p className="mt-3 max-w-2xl text-base text-slate-300 md:text-lg">
              Create and manage your service listings, upload service photos, set your pricing, and make your business visible to customers searching for trusted local professionals.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  My services
                </div>
                <div className="mt-1 text-2xl font-bold text-white">
                  {stats.total}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  With city
                </div>
                <div className="mt-1 text-2xl font-bold text-white">
                  {stats.withCity}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  With price
                </div>
                <div className="mt-1 text-2xl font-bold text-white">
                  {stats.priced}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Categories
                </div>
                <div className="mt-1 text-2xl font-bold text-white">
                  {stats.categories}
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/40 shadow-2xl">
            <img
              src="/images/hero-handyman.jpg"
              alt="Provider dashboard"
              className="h-full max-h-[340px] w-full object-cover"
              onError={(e) => {
                e.currentTarget.src = "/images/services/default.jpg";
              }}
            />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur">
            <div className="mb-5">
              <h2 className="text-2xl font-bold text-white">Create a Service</h2>
              <p className="mt-1 text-sm text-slate-400">
                Add a service customers can book directly or request a quote for.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Service title
                </label>
                <input
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder="e.g. Home plumbing repair"
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/60"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) => {
                    const value = e.target.value;
                    updateField("category", value);
                    if (value !== "other") {
                      updateField("customCategory", "");
                    }
                  }}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-white outline-none focus:border-cyan-400/60"
                >
                  <option value="">Select category</option>
                  {categoryOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>

                {form.category === "other" ? (
                  <div className="mt-4">
                    <label className="mb-2 block text-sm text-slate-300">
                      Custom category
                    </label>
                    <input
                      value={form.customCategory}
                      onChange={(e) => updateField("customCategory", e.target.value)}
                      placeholder="e.g. driver"
                      className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/60"
                    />
                  </div>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">City</label>
                <input
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  placeholder="e.g. Lagos"
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/60"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Starting price (₦)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.priceFrom}
                  onChange={(e) => updateField("priceFrom", e.target.value)}
                  placeholder="e.g. 15000"
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/60"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Describe what you offer and why customers should book you"
                  rows={5}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/60"
                />
              </div>

              {msg ? (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  {msg}
                </div>
              ) : null}

              {err ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {err}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-2xl bg-cyan-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Create Service"}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
                >
                  Reset Form
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-white">My Services</h2>
                <p className="mt-1 text-sm text-slate-400">
                  All services you have published on Nest.
                </p>
              </div>

              <button
                type="button"
                onClick={load}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Refresh
              </button>
            </div>

            {galleryMsg ? (
              <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {galleryMsg}
              </div>
            ) : null}

            {galleryError ? (
              <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {galleryError}
              </div>
            ) : null}

            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 text-slate-300">
                Loading services...
              </div>
            ) : services.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-8 text-center text-slate-300">
                <div className="text-lg font-semibold text-white">
                  No services yet
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  Create your first service from the form and it will appear here.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {services.map((service) => {
                  const uploadedImages = serviceImageMap[service.id] || [];
                  const cover =
                    uploadedImages[0]?.imageUrl
                      ? publicImageUrl(uploadedImages[0].imageUrl)
                      : service.coverImage
                      ? publicImageUrl(service.coverImage)
                      : fallbackServiceImage(service);

                  return (
                    <div
                      key={service.id}
                      className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 shadow-lg"
                    >
                      <img
                        src={cover}
                        alt={service.title}
                        className="h-40 w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = "/images/services/default.jpg";
                        }}
                      />

                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-lg font-semibold text-white">
                              {service.title}
                            </h3>
                            <div className="mt-1 text-sm text-slate-300">
                              {service.category} • {service.city}
                            </div>
                          </div>

                          <div className="rounded-full border border-white/10 bg-slate-950/80 px-3 py-1 text-sm font-semibold text-cyan-300">
                            {money(service.priceFrom)}
                          </div>
                        </div>

                        <p className="mt-3 min-h-[48px] text-sm text-slate-300">
                          {service.description}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                            Service ID: {service.id}
                          </span>

                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                            Active
                          </span>
                        </div>

                        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/50 p-3">
                          <div className="mb-2 text-sm font-semibold text-white">
                            Service Images
                          </div>

                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              handleImageFileChange(service.id, e.target.files?.[0] || null)
                            }
                            className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-slate-300"
                          />

                          <button
                            type="button"
                            onClick={() => handleUploadImage(service.id)}
                            disabled={uploadingFor === service.id}
                            className="mt-3 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60"
                          >
                            {uploadingFor === service.id ? "Uploading..." : "Upload Image"}
                          </button>

                          {uploadedImages.length > 0 ? (
                            <div className="mt-4 grid grid-cols-3 gap-2">
                              {uploadedImages.map((image) => (
                                <div
                                  key={image.id}
                                  className="overflow-hidden rounded-xl border border-white/10 bg-slate-900"
                                >
                                  <img
                                    src={publicImageUrl(image.imageUrl)}
                                    alt="Service"
                                    className="h-20 w-full object-cover"
                                  />

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeleteImage(service.id, image.id)
                                    }
                                    disabled={deletingImageId === image.id}
                                    className="w-full border-t border-white/10 px-2 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/10 disabled:opacity-60"
                                  >
                                    {deletingImageId === image.id
                                      ? "Deleting..."
                                      : "Delete"}
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-3 text-xs text-slate-400">
                              No uploaded images yet for this service.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}