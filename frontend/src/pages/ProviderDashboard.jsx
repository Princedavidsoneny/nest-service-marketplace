 import { useEffect, useState } from "react";
import { createService, fetchMyServices } from "../services";
import { getUser } from "../auth";

export default function ProviderDashboard() {
  const user = getUser();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [priceFrom, setPriceFrom] = useState("");
  const [description, setDescription] = useState("");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    try {
      setLoading(true);
      setErr("");
      const data = await fetchMyServices(user?.token);
      setRows(Array.isArray(data) ? data : data?.services || []);
    } catch (e) {
      setErr(e?.message || "Failed to load your services");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();

    try {
      setErr("");
      setMsg("");

      if (!title.trim()) {
        setErr("Service title is required.");
        return;
      }
      if (!category.trim()) {
        setErr("Category is required.");
        return;
      }
      if (!description.trim()) {
        setErr("Description is required.");
        return;
      }

      setSaving(true);

      await createService(
        {
          title: title.trim(),
          category: category.trim(),
          city: city.trim(),
          price_from: priceFrom.trim(),
          description: description.trim(),
        },
        user?.token
      );

      setMsg("Service created successfully.");
      setTitle("");
      setCategory("");
      setCity("");
      setPriceFrom("");
      setDescription("");
      load();
    } catch (e2) {
      setErr(e2?.message || "Failed to create service");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-extrabold text-white">Provider Dashboard</h1>
        <p className="mt-2 text-slate-300">
          Create and manage your service listings.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[420px,1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-2xl font-bold text-white">Create a Service</h2>

            <form onSubmit={handleCreate} className="space-y-4">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Service title (e.g. Electrician)"
                className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-white outline-none"
              />

              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Category"
                className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-white outline-none"
              />

              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City (optional)"
                className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-white outline-none"
              />

              <input
                value={priceFrom}
                onChange={(e) => setPriceFrom(e.target.value)}
                placeholder="Price from (₦)"
                className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-white outline-none"
              />

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Service description"
                rows={5}
                className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-white outline-none"
              />

              {err && <div className="text-sm text-red-400">{err}</div>}
              {msg && <div className="text-sm text-green-400">{msg}</div>}

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-2xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
              >
                {saving ? "Creating..." : "Create Service"}
              </button>
            </form>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">My Services</h2>
              <button
                type="button"
                onClick={load}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="text-slate-300">Loading services...</div>
            ) : rows.length === 0 ? (
              <div className="text-slate-300">No services yet.</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {rows.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-2xl border border-white/10 bg-slate-900/50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-white">{s.title}</h3>
                        <p className="mt-1 text-sm text-slate-300">
                          {(s.category || "General")} • {(s.city || "N/A")}
                        </p>
                      </div>

                      <div className="rounded-full border border-white/10 bg-slate-950 px-3 py-1 text-sm font-semibold text-cyan-300">
                        ₦{Number(s.price_from || 0).toLocaleString()}
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-slate-300">
                      {s.description || "No description"}
                    </p>
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