import { useMemo, useState } from "react";
import { createBooking } from "../services";

function toDateTimeLocalValue(input) {
  if (!input) return "";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export default function CreateBookingModal({
  open,
  service,
  onClose,
  onSuccess,
}) {
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [friendlyError, setFriendlyError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const serviceTitle = service?.title || "Service";
  const serviceCategory = service?.category || "General";
  const serviceCity = service?.city || "Location not specified";

  const minDate = useMemo(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  }, []);

  if (!open || !service) return null;

  async function handleSubmit(e) {
    e.preventDefault();

    setFriendlyError("");
    setSuccessMsg("");

    if (!date) {
      setFriendlyError("Please choose a booking date and time.");
      return;
    }

    try {
      setLoading(true);

      const res = await createBooking({
        serviceId: service.id,
        date,
        note,
      });

      const message = `Booking confirmed for ${serviceTitle}.`;
      setSuccessMsg(message);

      if (typeof onSuccess === "function") {
        onSuccess(res, message);
      }

      setTimeout(() => {
        setDate("");
        setNote("");
        setSuccessMsg("");
        onClose?.();
      }, 900);
    } catch (err) {
      console.error(err);
      setFriendlyError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" onClick={loading ? undefined : onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-xl rounded-[28px] border border-white/10 bg-slate-900/95 shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
            <div>
              <div className="text-sm font-medium text-slate-300">Create Booking</div>
              <h2 className="mt-1 text-4xl font-black tracking-tight text-white">
                {serviceTitle}
              </h2>
              <p className="mt-2 text-sm text-slate-300">
                {serviceCategory} • {serviceCity}
              </p>
            </div>

            <button
              type="button"
              onClick={loading ? undefined : onClose}
              className="rounded-full p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">
                Booking date
              </label>
              <input
                type="datetime-local"
                value={toDateTimeLocalValue(date) || date}
                min={minDate}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:bg-white/10"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-200">
                Note
              </label>
              <textarea
                rows={5}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add any helpful details for the provider"
                className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:bg-white/10"
              />
            </div>

            {friendlyError && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {friendlyError}
              </div>
            )}

            {successMsg && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {successMsg}
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={loading ? undefined : onClose}
                disabled={loading}
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex min-w-[180px] items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-3 font-bold text-slate-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Confirming..." : "Confirm Booking"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}