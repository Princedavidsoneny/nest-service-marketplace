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
      setRows(Array.isArray(data) ? data : data?.rows || []);
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
                        {b.category} • {b.city || "N/A"}
                      </div>
                      <div>Booking ID: {b.id}</div>
                      <div>Date: {b.date || "N/A"}</div>
                      <div>Note: {b.note || "N/A"}</div>
                      <div>Starting price: {money(b.price || b.price_from)}</div>
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
                      onClick={() => nav(`/review/${b.id}`)}
                      className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white hover:bg-white/10"
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