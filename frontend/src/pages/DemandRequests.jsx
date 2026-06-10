import { useEffect, useState } from "react";
import {
  assignDemandProvider,
  createDemandRequest,
  fetchMyDemandRequests,
} from "../services";

const SERVICE_CATEGORIES = [
  "plumber",
  "driver",
  "electrician",
  "cleaner",
  "mechanic",
  "painter",
  "carpenter",
  "generator repair",
  "appliance repair",
  "moving service",
  "labourer",
  "tiler",
  "welder",
  "technician",
  "chef",
  "general",
];

const URGENCY_OPTIONS = ["normal", "urgent", "today", "this week"];

function money(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "Budget not stated";
  return `₦${n.toLocaleString()}`;
}

function formatDate(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "";
  }
}

export default function DemandRequests() {
  const [form, setForm] = useState({
    category: "",
    description: "",
    city: "",
    address: "",
    urgency: "normal",
    budget: "",
  });

  const [demands, setDemands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [assigningProviderId, setAssigningProviderId] = useState(null);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function loadDemands() {
    try {
      setLoading(true);
      setError("");

      const data = await fetchMyDemandRequests();
      setDemands(Array.isArray(data?.demands) ? data.demands : []);
    } catch (err) {
      setError(err.message || "Failed to load demand requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDemands();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setError("");
      setSuccess("");

      const category = form.category.trim().toLowerCase();
      const description = form.description.trim();
      const city = form.city.trim();
      const address = form.address.trim();
      const urgency = form.urgency.trim().toLowerCase();
      const budgetNumber = form.budget ? Number(form.budget) : null;

      if (!category) {
        setError("Please select the service category you need.");
        return;
      }

      if (!description) {
        setError("Please describe the service you need.");
        return;
      }

      if (form.budget && (!Number.isFinite(budgetNumber) || budgetNumber < 0)) {
        setError("Budget must be a valid number.");
        return;
      }

      setSaving(true);

      const result = await createDemandRequest({
        category,
        description,
        city,
        address,
        urgency,
        budget: budgetNumber,
      });

      setSuccess(
        `Request posted successfully. ${result?.notifiedProviders || 0} matching provider(s) notified.`
      );

      setForm({
        category: "",
        description: "",
        city: "",
        address: "",
        urgency: "normal",
        budget: "",
      });

      await loadDemands();
    } catch (err) {
      setError(err.message || "Failed to create demand request.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAssignProvider(demandId, providerId) {
    try {
      setError("");
      setSuccess("");
      setAssigningProviderId(providerId);

      await assignDemandProvider(demandId, providerId);

      setSuccess("Provider assigned successfully.");
      await loadDemands();
    } catch (err) {
      setError(err.message || "Failed to assign provider.");
    } finally {
      setAssigningProviderId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <div className="mb-4 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200">
            Request service from matching providers
          </div>

          <h1 className="text-4xl font-black tracking-tight text-white">
            Request a Service
          </h1>

          <p className="mt-3 max-w-3xl text-slate-300">
            Post what you need once. Matching providers like plumbers, drivers,
            electricians, and cleaners will be notified automatically and can
            send you offers.
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

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-3xl border border-cyan-400/10 bg-white/5 p-6 shadow-xl backdrop-blur">
            <h2 className="text-2xl font-bold text-white">Create Request</h2>

            <p className="mt-1 text-sm text-slate-400">
              Tell providers what you need and where the service is required.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Service category
                </label>

                <select
                  value={form.category}
                  onChange={(e) => updateField("category", e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-white outline-none focus:border-cyan-400/60"
                >
                  <option value="">Select category</option>
                  {SERVICE_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Description
                </label>

                <textarea
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  rows={5}
                  placeholder="e.g. My kitchen pipe is leaking and I need urgent help."
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/60"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    City
                  </label>

                  <input
                    value={form.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    placeholder="e.g. Owerri"
                    className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/60"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Area / Address
                  </label>

                  <input
                    value={form.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    placeholder="e.g. World Bank Area"
                    className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/60"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Urgency
                  </label>

                  <select
                    value={form.urgency}
                    onChange={(e) => updateField("urgency", e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-white outline-none focus:border-cyan-400/60"
                  >
                    {URGENCY_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Budget optional
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={form.budget}
                    onChange={(e) => updateField("budget", e.target.value)}
                    placeholder="e.g. 15000"
                    className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/60"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-2xl bg-cyan-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60"
              >
                {saving ? "Posting Request..." : "Post Request"}
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-cyan-400/10 bg-white/5 p-6 shadow-xl backdrop-blur">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-white">My Requests</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Track posted requests and choose a winning provider.
                </p>
              </div>

              <button
                type="button"
                onClick={loadDemands}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 text-slate-300">
                Loading requests...
              </div>
            ) : demands.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-8 text-center">
                <div className="text-lg font-semibold text-white">
                  No requests yet
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  Post your first service request and matching providers will be
                  notified.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {demands.map((demand) => (
                  <div
                    key={demand.id}
                    className="rounded-3xl border border-white/10 bg-slate-900/50 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-white">
                          {demand.category}
                        </h3>

                        <p className="mt-1 text-sm text-slate-400">
                          {demand.city || "City not stated"} •{" "}
                          {demand.address || "Address not stated"}
                        </p>
                      </div>

                      <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-sm font-semibold text-cyan-200">
                        {demand.status}
                      </div>
                    </div>

                    <p className="mt-3 text-sm text-slate-300">
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

                    {demand.winningProvider ? (
                      <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                        <div className="text-sm font-semibold text-emerald-200">
                          Assigned Provider
                        </div>
                        <p className="mt-1 text-sm text-slate-300">
                          {demand.winningProvider.name} •{" "}
                          {demand.winningProvider.providerTag || "No tag"}
                        </p>
                      </div>
                    ) : null}

                    <div className="mt-5">
                      <h4 className="text-sm font-semibold text-white">
                        Offers ({Array.isArray(demand.offers) ? demand.offers.length : 0})
                      </h4>

                      {!Array.isArray(demand.offers) || demand.offers.length === 0 ? (
                        <p className="mt-2 text-sm text-slate-400">
                          No provider offers yet.
                        </p>
                      ) : (
                        <div className="mt-3 space-y-3">
                          {demand.offers.map((offer) => (
                            <div
                              key={offer.id}
                              className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-white">
                                    {offer.provider?.name || "Provider"}
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    Tag:{" "}
                                    {offer.provider?.providerTag || "Not assigned"}{" "}
                                    • Category:{" "}
                                    {offer.provider?.serviceCategory || "N/A"}
                                  </p>
                                </div>

                                <div className="text-sm font-semibold text-cyan-300">
                                  {money(offer.amount)}
                                </div>
                              </div>

                              {offer.message ? (
                                <p className="mt-2 text-sm text-slate-300">
                                  {offer.message}
                                </p>
                              ) : null}

                              <div className="mt-3 flex flex-wrap items-center gap-3">
                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                                  Status: {offer.status}
                                </span>

                                {demand.status === "open" ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleAssignProvider(
                                        demand.id,
                                        offer.providerId
                                      )
                                    }
                                    disabled={assigningProviderId === offer.providerId}
                                    className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
                                  >
                                    {assigningProviderId === offer.providerId
                                      ? "Assigning..."
                                      : "Choose Provider"}
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}