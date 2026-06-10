import { useEffect, useState } from "react";
import {
  createDemandOffer,
  fetchProviderDemandRequests,
} from "../services";

function money(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "Budget not stated";
  return `₦${n.toLocaleString()}`;
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString();
}

export default function ProviderDemands() {
  const [demands, setDemands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [offers, setOffers] = useState({});

  async function loadDemands() {
    try {
      setLoading(true);
      setError("");
      const data = await fetchProviderDemandRequests();
      setDemands(Array.isArray(data?.demands) ? data.demands : []);
    } catch (err) {
      setError(err.message || "Failed to load service requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDemands();
  }, []);

  function updateOffer(demandId, key, value) {
    setOffers((prev) => ({
      ...prev,
      [demandId]: {
        ...(prev[demandId] || {}),
        [key]: value,
      },
    }));
  }

  async function handleSendOffer(demandId) {
    try {
      setError("");
      setSuccess("");

      const draft = offers[demandId] || {};
      const amount = draft.amount ? Number(draft.amount) : null;
      const message = String(draft.message || "").trim();

      if (draft.amount && (!Number.isFinite(amount) || amount < 0)) {
        setError("Offer amount must be a valid number.");
        return;
      }

      if (!message) {
        setError("Please add a short message for the customer.");
        return;
      }

      setSavingId(demandId);

      await createDemandOffer(demandId, {
        amount,
        message,
      });

      setSuccess("Offer sent successfully.");
      setOffers((prev) => ({
        ...prev,
        [demandId]: { amount: "", message: "" },
      }));

      await loadDemands();
    } catch (err) {
      setError(err.message || "Failed to send offer.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <div className="mb-4 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200">
            Incoming matching jobs
          </div>

          <h1 className="text-4xl font-black tracking-tight text-white">
            Service Requests
          </h1>

          <p className="mt-3 max-w-3xl text-slate-300">
            These are customer requests that match your provider service
            category. Send an offer and wait for the customer to choose a
            provider.
          </p>
        </div>

        {error ? (
          <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mb-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {success}
          </div>
        ) : null}

        <div className="mb-5">
          <button
            type="button"
            onClick={loadDemands}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Refresh Requests
          </button>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-slate-300">
            Loading service requests...
          </div>
        ) : demands.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
            <div className="text-xl font-bold text-white">
              No matching requests yet
            </div>
            <p className="mt-2 text-sm text-slate-400">
              When customers post requests that match your service category,
              they will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {demands.map((demand) => {
              const existingOffer = Array.isArray(demand.offers)
                ? demand.offers[0]
                : null;

              return (
                <div
                  key={demand.id}
                  className="rounded-3xl border border-cyan-400/10 bg-white/5 p-6 shadow-xl backdrop-blur"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-bold text-white">
                        {demand.category}
                      </h2>
                      <p className="mt-1 text-sm text-slate-400">
                        {demand.city || "City not stated"} •{" "}
                        {demand.address || "Address not stated"}
                      </p>
                    </div>

                    <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-sm font-semibold text-cyan-200">
                      {demand.status}
                    </span>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-slate-300">
                    {demand.description}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                      {money(demand.budget)}
                    </span>

                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                      Urgency: {demand.urgency || "normal"}
                    </span>

                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                      {formatDate(demand.createdAt)}
                    </span>
                  </div>

                  {existingOffer ? (
                    <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                      <div className="text-sm font-semibold text-emerald-200">
                        You already sent an offer
                      </div>
                      <p className="mt-1 text-sm text-slate-300">
                        Amount: {money(existingOffer.amount)}
                      </p>
                      {existingOffer.message ? (
                        <p className="mt-1 text-sm text-slate-300">
                          Message: {existingOffer.message}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-slate-400">
                        Status: {existingOffer.status}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                      <h3 className="text-sm font-semibold text-white">
                        Send Offer
                      </h3>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-xs text-slate-400">
                            Your price ₦
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={offers[demand.id]?.amount || ""}
                            onChange={(e) =>
                              updateOffer(demand.id, "amount", e.target.value)
                            }
                            placeholder="e.g. 12000"
                            className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/60"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-xs text-slate-400">
                            Short message
                          </label>
                          <input
                            type="text"
                            value={offers[demand.id]?.message || ""}
                            onChange={(e) =>
                              updateOffer(demand.id, "message", e.target.value)
                            }
                            placeholder="I can come today"
                            className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/60"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSendOffer(demand.id)}
                        disabled={savingId === demand.id}
                        className="mt-4 rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60"
                      >
                        {savingId === demand.id ? "Sending..." : "Send Offer"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}