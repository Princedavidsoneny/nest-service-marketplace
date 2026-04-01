 import { useEffect, useMemo, useState } from "react";
import { createService, fetchMyServices } from "../services";

function money(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "Negotiable";
  return `₦${n.toLocaleString()}`;
}

function getServiceImage(service) {
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

  return "Something went wrong. Please try again.";
}

export default function ProviderDashboard() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState({
    title: "",
    category: "",
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
  ];

  async function load() {
    try {
      setLoading(true);
      setErr("");

      const data = await fetchMyServices();
      const list = Array.isArray(data) ? data : data?.rows || [];
      setServices(dedupeById(list));
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

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm({
      title: "",
      category: "",
      city: "",
      priceFrom: "",
      description: "",
    });
    setErr("");
    setMsg("");
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setErr("");
      setMsg("");

      const title = form.title.trim();
      const category = form.category.trim();
      const city = form.city.trim();
      const description = form.description.trim();
      const priceNumber = Number(form.priceFrom || 0);

      if (!title) {
        setErr("Service title is required");
        return;
      }

      if (!category) {
        setErr("Category is required");
        return;
      }

      if (!description) {
        setErr("Description is required");
        return;
      }

      if (form.priceFrom && (!Number.isFinite(priceNumber) || priceNumber < 0)) {
        setErr("Starting price must be a valid number");
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

  const stats = useMemo(() => {
    const total = services.length;
    const withCity = services.filter((s) => s?.city).length;
    const priced = services.filter((s) => Number(s?.priceFrom || s?.price_from || 0) > 0).length;
    return { total, withCity, priced };
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
              Create and manage your service listings, set your pricing, and make your
              business attractive to customers searching for trusted local professionals.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-slate-400">My services</div>
                <div className="mt-1 text-2xl font-bold text-white">{stats.total}</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-slate-400">With city</div>
                <div className="mt-1 text-2xl font-bold text-white">{stats.withCity}</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-slate-400">With price</div>
                <div className="mt-1 text-2xl font-bold text-white">{stats.priced}</div>
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
                Add a professional service customers can book or request a quote for.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-slate-300">Service title</label>
                <input
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder="e.g. Home plumbing repair"
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/60"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => updateField("category", e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-white outline-none focus:border-cyan-400/60"
                >
                  <option value="">Select category</option>
                  {categoryOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
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
                <label className="mb-2 block text-sm text-slate-300">Starting price (₦)</label>
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
                <label className="mb-2 block text-sm text-slate-300">Description</label>
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
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 text-slate-300">
                Loading services...
              </div>
            ) : services.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 text-slate-300">
                No services yet. Create your first service from the form.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {services.map((service) => (
                  <div
                    key={service.id}
                    className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 shadow-lg"
                  >
                    <img
                      src={getServiceImage(service)}
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
                            {(service.category || "General")} • {(service.city || "N/A")}
                          </div>
                        </div>

                        <div className="rounded-full border border-white/10 bg-slate-950/80 px-3 py-1 text-sm font-semibold text-cyan-300">
                          {money(service.priceFrom || service.price_from)}
                        </div>
                      </div>

                      <p className="mt-3 min-h-[48px] text-sm text-slate-300">
                        {service.description || "No description provided."}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                          Service ID: {service.id}
                        </span>

                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                          Active
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}