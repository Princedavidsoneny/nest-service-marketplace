 import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { acceptOffer, fetchMyQuotes } from "../services";

function money(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "Negotiable";
  return `₦${n.toLocaleString()}`;
}

function badgeClass(status) {
  const s = String(status || "").toLowerCase();

  if (s === "accepted") {
    return "border-green-400/20 bg-green-500/15 text-green-300";
  }

  if (s === "offered") {
    return "border-cyan-400/20 bg-cyan-500/15 text-cyan-300";
  }

  if (s === "rejected") {
    return "border-red-400/20 bg-red-500/15 text-red-300";
  }

  return "border-white/10 bg-white/5 text-slate-300";
}

function formatDateValue(value) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getToken() {
  try {
    const raw = localStorage.getItem("user");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.token) return parsed.token;
    }
  } catch (e) {
    console.error("Failed to read user from localStorage:", e);
  }

  try {
    const token = localStorage.getItem("token");
    if (token) return token;
  } catch (e) {
    console.error("Failed to read token from localStorage:", e);
  }

  return "";
}

async function fetchQuoteOffers(quoteId, token) {
  const base = (
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "http://127.0.0.1:5000"
  ).replace(/\/+$/, "");

  const res = await fetch(`${base}/quotes/${quoteId}/offers`, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const text = await res.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!res.ok) {
    throw new Error(data?.error || data?.message || "Failed to load offers");
  }

  return Array.isArray(data?.offers) ? data.offers : [];
}

function normalizeQuote(q) {
  const status = String(q?.status || "pending").toLowerCase();
  const offers = Array.isArray(q?.offers) ? q.offers : [];
  const offeredCount = offers.filter(
    (offer) => String(offer?.status || "").toLowerCase() === "offered"
  ).length;

  return {
    ...q,
    status,
    offers,
    offeredCount,
    title: q?.title || `Quote #${q?.id || ""}`,
    city: q?.city || "N/A",
    details: q?.details || q?.note || "No details provided",
    createdLabel: formatDateValue(q?.createdAt || q?.created_at),
  };
}

function offerSummaryText(quote) {
  if (quote.status === "accepted") return "Offer accepted";
  if (quote.offeredCount > 0) return `${quote.offeredCount} active offer${quote.offeredCount > 1 ? "s" : ""}`;
  return "Awaiting provider offers";
}

export default function MyQuotes() {
  const navigate = useNavigate();

  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [acceptingId, setAcceptingId] = useState(null);

  async function load() {
    try {
      setLoading(true);
      setErr("");
      setMsg("");

      const token = getToken();
      const data = await fetchMyQuotes();
      const list = Array.isArray(data) ? data : [];

      const quotesWithOffers = await Promise.all(
        list.map(async (q) => {
          try {
            const offers = await fetchQuoteOffers(q.id, token);
            return normalizeQuote({ ...q, offers });
          } catch {
            return normalizeQuote({ ...q, offers: [] });
          }
        })
      );

      setQuotes(quotesWithOffers);
    } catch (e) {
      setErr(e?.message || "Failed to load quotes");
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(""), 2500);
    return () => clearTimeout(t);
  }, [msg]);

  async function handleAccept(offerId) {
    try {
      setMsg("");
      setErr("");
      setAcceptingId(offerId);

      const result = await acceptOffer(offerId);

      setMsg("Offer accepted successfully.");

      if (result?.bookingId) {
        setTimeout(() => {
          navigate("/my-bookings");
        }, 700);
      }

      await load();
    } catch (e) {
      setErr(e?.message || "Failed to accept offer");
    } finally {
      setAcceptingId(null);
    }
  }

  const stats = useMemo(() => {
    const total = quotes.length;
    const offered = quotes.filter(
      (q) => String(q?.status || "").toLowerCase() === "offered"
    ).length;
    const accepted = quotes.filter(
      (q) => String(q?.status || "").toLowerCase() === "accepted"
    ).length;

    return { total, offered, accepted };
  }, [quotes]);

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
        {msg ? (
          <div className="mb-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {msg}
          </div>
        ) : null}

        {err ? (
          <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {err}
          </div>
        ) : null}

        <div className="mb-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">
              My Quotes
            </h1>
            <p className="mt-3 max-w-2xl text-base text-slate-300 md:text-lg">
              Review provider offers, compare prices, and accept the best quote for your job.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Total quotes
                </div>
                <div className="mt-1 text-2xl font-bold text-white">
                  {stats.total}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  With offers
                </div>
                <div className="mt-1 text-2xl font-bold text-white">
                  {stats.offered}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Accepted
                </div>
                <div className="mt-1 text-2xl font-bold text-white">
                  {stats.accepted}
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/40 shadow-2xl">
            <img
              src="/images/hero-handyman.jpg"
              alt="Quotes"
              className="h-full max-h-[320px] w-full object-cover"
              onError={(e) => {
                e.currentTarget.src = "/images/services/default.jpg";
              }}
            />
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="text-sm text-slate-400">
            Compare responses from providers and choose the offer that works best for you.
          </div>

          <button
            type="button"
            onClick={load}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-300">
            Loading quotes...
          </div>
        ) : quotes.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-slate-300">
            <div className="text-lg font-semibold text-white">No quotes yet</div>
            <p className="mt-2 text-sm text-slate-400">
              Request a quote from any service on the home page and provider offers will appear here.
            </p>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="mt-5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-3 font-semibold text-slate-950 transition hover:opacity-90"
            >
              Browse Services
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {quotes.map((q) => {
              const offers = Array.isArray(q.offers) ? q.offers : [];

              return (
                <div
                  key={q.id}
                  className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-2xl font-bold text-white">
                          {q.title}
                        </h2>

                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${badgeClass(
                            q.status
                          )}`}
                        >
                          {q.status || "pending"}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-2 text-sm text-slate-300 md:grid-cols-2">
                        <div>
                          <span className="text-slate-400">Quote ID:</span>{" "}
                          <span className="font-medium text-white">{q.id}</span>
                        </div>

                        <div>
                          <span className="text-slate-400">City:</span>{" "}
                          <span className="font-medium text-white">{q.city}</span>
                        </div>

                        <div>
                          <span className="text-slate-400">Created:</span>{" "}
                          <span className="font-medium text-white">
                            {q.createdLabel}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400">Offers:</span>{" "}
                          <span className="font-medium text-white">
                            {offerSummaryText(q)}
                          </span>
                        </div>

                        <div className="md:col-span-2">
                          <span className="text-slate-400">Details:</span>{" "}
                          <span className="font-medium text-white">
                            {q.details}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h3 className="mb-3 text-lg font-semibold text-white">
                      Offers
                    </h3>

                    {offers.length === 0 ? (
                      <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 text-slate-300">
                        No offers yet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {offers.map((offer) => {
                          const offerStatus = String(
                            offer.status || "offered"
                          ).toLowerCase();
                          const isOfferPending = offerStatus === "offered";

                          return (
                            <div
                              key={offer.id}
                              className="rounded-2xl border border-white/10 bg-slate-900/40 p-4"
                            >
                              <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
                                <div className="space-y-2 text-sm text-slate-300">
                                  <div>
                                    <span className="text-slate-400">Amount:</span>{" "}
                                    <span className="font-semibold text-white">
                                      {money(offer.amount)}
                                    </span>
                                  </div>

                                  <div>
                                    <span className="text-slate-400">Status:</span>{" "}
                                    <span className="font-medium text-white">
                                      {offer.status || "offered"}
                                    </span>
                                  </div>

                                  <div>
                                    <span className="text-slate-400">Message:</span>{" "}
                                    <span className="text-white">
                                      {offer.message || "No message"}
                                    </span>
                                  </div>

                                  {offer.createdAt || offer.created_at ? (
                                    <div>
                                      <span className="text-slate-400">Sent:</span>{" "}
                                      <span className="text-white">
                                        {formatDateValue(
                                          offer.createdAt || offer.created_at
                                        )}
                                      </span>
                                    </div>
                                  ) : null}
                                </div>

                                {isOfferPending ? (
                                  <button
                                    type="button"
                                    onClick={() => handleAccept(offer.id)}
                                    disabled={acceptingId === offer.id}
                                    className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:opacity-90 disabled:opacity-60"
                                  >
                                    {acceptingId === offer.id
                                      ? "Accepting..."
                                      : "Accept Offer"}
                                  </button>
                                ) : (
                                  <div
                                    className={`inline-flex rounded-full border px-3 py-2 text-xs font-semibold ${badgeClass(
                                      offerStatus
                                    )}`}
                                  >
                                    {offer.status || "offered"}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}