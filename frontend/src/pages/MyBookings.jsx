 import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMyBookings } from "../services";

function money(v) {
  const n = Number(v || 0);
  if (!Number.isFinite(n) || n <= 0) return "N/A";
  return `₦${n.toLocaleString()}`;
}

function badgeTone(status) {
  const s = String(status || "").toLowerCase();
  if (s === "completed") return "bg-green-500/15 text-green-300 border-green-500/30";
  if (s === "accepted") return "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";
  if (s === "rejected") return "bg-red-500/15 text-red-300 border-red-500/30";
  return "bg-white/5 text-slate-300 border-white/10";
}

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
  return {
    ...b,
    title: b.title || b.serviceTitle || b.service_name || "Service Booking",
    category: b.category || b.serviceCategory || b.service?.category || "N/A",
    city:
      b.city ||
      b.serviceCity ||
      b.locationCity ||
      b.service?.city ||
      b.providerCity ||
      "N/A",
    displayDate: formatDateValue(
      b.date || b.bookingDate || b.scheduledDate || b.preferredDate || b.createdAt
    ),
    displayPrice: money(b.price || b.price_from || b.amount),
  };
}

export default function MyBookings() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    try {
      setLoading(true);
      setErr("");

      const data = await fetchMyBookings();
      const list = Array.isArray(data) ? data : data?.rows || [];
      const cleaned = dedupeRows(list).map(normalizeBooking);

      setRows(cleaned);
    } catch (e) {
      setErr(e?.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white">My Bookings</h1>
            <p className="mt-2 text-slate-300">
              Track your bookings, chat with providers, pay and leave reviews.
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

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-300">
            Loading bookings...
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-300">
            No bookings yet.
          </div>
        ) : (
          <div className="space-y-5">
            {rows.map((b) => (
              <div
                key={b.id}
                className="rounded-3xl border border-white/10 bg-white/5 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{b.title}</h2>

                    <div className="mt-2 space-y-1 text-sm text-slate-300">
                      <div>
                        {b.category} • {b.city}
                      </div>
                      <div>Booking ID: {b.id}</div>
                      <div>Date: {b.displayDate}</div>
                      <div>Note: {b.note || "N/A"}</div>
                      <div>Starting price: {b.displayPrice}</div>
                    </div>
                  </div>

                  <div className={`rounded-full border px-3 py-1 text-sm font-semibold ${badgeTone(b.status)}`}>
                    {b.status || "pending"}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => nav(`/pay/${b.id}`)}
                    className="rounded-2xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-400"
                  >
                    Pay
                  </button>

                  <button
                    type="button"
                    onClick={() => nav(`/messages/${b.id}`)}
                    className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white hover:bg-white/10"
                  >
                    Message
                  </button>

                  {String(b.status || "").toLowerCase() === "completed" && (
                    <button
                      type="button"
                      onClick={() => nav(`/leave-review/${b.id}`)}
                      className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2 font-semibold text-white hover:bg-white/10"
                    >
                      Leave Review
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}