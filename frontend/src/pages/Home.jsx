 import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchServices, createBooking, createQuote } from "../services";
import { getUser } from "../auth";

function dedupeServices(list) {
  const seen = new Set();
  const result = [];

  for (const item of list || []) {
    if (!item) continue;

    const key = [
      String(item.title || "").trim().toLowerCase(),
      String(item.category || "").trim().toLowerCase(),
      String(item.city || "").trim().toLowerCase(),
      String(item.description || "").trim().toLowerCase(),
      String(item.price || item.price_from || "").trim().toLowerCase(),
    ].join("|");

    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result;
}

function fmtMoney(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num) || num <= 0) return "N/A";
  return `₦${num.toLocaleString()}`;
}

export default function Home() {
  const nav = useNavigate();
  const user = getUser();

  const [services, setServices] = useState([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [openModal, setOpenModal] = useState(false);
  const [mode, setMode] = useState("booking");
  const [selected, setSelected] = useState(null);

  const [bookingDate, setBookingDate] = useState("");
  const [bookingNote, setBookingNote] = useState("");
  const [quoteBudget, setQuoteBudget] = useState("");
  const [quoteDetails, setQuoteDetails] = useState("");

  async function loadServices() {
    try {
      setLoading(true);
      setErr("");
      const data = await fetchServices();
      const list = Array.isArray(data) ? data : data?.services || [];
      setServices(dedupeServices(list));
    } catch (e) {
      setErr(e?.message || "Failed to load services");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadServices();
  }, []);

  const categories = useMemo(() => {
    const set = new Set();
    for (const s of services) {
      if (s?.category) set.add(String(s.category));
    }
    return Array.from(set);
  }, [services]);

  const filteredServices = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const cc = city.trim().toLowerCase();

    return services.filter((s) => {
      const matchesQ =
        !qq ||
        String(s.title || "").toLowerCase().includes(qq) ||
        String(s.category || "").toLowerCase().includes(qq) ||
        String(s.description || "").toLowerCase().includes(qq) ||
        String(s.city || "").toLowerCase().includes(qq);

      const matchesCategory =
        !category || String(s.category || "").toLowerCase() === category.toLowerCase();

      const matchesCity =
        !cc || String(s.city || "").toLowerCase().includes(cc);

      return matchesQ && matchesCategory && matchesCity;
    });
  }, [services, q, category, city]);

  function resetModalFields() {
    setBookingDate("");
    setBookingNote("");
    setQuoteBudget("");
    setQuoteDetails("");
  }

  function openBooking(service) {
    if (!user) {
      nav("/login");
      return;
    }
    setSelected(service);
    setMode("booking");
    setErr("");
    setMsg("");
    resetModalFields();
    setOpenModal(true);
  }

  function openQuote(service) {
    if (!user) {
      nav("/login");
      return;
    }
    setSelected(service);
    setMode("quote");
    setErr("");
    setMsg("");
    resetModalFields();
    setOpenModal(true);
  }

  function closeModal() {
    if (saving) return;
    setOpenModal(false);
    setSelected(null);
    resetModalFields();
  }

  function handleReset() {
  setQ("");
  setCategory("");
  setCity("");
  setErr("");
  setMsg("");
}

  async function submitAction() {
    try {
      setErr("");
      setMsg("");

      if (!selected?.id) {
        setErr("No service selected.");
        return;
      }

      setSaving(true);

      if (mode === "booking") {
        if (!bookingDate.trim()) {
          setErr("Booking date is required.");
          return;
        }

        await createBooking({
          serviceId: selected.id,
          date: bookingDate.trim(),
          note: bookingNote.trim(),
        });

        setMsg("Booking created successfully.");
      } else {
        if (!quoteDetails.trim()) {
          setErr("Quote details are required.");
          return;
        }

        await createQuote({
          service_id: selected.id,
          budget: quoteBudget.trim(),
          details: quoteDetails.trim(),
        });

        setMsg("Quote request sent successfully.");
      }

      setOpenModal(false);
      resetModalFields();
    } catch (e) {
      setErr(e?.message || "Action failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white">
              Find a trusted service provider
            </h1>
            <p className="mt-2 max-w-3xl text-slate-300">
              Search, compare and book local professionals near you — plumbers,
              electricians, cleaners, mechanics and more.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-slate-400">
                Services
              </div>
              <div className="mt-1 text-2xl font-bold">{services.length}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-slate-400">
                Category
              </div>
              <div className="mt-1 text-2xl font-bold">{category || "All"}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-slate-400">
                City
              </div>
              <div className="mt-1 text-2xl font-bold">{city || "Any"}</div>
            </div>
          </div>
        </div>

        <div className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm text-slate-300">Search</label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search service (e.g. plumber, electrician)"
                className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-white outline-none"
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">City</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City (optional)"
                className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadServices}
              className="rounded-2xl bg-cyan-500 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-400"
            >
              Search
            </button>

            <button
              type="button"
              onClick={() => {
                setQ("");
                setCategory("");
                setCity("");
                setErr("");
                setMsg("");
              }}
              className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 font-semibold hover:bg-white/10"
            >
              Reset
            </button>
          </div>

          {msg && <div className="mt-4 text-sm text-green-400">{msg}</div>}
          {err && <div className="mt-4 text-sm text-red-400">{err}</div>}
        </div>

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-slate-300">
            Loading services...
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-slate-300">
            No services found.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredServices.map((s) => (
              <div
                key={s.id}
                className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-xl font-bold text-white">
                      {s.title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-300">
                      {(s.category || "General")} • {(s.city || "N/A")}
                    </p>
                  </div>

                  <div className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-sm font-semibold text-cyan-300">
                    {fmtMoney(s.price || s.price_from)}
                  </div>
                </div>

                <div className="mt-4 min-h-[56px] text-sm leading-6 text-slate-300">
                  {s.description || "No description provided."}
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => openBooking(s)}
                    className="rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
                  >
                    Book
                  </button>

                  <button
                    type="button"
                    onClick={() => openQuote(s)}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
                  >
                    Request Quote
                  </button>

                  <button
                    type="button"
                    onClick={() => nav(`/provider/${s.id}`)}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
                  >
                    View Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {openModal && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <div className="text-sm text-slate-400">
                  {mode === "booking" ? "Create Booking" : "Request Quote"}
                </div>
                <h3 className="text-xl font-bold text-white">{selected.title}</h3>
                <div className="mt-1 text-sm text-slate-400">
                  {(selected.category || "General")} • {(selected.city || "N/A")}
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white hover:bg-white/10"
              >
                ×
              </button>
            </div>

            {mode === "booking" ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Booking date
                  </label>
                  <input
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    placeholder="e.g. 2027-04-11 11:00"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Note
                  </label>
                  <input
                    value={bookingNote}
                    onChange={(e) => setBookingNote(e.target.value)}
                    placeholder="Any extra details"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Budget
                  </label>
                  <input
                    value={quoteBudget}
                    onChange={(e) => setQuoteBudget(e.target.value)}
                    placeholder="e.g. 15000"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Details
                  </label>
                  <textarea
                    value={quoteDetails}
                    onChange={(e) => setQuoteDetails(e.target.value)}
                    placeholder="Describe what you need"
                    rows={4}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
                  />
                </div>
              </div>
            )}

            {err && <div className="mt-4 text-sm text-red-400">{err}</div>}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={submitAction}
                disabled={saving}
                className="flex-1 rounded-2xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
              >
                {saving
                  ? "Please wait..."
                  : mode === "booking"
                  ? "Confirm Booking"
                  : "Send Quote"}
              </button>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white hover:bg-white/10 disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>



  );
}