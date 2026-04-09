 import { useEffect, useMemo, useState } from "react";
import { createQuoteOffer, fetchProviderQuotes } from "../services";
import { getUser } from "../auth";
import { PageTitle, Card, Btn, Badge } from "../components/ui";

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

function toneFor(status) {
  const s = String(status || "").toLowerCase();

  if (s === "accepted") return "green";
  if (s === "rejected") return "red";
  if (s === "offered") return "amber";
  return "slate";
}

function normalizeQuote(q) {
  const status = String(q?.status || "pending").toLowerCase();

  return {
    ...q,
    status,
    title: q?.title || q?.serviceTitle || "Quote Request",
    details: q?.details || "No details provided",
    city: q?.city || "N/A",
    createdLabel: formatDateValue(q?.createdAt || q?.created_at),
  };
}

export default function ProviderQuotes() {
  const user = getUser();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sendingId, setSendingId] = useState(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    setErr("");
    setMsg("");
    setLoading(true);

    try {
      const data = await fetchProviderQuotes();
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.rows)
        ? data.rows
        : [];

      setRows(dedupeById(list).map(normalizeQuote));
    } catch (e) {
      setErr(e?.message || "Failed to load provider quotes");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(""), 2500);
    return () => clearTimeout(t);
  }, [msg]);

  const stats = useMemo(() => {
    const total = rows.length;
    const pending = rows.filter((q) => q.status === "pending").length;
    const offered = rows.filter((q) => q.status === "offered").length;
    const accepted = rows.filter((q) => q.status === "accepted").length;

    return { total, pending, offered, accepted };
  }, [rows]);

  async function handleSendOffer(q) {
    setErr("");
    setMsg("");

    const amountStr = prompt("Offer amount (numbers only, e.g. 15000):");
    if (!amountStr) return;

    const amount = Number(String(amountStr).replace(/,/g, "").trim());

    if (!Number.isFinite(amount) || amount <= 0) {
      setErr("Enter a valid amount.");
      return;
    }

    const message = prompt("Short message to customer (optional):") || "";

    try {
      setSendingId(q.id);
      await createQuoteOffer(q.id, { amount, message });
      setMsg("Offer sent successfully.");
      await load();
    } catch (e) {
      setErr(e?.message || "Failed to send offer");
    } finally {
      setSendingId(null);
    }
  }

  if (!user || user.role !== "provider") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 text-white">
        <PageTitle
          title="Quote Requests"
          subtitle="Login as a provider to view incoming quote requests."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 text-white">
      <PageTitle
        title="Quote Requests"
        subtitle="Review customer requests and send offers with your price."
      />

      <div className="mb-6 mt-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">
            Total requests
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{stats.total}</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">
            Pending
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{stats.pending}</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">
            Offered
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{stats.offered}</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">
            Accepted
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{stats.accepted}</div>
        </div>
      </div>

      {err ? (
        <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      ) : null}

      {msg ? (
        <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {msg}
        </div>
      ) : null}

      <div className="mb-5 flex gap-2">
        <Btn onClick={load} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </Btn>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-300">
          Loading quote requests...
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-slate-300">
          <div className="text-lg font-semibold text-white">
            No quote requests yet
          </div>
          <p className="mt-2 text-sm text-slate-400">
            When customers request quotes for your services, they will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((q) => {
            const disabled =
              sendingId === q.id ||
              q.status === "accepted" ||
              q.status === "rejected";

            return (
              <Card key={q.id}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-xl font-semibold text-white">
                        {q.title}
                      </div>

                      <Badge tone={toneFor(q.status)}>
                        {String(q.status || "pending").toUpperCase()}
                      </Badge>
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
                        <span className="text-slate-400">Customer ID:</span>{" "}
                        <span className="font-medium text-white">
                          {q.customerId || q.customer_id || "N/A"}
                        </span>
                      </div>

                      <div className="md:col-span-2">
                        <span className="text-slate-400">Customer request:</span>{" "}
                        <span className="font-medium text-white">{q.details}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0">
                    <Btn onClick={() => handleSendOffer(q)} disabled={disabled}>
                      {sendingId === q.id ? "Sending..." : "Send Offer"}
                    </Btn>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}