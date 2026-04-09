 import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchProviderBookings, updateBookingStatus } from "../services";
import { getUser } from "../auth";

function formatDateValue(value) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function dedupeRows(list = []) {
  const map = new Map();

  for (const item of list) {
    if (!item || item.id == null) continue;
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  }

  return Array.from(map.values());
}

function normalizeBooking(b) {
  const status = String(b?.status || "pending").toLowerCase().trim();
  const paid = Number(b?.paid || 0) === 1;

  return {
    ...b,
    status,
    paid,
    title: b?.title || b?.serviceTitle || b?.service_name || "Service",
    city:
      b?.city ||
      b?.serviceCity ||
      b?.locationCity ||
      b?.service?.city ||
      b?.customerCity ||
      "N/A",
    category: b?.category || b?.serviceCategory || "N/A",
    displayDate: formatDateValue(
      b?.date ||
        b?.bookingDate ||
        b?.scheduledDate ||
        b?.preferredDate ||
        b?.createdAt ||
        b?.created_at
    ),
    amount:
      Number(
        b?.amount || b?.price || b?.price_from || b?.priceFrom || 0
      ) || 0,
  };
}

function badgeTone(status) {
  if (status === "completed") {
    return "border-green-500/30 bg-green-500/15 text-green-300";
  }

  if (status === "accepted") {
    return "border-cyan-500/30 bg-cyan-500/15 text-cyan-300";
  }

  if (status === "rejected") {
    return "border-red-500/30 bg-red-500/15 text-red-300";
  }

  return "border-white/10 bg-white/5 text-slate-300";
}

function readableStatus(status) {
  if (!status) return "Pending";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function money(v) {
  const n = Number(v || 0);
  if (!Number.isFinite(n) || n <= 0) return "N/A";
  return `₦${n.toLocaleString()}`;
}

export default function ProviderBookings() {
  const user = getUser();
  const nav = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    setErr("");
    setMsg("");

    try {
      const data = await fetchProviderBookings();

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.rows)
        ? data.rows
        : Array.isArray(data?.bookings)
        ? data.bookings
        : [];

      setRows(dedupeRows(list).map(normalizeBooking));
    } catch (e) {
      setErr(e?.message || "Failed to load provider bookings");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatus(id, status) {
    setErr("");
    setMsg("");
    setUpdatingId(id);

    try {
      await updateBookingStatus(id, status);

      setRows((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status } : b))
      );

      setMsg(`Booking ${status} successfully.`);
    } catch (e) {
      setErr(e?.message || "Failed to update booking");
    } finally {
      setUpdatingId(null);
    }
  }

  useEffect(() => {
    if (!user) return;
    if (user.role !== "provider") return;
    load();
  }, []);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(""), 2500);
    return () => clearTimeout(t);
  }, [msg]);

  const stats = useMemo(() => {
    const total = rows.length;
    const pending = rows.filter((b) => b.status === "pending").length;
    const accepted = rows.filter((b) => b.status === "accepted").length;
    const completed = rows.filter((b) => b.status === "completed").length;

    return { total, pending, accepted, completed };
  }, [rows]);

  if (!user) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 text-white">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-slate-300">
          Please login as a provider to view bookings.
        </div>
      </div>
    );
  }

  if (user.role !== "provider") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 text-white">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-slate-300">
          Only providers can view provider bookings.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 text-white">
      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">
            Total bookings
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
            Accepted
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{stats.accepted}</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">
            Completed
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{stats.completed}</div>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white">
            Bookings for My Services
          </h1>
          <p className="mt-2 text-slate-300">
            Manage incoming bookings, respond to customers, and mark jobs as completed.
          </p>
        </div>

        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
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

      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-300">
          Loading bookings...
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-slate-300">
          <div className="text-lg font-semibold text-white">No bookings yet</div>
          <p className="mt-2 text-sm text-slate-400">
            Customer bookings for your services will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((b) => {
            const canAcceptReject = b.status === "pending";
            const canComplete = b.status === "accepted";
            const busy = updatingId === b.id;

            return (
              <div
                key={b.id}
                className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-bold text-white">
                        {b.title}
                      </h2>

                      <span
                        className={`rounded-full border px-3 py-1 text-sm font-semibold ${badgeTone(
                          b.status
                        )}`}
                      >
                        {readableStatus(b.status)}
                      </span>

                      {b.paid ? (
                        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-sm font-semibold text-emerald-300">
                          Paid
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 grid gap-2 text-sm text-slate-300 md:grid-cols-2">
                      <div>
                        <span className="text-slate-400">Booking ID:</span>{" "}
                        <span className="font-medium text-white">{b.id}</span>
                      </div>

                      <div>
                        <span className="text-slate-400">Category:</span>{" "}
                        <span className="font-medium text-white">{b.category}</span>
                      </div>

                      <div>
                        <span className="text-slate-400">Date:</span>{" "}
                        <span className="font-medium text-white">{b.displayDate}</span>
                      </div>

                      <div>
                        <span className="text-slate-400">City:</span>{" "}
                        <span className="font-medium text-white">{b.city}</span>
                      </div>

                      <div>
                        <span className="text-slate-400">Amount:</span>{" "}
                        <span className="font-medium text-white">{money(b.amount)}</span>
                      </div>

                      <div>
                        <span className="text-slate-400">Customer ID:</span>{" "}
                        <span className="font-medium text-white">
                          {b.customerId || b.customer_id || "N/A"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
                      <span className="text-slate-400">Note:</span>{" "}
                      {b.note || "No note provided."}
                    </div>

                    {b.status === "pending" ? (
                      <div className="mt-3 text-xs text-slate-400">
                        Accept first before marking this booking as completed.
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-3 lg:max-w-[280px] lg:justify-end">
                    <button
                      type="button"
                      onClick={() => handleStatus(b.id, "accepted")}
                      disabled={!canAcceptReject || busy}
                      className="rounded-2xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-500 disabled:opacity-50"
                    >
                      {busy && canAcceptReject ? "Working..." : "Accept"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStatus(b.id, "rejected")}
                      disabled={!canAcceptReject || busy}
                      className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
                    >
                      {busy && b.status === "pending" ? "Working..." : "Reject"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStatus(b.id, "completed")}
                      disabled={!canComplete || busy}
                      className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
                    >
                      {busy && canComplete ? "Working..." : "Complete"}
                    </button>

                    <button
                      type="button"
                      onClick={() => nav(`/messages/${b.id}`)}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                    >
                      Message
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}