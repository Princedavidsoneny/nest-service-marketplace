 import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createBooking, createQuote, fetchServices } from "../services";
import {
  dedupeCities,
  formatCategory,
  formatCity,
  formatPrice,
  getServiceImage,
} from "../utils/serviceImages";

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

function friendlyErrorMessage(error, mode = "booking") {
  const raw = String(
    error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      ""
  ).toLowerCase();

  if (
    raw.includes("not null constraint failed") ||
    raw.includes("notifications.body") ||
    raw.includes("notifications.message") ||
    raw.includes("sql")
  ) {
    return "Something went wrong. Please try again.";
  }

  if (raw.includes("missing token") || raw.includes("invalid token")) {
    return "Please log in again and try.";
  }

  if (raw.includes("forbidden")) {
    return "You are not allowed to perform this action.";
  }

  if (raw.includes("service not found")) {
    return "This service is no longer available.";
  }

  if (mode === "booking" && raw.includes("serviceid is required")) {
    return "Could not create booking. Please try again.";
  }

  if (mode === "quote" && raw.includes("service_id required")) {
    return "Could not send quote request. Please try again.";
  }

  return mode === "booking"
    ? "Something went wrong. Please try again."
    : "Could not send quote request. Please try again.";
}

export default function Home() {
  const nav = useNavigate();

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");

  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [toast, setToast] = useState("");

  const [openModal, setOpenModal] = useState(false);
  const [mode, setMode] = useState("booking"); // booking | quote
  const [selected, setSelected] = useState(null);

  const [bookingDate, setBookingDate] = useState("");
  const [bookingNote, setBookingNote] = useState("");

  const [quoteDetails, setQuoteDetails] = useState("");
  const [quoteBudget, setQuoteBudget] = useState("");

  async function loadServices() {
    try {
      setLoading(true);
      setErr("");

      const data = await fetchServices({
        q: q || undefined,
        category: category || undefined,
        city: city || undefined,
      });

      const clean = dedupeById(Array.isArray(data) ? data : []);
      setServices(clean);
    } catch  {
      setErr("Failed to load services.");
      setServices([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = useMemo(() => {
    const set = new Set();
    services.forEach((s) => {
      const value = String(s?.category || "").trim();
      if (value && value.toLowerCase() !== "general") {
        set.add(value);
      }
    });
    return Array.from(set);
  }, [services]);

  const cities = useMemo(() => dedupeCities(services), [services]);

  const stats = {
    total: services.length,
    category: category || "All",
    city: city || "Any",
  };

  function handleSearch(e) {
    e?.preventDefault?.();
    loadServices();
  }

  function handleReset() {
    setQ("");
    setCategory("");
    setCity("");
    setErr("");
    setMsg("");

    setTimeout(() => {
      loadServices();
    }, 0);
  }

  function closeModal() {
    if (saving) return;

    setOpenModal(false);
    setSelected(null);
    setMode("booking");

    setBookingDate("");
    setBookingNote("");
    setQuoteDetails("");
    setQuoteBudget("");

    setErr("");
    setMsg("");
  }

  function openBooking(service) {
    setSelected(service);
    setMode("booking");
    setBookingDate("");
    setBookingNote("");
    setErr("");
    setMsg("");
    setOpenModal(true);
  }

  function openQuote(service) {
    setSelected(service);
    setMode("quote");
    setQuoteDetails("");
    setQuoteBudget("");
    setErr("");
    setMsg("");
    setOpenModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!selected) return;

    try {
      setSaving(true);
      setErr("");
      setMsg("");

      if (mode === "booking") {
        if (!bookingDate.trim()) {
          setErr("Please choose a booking date and time.");
          return;
        }

        await createBooking({
          serviceId: selected.id,
          date: bookingDate,
          note: bookingNote,
        });

        setMsg("Booking confirmed successfully.");
        setToast(`Booking confirmed for ${selected.title}.`);
      } else {
        if (!quoteDetails.trim()) {
          setErr("Please enter quote details.");
          return;
        }

        await createQuote({
          service_id: selected.id,
          details: quoteDetails,
          budget: quoteBudget ? Number(quoteBudget) : undefined,
        });

        setMsg("Quote request sent successfully.");
        setToast(`Quote request sent for ${selected.title}.`);
      }

      setTimeout(() => {
        setToast("");
      }, 2500);

      setTimeout(() => {
        closeModal();
      }, 900);
    } catch (e) {
      setErr(friendlyErrorMessage(e, mode));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {toast ? (
        <div className="fixed right-4 top-4 z-[70] rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-200 shadow-xl backdrop-blur-sm">
          {toast}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div>
          <h1 className="text-3xl font-bold text-white md:text-5xl">
            Book trusted local help with Nest
          </h1>

          <p className="mt-4 max-w-3xl text-base text-slate-300 md:text-xl">
            Discover reliable plumbers, electricians, cleaners, mechanics and
            other professionals near you. Compare services, request quotes, and
            book with confidence.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-400">
                Services
              </div>
              <div className="mt-1 text-3xl font-extrabold text-white">
                {stats.total}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-400">
                Category
              </div>
              <div className="mt-1 text-3xl font-extrabold text-white">
                {stats.category}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-400">
                City
              </div>
              <div className="mt-1 text-3xl font-extrabold text-white">
                {stats.city}
              </div>
            </div>
          </div>
        </div>

        <div className="max-h-[380px] overflow-hidden rounded-[24px] border border-white/10 bg-slate-900 shadow-xl">
          <img
            src="/images/services/handyman.jpg"
            alt="Nest local services"
            className="h-[380px] w-full object-cover"
            onError={(e) => {
              e.currentTarget.src = "/images/services/default.jpg";
            }}
          />
        </div>
      </div>

      <form
        onSubmit={handleSearch}
        className="mt-8 rounded-[32px] border border-white/10 bg-white/5 p-5"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Search
            </label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search service (e.g. plumber, electrician)"
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400/60"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400/60"
            >
              <option value="">All categories</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {formatCategory(item)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              City
            </label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400/60"
            >
              <option value="">City (optional)</option>
              {cities.map((item) => (
                <option key={item} value={item}>
                  {formatCity(item)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-3 font-semibold text-slate-950 transition hover:opacity-90"
          >
            Search
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
          >
            Reset
          </button>
        </div>

        {err ? <p className="mt-4 text-sm text-red-400">{err}</p> : null}
      </form>

      <div className="mt-10">
        <h2 className="text-2xl font-bold text-white">Popular services</h2>
        <p className="mt-2 text-slate-400">
          Browse reliable local providers and book the right person for the job.
        </p>

        {loading ? (
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-300">
            Loading services...
          </div>
        ) : services.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-300">
            No services found.
          </div>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {services.map((s) => (
              <div
                key={s.id}
                className="overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 shadow-lg transition hover:-translate-y-1 hover:shadow-cyan-500/10"
              >
                <div className="h-52 w-full overflow-hidden bg-slate-800">
                  <img
                    src={getServiceImage(s)}
                    alt={s.title || "service"}
                    className="h-full w-full object-cover transition duration-300 hover:scale-105"
                    onError={(e) => {
                      e.currentTarget.src = "/images/services/default.jpg";
                    }}
                  />
                </div>

                <div className="p-5">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-semibold text-white">
                        {s.title || "Untitled service"}
                      </h3>

                      <div className="mt-1 text-sm text-slate-400">
                        {formatCategory(s.category)} • {formatCity(s.city)}
                      </div>
                    </div>

                    <div className="rounded-full bg-cyan-500/15 px-3 py-1 text-sm font-semibold text-cyan-300">
                      {formatPrice(s.priceFrom)}
                    </div>
                  </div>

                  <p className="min-h-[48px] text-sm text-slate-300">
                    {s.description || "Professional local service available."}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => openBooking(s)}
                      className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:opacity-90"
                    >
                      Book
                    </button>

                    <button
                      type="button"
                      onClick={() => openQuote(s)}
                      className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                    >
                      Request Quote
                    </button>

                    <button
                      type="button"
                      onClick={() => nav(`/provider/${s.providerId}`)}
                      className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                    >
                      View Profile
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {openModal && selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[32px] border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <div className="text-sm text-slate-400">
                  {mode === "booking" ? "Create Booking" : "Request Quote"}
                </div>
                <h3 className="text-3xl font-bold text-white">
                  {selected.title}
                </h3>
                <div className="mt-1 text-sm text-slate-400">
                  {formatCategory(selected.category)} • {formatCity(selected.city)}
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-full p-2 text-slate-400 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === "booking" ? (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Booking date
                    </label>
                    <input
                      type="datetime-local"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400/60"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Note
                    </label>
                    <textarea
                      rows="4"
                      value={bookingNote}
                      onChange={(e) => setBookingNote(e.target.value)}
                      placeholder="Add details for the provider"
                      className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400/60"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Quote details
                    </label>
                    <textarea
                      rows="4"
                      value={quoteDetails}
                      onChange={(e) => setQuoteDetails(e.target.value)}
                      placeholder="Describe the work you need done"
                      className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400/60"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Budget
                    </label>
                    <input
                      type="number"
                      value={quoteBudget}
                      onChange={(e) => setQuoteBudget(e.target.value)}
                      placeholder="Optional budget"
                      className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400/60"
                    />
                  </div>
                </>
              )}

              {err ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {err}
                </div>
              ) : null}

              {msg ? (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  {msg}
                </div>
              ) : null}

              <div className="mt-6 flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-3 font-semibold text-slate-950 transition hover:opacity-90 disabled:opacity-60"
                >
                  {saving
                    ? mode === "booking"
                      ? "Confirming..."
                      : "Sending..."
                    : mode === "booking"
                    ? "Confirm Booking"
                    : "Send Quote Request"}
                </button>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}