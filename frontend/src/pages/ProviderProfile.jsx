 import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  fetchProviderProfile,
  fetchServices,
  fetchServiceReviews,
  createBooking,
  createQuote,
} from "../services";
import {
  formatCategory,
  formatCity,
  formatPrice,
  getServiceImage,
} from "../utils/serviceImages";

function getInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "P";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function starText(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "New provider";
  return `${n.toFixed(1)} ★`;
}

function dedupeById(list = []) {
  const map = new Map();
  for (const item of list) {
    if (!item || item.id == null) continue;
    if (!map.has(item.id)) map.set(item.id, item);
  }
  return Array.from(map.values());
}

function friendlyMessage(err, fallback) {
  const raw = String(err?.message || "").toLowerCase();

  if (raw.includes("missing token") || raw.includes("invalid token")) {
    return "Please log in again and try.";
  }

  if (raw.includes("forbidden")) {
    return "You are not allowed to perform this action.";
  }

  if (raw.includes("not found")) {
    return "This provider or service is no longer available.";
  }

  return fallback;
}

function formatReviewDate(value) {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function ProviderProfile() {
  const { id } = useParams();
  const nav = useNavigate();

  const [provider, setProvider] = useState(null);
  const [services, setServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [imageBroken, setImageBroken] = useState(false);

  const [loading, setLoading] = useState(true);
  const [savingBooking, setSavingBooking] = useState(false);
  const [savingQuote, setSavingQuote] = useState(false);

  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [bookingDate, setBookingDate] = useState("");
  const [bookingNote, setBookingNote] = useState("");

  const [quoteBudget, setQuoteBudget] = useState("");
  const [quoteDetails, setQuoteDetails] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setErr("");
        setMsg("");
        setImageBroken(false);

        const [providerData, allServices] = await Promise.all([
          fetchProviderProfile(id),
          fetchServices(),
        ]);

        const mine = dedupeById(
          (Array.isArray(allServices) ? allServices : []).filter(
            (s) => String(s?.providerId) === String(id)
          )
        );

        setProvider(providerData || null);
        setServices(mine);

        if (!mine.length) {
          setSelectedServiceId(null);
          setReviews([]);
          return;
        }

        const firstServiceId = mine[0].id;
        setSelectedServiceId(firstServiceId);

        try {
          const reviewGroups = await Promise.all(
            mine.map(async (service) => {
              try {
                const rows = await fetchServiceReviews(service.id);
                return Array.isArray(rows)
                  ? rows.map((r) => ({
                      ...r,
                      serviceTitle: service.title,
                    }))
                  : [];
              } catch {
                return [];
              }
            })
          );

          const flattened = reviewGroups.flat();
          const sorted = flattened.sort((a, b) => {
            const da = new Date(a.created_at || a.createdAt || 0).getTime();
            const db = new Date(b.created_at || b.createdAt || 0).getTime();
            return db - da;
          });

          setReviews(sorted.slice(0, 8));
        } catch {
          setReviews([]);
        }
      } catch (e) {
        setErr(friendlyMessage(e, "Failed to load provider profile."));
        setProvider(null);
        setServices([]);
        setReviews([]);
      } finally {
        setLoading(false);
      }
    }

    if (id) load();
  }, [id]);

  const selectedService = useMemo(() => {
    return services.find((s) => String(s.id) === String(selectedServiceId)) || null;
  }, [services, selectedServiceId]);

  const providerName = provider?.name || "Provider";
  const providerBio =
    provider?.bio ||
    "Professional local service provider available for bookings and quote requests.";

  const providerImage = provider?.profileImage || "";

  async function handleBooking() {
    if (!selectedService) return;

    try {
      setSavingBooking(true);
      setErr("");
      setMsg("");

      await createBooking({
        serviceId: selectedService.id,
        date: bookingDate || null,
        note: bookingNote || "",
      });

      setMsg(`Booking created successfully for ${selectedService.title}.`);
      setBookingDate("");
      setBookingNote("");
    } catch (e) {
      setErr(friendlyMessage(e, "Booking failed. Please try again."));
    } finally {
      setSavingBooking(false);
    }
  }

  async function handleQuote() {
    if (!selectedService) return;

    try {
      setSavingQuote(true);
      setErr("");
      setMsg("");

      if (!quoteDetails.trim()) {
        setErr("Please describe the work you need.");
        return;
      }

      await createQuote({
        service_id: selectedService.id,
        budget: quoteBudget ? Number(quoteBudget) : undefined,
        details: quoteDetails,
      });

      setMsg(`Quote request sent successfully for ${selectedService.title}.`);
      setQuoteBudget("");
      setQuoteDetails("");
    } catch (e) {
      setErr(friendlyMessage(e, "Quote request failed. Please try again."));
    } finally {
      setSavingQuote(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <div className="mx-auto max-w-6xl rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-300">
          Loading provider profile...
        </div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <div className="mx-auto max-w-6xl rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-red-400">{err || "Provider not found."}</p>
          <button
            type="button"
            onClick={() => nav(-1)}
            className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white hover:bg-white/10"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl">
        <button
          type="button"
          onClick={() => nav(-1)}
          className="mb-6 inline-flex items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
        >
          ← Back
        </button>

        <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 p-4 shadow-xl md:p-6">
          <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left">
                {providerImage && !imageBroken ? (
                  <img
                    src={providerImage}
                    alt={providerName}
                    className="h-24 w-24 rounded-full object-cover ring-4 ring-cyan-500/20"
                    onError={() => setImageBroken(true)}
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-3xl font-black text-slate-950">
                    {getInitials(providerName)}
                  </div>
                )}

                <div className="mt-4 sm:ml-4 sm:mt-0">
                  <h1 className="text-2xl font-extrabold text-white">{providerName}</h1>
                  <p className="mt-1 text-sm text-slate-300">Local service professional</p>
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
                  <div className="text-xs uppercase tracking-wide text-slate-400">Rating</div>
                  <div className="mt-1 text-lg font-bold text-white">
                    {starText(provider.avgRating)}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
                  <div className="text-xs uppercase tracking-wide text-slate-400">Reviews</div>
                  <div className="mt-1 text-lg font-bold text-white">
                    {Number(provider.reviewCount || 0)}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
                  <div className="text-xs uppercase tracking-wide text-slate-400">Email</div>
                  <div className="mt-1 break-all text-sm font-medium text-white">
                    {provider.email || "Not available"}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
                  <div className="text-xs uppercase tracking-wide text-slate-400">
                    Services Listed
                  </div>
                  <div className="mt-1 text-lg font-bold text-white">{services.length}</div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <h2 className="text-3xl font-extrabold text-white">About this provider</h2>
              <p className="mt-3 max-w-3xl text-slate-300">{providerBio}</p>

              <div className="mt-6 flex flex-wrap gap-3">
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
                  Professional services
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
                  Verified marketplace profile
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
                  Easy booking flow
                </div>
              </div>

              {err ? (
                <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {err}
                </div>
              ) : null}

              {msg ? (
                <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  {msg}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-2xl font-semibold text-white">Provider services</h2>

            {!services.length ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/40 p-5 text-slate-300">
                No active services found for this provider yet.
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {services.map((service) => {
                  const active = String(service.id) === String(selectedServiceId);

                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => setSelectedServiceId(service.id)}
                      className={`w-full overflow-hidden rounded-3xl border text-left transition ${
                        active
                          ? "border-cyan-400/50 bg-cyan-500/10"
                          : "border-white/10 bg-slate-900/40 hover:bg-white/5"
                      }`}
                    >
                      <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                        <div className="overflow-hidden bg-slate-800">
                          <img
                            src={getServiceImage(service)}
                            alt={service.title}
                            className="h-40 w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = "/images/services/default.jpg";
                            }}
                          />
                        </div>

                        <div className="p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h3 className="text-xl font-bold text-white">{service.title}</h3>
                              <div className="mt-2 space-y-1 text-sm text-slate-300">
                                <p>Category: {formatCategory(service.category)}</p>
                                <p>City: {formatCity(service.city)}</p>
                                <p>Starting Price: {formatPrice(service.priceFrom)}</p>
                              </div>
                            </div>

                            <div className="rounded-full bg-cyan-500/15 px-3 py-1 text-sm font-semibold text-cyan-300">
                              {active ? "Selected" : "View"}
                            </div>
                          </div>

                          <p className="mt-3 text-sm text-slate-300">
                            {service.description || "No description available."}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            {!selectedService ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-slate-300">
                Select a service to book or request a quote.
              </div>
            ) : (
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
                <img
                  src={getServiceImage(selectedService)}
                  alt={selectedService.title}
                  className="h-64 w-full object-cover md:h-72"
                  onError={(e) => {
                    e.currentTarget.src = "/images/services/default.jpg";
                  }}
                />

                <div className="p-6">
                  <h2 className="text-3xl font-bold text-white">{selectedService.title}</h2>

                  <div className="mt-3 space-y-2 text-slate-300">
                    <p>Category: {formatCategory(selectedService.category)}</p>
                    <p>City: {formatCity(selectedService.city)}</p>
                    <p>Description: {selectedService.description || "No description."}</p>
                    <p>Starting Price: {formatPrice(selectedService.priceFrom)}</p>
                  </div>

                  <div className="mt-6 grid gap-5 lg:grid-cols-2">
                    <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-5">
                      <h3 className="text-xl font-semibold text-white">Book Service</h3>

                      <input
                        type="datetime-local"
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                        className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
                      />

                      <textarea
                        rows={4}
                        value={bookingNote}
                        onChange={(e) => setBookingNote(e.target.value)}
                        placeholder="Optional note"
                        className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
                      />

                      <button
                        type="button"
                        onClick={handleBooking}
                        disabled={savingBooking}
                        className="mt-4 w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-3 font-semibold text-slate-950 disabled:opacity-60"
                      >
                        {savingBooking ? "Booking..." : "Book Service"}
                      </button>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-5">
                      <h3 className="text-xl font-semibold text-white">Request Quote</h3>

                      <input
                        type="number"
                        value={quoteBudget}
                        onChange={(e) => setQuoteBudget(e.target.value)}
                        placeholder="Budget (optional)"
                        className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
                      />

                      <textarea
                        rows={4}
                        value={quoteDetails}
                        onChange={(e) => setQuoteDetails(e.target.value)}
                        placeholder="Describe the work you need"
                        className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none"
                      />

                      <button
                        type="button"
                        onClick={handleQuote}
                        disabled={savingQuote}
                        className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white disabled:opacity-60"
                      >
                        {savingQuote ? "Sending..." : "Request Quote"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-2xl font-semibold text-white">Customer Reviews</h2>

          {reviews.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/40 p-5 text-slate-300">
              No reviews yet.
            </div>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {reviews.map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-white font-semibold">
                      {r.customer_name || r.customerName || "Customer"}
                    </div>
                    <div className="text-cyan-300 font-semibold">{r.rating}/5</div>
                  </div>

                  {r.serviceTitle ? (
                    <div className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                      {r.serviceTitle}
                    </div>
                  ) : null}

                  <p className="mt-3 text-slate-300">
                    {r.comment || "No written review."}
                  </p>

                  <div className="mt-3 text-xs text-slate-500">
                    {formatReviewDate(r.created_at || r.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}