 import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchMyBookings,
  initPayment,
  confirmBookingCompleted,
} from "../services";

function money(v) {
  const n = Number(v || 0);
  if (!Number.isFinite(n) || n <= 0) return "N/A";
  return `₦${n.toLocaleString()}`;
}

function badgeTone(status) {
  const s = String(status || "").toLowerCase();

  if (s === "completed") return "border-green-500/30 bg-green-500/15 text-green-300";
  if (s === "accepted") return "border-cyan-500/30 bg-cyan-500/15 text-cyan-300";
  if (s === "rejected") return "border-red-500/30 bg-red-500/15 text-red-300";

  return "border-white/10 bg-white/5 text-slate-300";
}

function escrowTone(status) {
  const s = String(status || "").toLowerCase();

  if (s === "held") return "border-yellow-500/30 bg-yellow-500/15 text-yellow-300";
  if (s === "released") return "border-emerald-500/30 bg-emerald-500/15 text-emerald-300";
  if (s === "waiting_customer_confirmation") {
    return "border-blue-500/30 bg-blue-500/15 text-blue-300";
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

function dedupeRows(list = []) {
  const map = new Map();

  for (const item of list) {
    if (!item || item.id == null) continue;
    if (!map.has(item.id)) map.set(item.id, item);
  }

  return Array.from(map.values());
}

function normalizeBooking(b) {
  const status = String(b?.status || "pending").toLowerCase();
  const escrowStatus = String(b?.escrowStatus || "unpaid").toLowerCase();
  const paid = b?.paid === true || Number(b?.paid || 0) === 1;
  const amount = Number(b?.amount || b?.price || b?.price_from || b?.priceFrom || 0);

  return {
    ...b,
    status,
    escrowStatus,
    paid,
    amount,
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
    displayPrice: money(amount),
    canPay: !paid && amount > 0 && ["accepted", "pending"].includes(status),
    canConfirmWork:
      paid &&
      (escrowStatus === "held" || escrowStatus === "waiting_customer_confirmation") &&
      escrowStatus !== "released",
    canReview:
      status === "completed" &&
      escrowStatus === "released" &&
      Number(b?.reviewSubmitted || 0) !== 1,
  };
}

function readableStatus(status) {
  const s = String(status || "").toLowerCase();
  if (!s) return "Pending";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function readableEscrow(status) {
  const s = String(status || "unpaid").toLowerCase();

  if (s === "waiting_customer_confirmation") return "Waiting for your confirmation";
  if (s === "held") return "Payment held by Nest";
  if (s === "released") return "Payment released";
  if (s === "unpaid") return "Unpaid";

  return s.charAt(0).toUpperCase() + s.slice(1);
}

function bookingSummary(status, paid, escrowStatus) {
  if (status === "completed" && escrowStatus === "released") {
    return "Completed and payment released";
  }

  if (status === "completed" && escrowStatus === "waiting_customer_confirmation") {
    return "Provider says work is completed. Please confirm.";
  }

  if (escrowStatus === "held") return "Accepted and payment secured";
  if (status === "completed" && paid) return "Completed and paid";
  if (status === "completed") return "Completed";
  if (status === "accepted" && paid) return "Accepted and paid";
  if (status === "accepted") return "Accepted by provider";
  if (status === "rejected") return "Rejected by provider";

  return "Awaiting provider response";
}

export default function MyBookings() {
  const nav = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [payingId, setPayingId] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");

  async function load() {
    try {
      setLoading(true);
      setErr("");

      const data = await fetchMyBookings();
      const list = Array.isArray(data) ? data : data?.rows || [];
      setRows(dedupeRows(list).map(normalizeBooking));
    } catch (e) {
      setErr(e?.message || "Failed to load bookings");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!toast) return;

    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((b) =>
      ["pending", "accepted"].includes(String(b.status))
    ).length;
    const completed = rows.filter((b) => String(b.status) === "completed").length;

    return { total, active, completed };
  }, [rows]);

  async function handlePay(booking) {
    try {
      setPayingId(booking.id);
      setErr("");

      const data = await initPayment(booking.id);
      const paymentUrl = data?.authorization_url;

      if (!paymentUrl) {
        throw new Error("Payment link not available");
      }

      window.location.href = paymentUrl;
    } catch (e) {
      setErr(e?.message || "Failed to start payment");
    } finally {
      setPayingId(null);
    }
  }

  async function handleConfirmWorkDone(booking) {
    try {
      setErr("");
      setConfirmingId(booking.id);

      const data = await confirmBookingCompleted(booking.id);

      setToast(data?.message || "Work confirmed and payment released.");
      await load();
    } catch (e) {
      setErr(e?.message || "Failed to confirm work done");
    } finally {
      setConfirmingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      {toast ? (
        <div className="fixed right-4 top-4 z-[70] rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-200 shadow-xl backdrop-blur-sm">
          {toast}
        </div>
      ) : null}

      <div className="mx-auto max-w-6xl">
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs uppercase tracking-wide text-slate-400">
              Total bookings
            </div>
            <div className="mt-2 text-3xl font-extrabold text-white">
              {stats.total}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs uppercase tracking-wide text-slate-400">
              Active
            </div>
            <div className="mt-2 text-3xl font-extrabold text-white">
              {stats.active}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs uppercase tracking-wide text-slate-400">
              Completed
            </div>
            <div className="mt-2 text-3xl font-extrabold text-white">
              {stats.completed}
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-white">My Bookings</h1>
            <p className="mt-2 text-slate-300">
              Track booking progress, pay securely, confirm completed work, chat
              with providers, and leave reviews.
            </p>
          </div>

          <button
            type="button"
            onClick={load}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 font-semibold text-white transition hover:bg-white/10"
          >
            Refresh
          </button>
        </div>

        {err ? (
          <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {err}
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
              Browse available services on the home page or create a service
              request.
            </p>
            <button
              type="button"
              onClick={() => nav("/")}
              className="mt-5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-3 font-semibold text-slate-950 transition hover:opacity-90"
            >
              Explore Services
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {rows.map((b) => (
              <div
                key={b.id}
                className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-bold text-white">{b.title}</h2>

                      <div
                        className={`rounded-full border px-3 py-1 text-sm font-semibold ${badgeTone(
                          b.status
                        )}`}
                      >
                        {readableStatus(b.status)}
                      </div>

                      <div
                        className={`rounded-full border px-3 py-1 text-sm font-semibold ${escrowTone(
                          b.escrowStatus
                        )}`}
                      >
                        {readableEscrow(b.escrowStatus)}
                      </div>

                      {b.paid ? (
                        <div className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-sm font-semibold text-emerald-300">
                          Paid
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-3 grid gap-2 text-sm text-slate-300 md:grid-cols-2">
                      <div>
                        <span className="text-slate-400">Category:</span>{" "}
                        {b.category}
                      </div>
                      <div>
                        <span className="text-slate-400">City:</span> {b.city}
                      </div>
                      <div>
                        <span className="text-slate-400">Booking ID:</span> {b.id}
                      </div>
                      <div>
                        <span className="text-slate-400">Date:</span>{" "}
                        {b.displayDate}
                      </div>
                      <div>
                        <span className="text-slate-400">Amount:</span>{" "}
                        {b.displayPrice}
                      </div>
                      <div>
                        <span className="text-slate-400">Summary:</span>{" "}
                        {bookingSummary(b.status, b.paid, b.escrowStatus)}
                      </div>
                    </div>

                    {b.address ? (
                      <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
                        <span className="text-slate-400">Address:</span>{" "}
                        {b.address}
                      </div>
                    ) : null}

                    <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
                      <span className="text-slate-400">Note:</span>{" "}
                      {b.description || b.note || "No note provided."}
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  {b.canPay ? (
                    <button
                      type="button"
                      onClick={() => handlePay(b)}
                      disabled={payingId === b.id}
                      className="rounded-2xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60"
                    >
                      {payingId === b.id ? "Starting payment..." : "Pay"}
                    </button>
                  ) : null}

                  {b.canConfirmWork ? (
                    <button
                      type="button"
                      onClick={() => handleConfirmWorkDone(b)}
                      disabled={confirmingId === b.id}
                      className="rounded-2xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
                    >
                      {confirmingId === b.id
                        ? "Confirming..."
                        : "Confirm Work Done"}
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => nav(`/messages/${b.id}`)}
                    className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
                  >
                    Message
                  </button>

                  {b.canReview ? (
                    <button
                      type="button"
                      onClick={() => nav(`/leave-review/${b.id}`)}
                      className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
                    >
                      Leave Review
                    </button>
                  ) : null}

                  {b.providerId ? (
                    <button
                      type="button"
                      onClick={() => nav(`/provider/${b.providerId}`)}
                      className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
                    >
                      View Provider
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}