 import { useEffect, useState } from "react";
import { fetchMyQuotes, acceptOffer } from "../services";

function tone(status) {
  const s = String(status || "").toLowerCase();
  if (s === "accepted") return "bg-green-500/15 text-green-300 border-green-500/30";
  if (s === "rejected") return "bg-red-500/15 text-red-300 border-red-500/30";
  if (s === "offered") return "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";
  return "bg-white/5 text-slate-300 border-white/10";
}

function money(v) {
  const n = Number(v || 0);
  if (!Number.isFinite(n) || n <= 0) return "N/A";
  return `₦${n.toLocaleString()}`;
}

export default function MyQuotes() {
  const [quotes, setQuotes] = useState([]);
  const [offersByQuote, setOffersByQuote] = useState({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    try {
      setLoading(true);
      setErr("");
      setMsg("");

      const data = await fetchMyQuotes();
      const list = Array.isArray(data) ? data : data?.quotes || [];
      setQuotes(list);

      const map = {};
      for (const quote of list) {
        map[quote.id] = Array.isArray(quote.offers) ? quote.offers : [];
      }
      setOffersByQuote(map);
    } catch (e) {
      setErr(e?.message || "Failed to load quotes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAccept(offerId) {
    try {
      setErr("");
      setMsg("");
      await acceptOffer(offerId);
      setMsg("Offer accepted successfully.");
      load();
    } catch (e) {
      setErr(e?.message || "Failed to accept offer");
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white">My Quotes</h1>
            <p className="mt-2 text-slate-300">
              Review provider offers and accept the best one.
            </p>
          </div>

          <button
            type="button"
            onClick={load}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 font-semibold text-white hover:bg-white/10"
          >
            Refresh
          </button>
        </div>

        {err && <div className="mb-4 text-sm text-red-400">{err}</div>}
        {msg && <div className="mb-4 text-sm text-green-400">{msg}</div>}

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-300">
            Loading quotes...
          </div>
        ) : quotes.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-300">
            No quotes yet.
          </div>
        ) : (
          <div className="space-y-6">
            {quotes.map((q) => {
              const offers = offersByQuote[q.id] || [];

              return (
                <div
                  key={q.id}
                  className="rounded-3xl border border-white/10 bg-white/5 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-white">
                        Quote #{q.id}
                      </h2>
                      <div className="mt-2 space-y-1 text-sm text-slate-300">
                        <div>Status: {q.status || "pending"}</div>
                        <div>Details: {q.details || "N/A"}</div>
                        <div>Budget: {money(q.budget)}</div>
                        <div>Created: {q.created_at || "N/A"}</div>
                      </div>
                    </div>

                    <div className={`rounded-full border px-3 py-1 text-sm font-semibold ${tone(q.status)}`}>
                      {q.status || "pending"}
                    </div>
                  </div>

                  <div className="mt-5">
                    <h3 className="mb-3 text-lg font-semibold text-white">Offers</h3>

                    {offers.length === 0 ? (
                      <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 text-slate-300">
                        No offers yet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {offers.map((offer) => (
                          <div
                            key={offer.id}
                            className="rounded-2xl border border-white/10 bg-slate-900/40 p-4"
                          >
                            <div className="grid gap-2 text-sm text-slate-300 md:grid-cols-2">
                              <div>Amount: {money(offer.amount)}</div>
                              <div>Status: {offer.status || "offered"}</div>
                              <div className="md:col-span-2">
                                Message: {offer.message || "No message"}
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-3">
                              {String(offer.status || "").toLowerCase() === "offered" && (
                                <button
                                  type="button"
                                  onClick={() => handleAccept(offer.id)}
                                  className="rounded-2xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-400"
                                >
                                  Accept Offer
                                </button>
                              )}

                              {String(offer.status || "").toLowerCase() === "accepted" && (
                                <div className="rounded-2xl border border-green-500/30 bg-green-500/15 px-4 py-3 font-semibold text-green-300">
                                  Accepted
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
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