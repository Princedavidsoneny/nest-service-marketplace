 import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  fetchServices,
  fetchServiceReviews,
  createBooking,
  createQuote,
} from "../services";

export default function ProviderProfile() {
  const { id } = useParams();
  const nav = useNavigate();

  const [service, setService] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [bookingDate, setBookingDate] = useState("");
  const [bookingNote, setBookingNote] = useState("");
  const [quoteBudget, setQuoteBudget] = useState("");
  const [quoteDetails, setQuoteDetails] = useState("");

  const [showBooking, setShowBooking] = useState(false);
  const [showQuote, setShowQuote] = useState(false);

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
  try {
    setLoading(true);
    setErr("");

    const services = await fetchServices();
    const found = services.find((s) => String(s.id) === String(id));

    if (!found) {
      setErr("Service not found");
      setService(null);
      setReviews([]);
      return;
    }

    setService(found);

    try {
      const r = await fetchServiceReviews(found.id);
      setReviews(Array.isArray(r) ? r : []);
    } catch {
      setReviews([]);
    }
  } catch (e) {
    setErr(e.message || "Failed to load service");
  } finally {
    setLoading(false);
  }
}
  async function handleBooking() {
    try {
      setErr("");
      setMsg("");

      if (!bookingDate.trim()) {
        setErr("Booking date required");
        return;
      }

      await createBooking({
        service_id: service.id,
        date: bookingDate,
        note: bookingNote,
      });

      setMsg("Booking created successfully.");
      setShowBooking(false);
      setBookingDate("");
      setBookingNote("");
    } catch (e) {
      setErr(e.message || "Booking failed");
    }
  }

  async function handleQuote() {
    try {
      setErr("");
      setMsg("");

      if (!quoteDetails.trim()) {
        setErr("Quote details required");
        return;
      }

      await createQuote({
        service_id: service.id,
        budget: quoteBudget,
        details: quoteDetails,
      });

      setMsg("Quote request sent successfully.");
      setShowQuote(false);
      setQuoteBudget("");
      setQuoteDetails("");
    } catch (e) {
      setErr(e.message || "Quote request failed");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        Loading...
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <button onClick={() => nav(-1)} className="mb-6 text-cyan-300">
          ← Back
        </button>
        <div className="text-red-300">{err || "Service not found"}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <button onClick={() => nav(-1)} className="mb-6 text-cyan-300">
          ← Back
        </button>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-3xl font-bold">{service.title}</h1>

          <div className="mt-4 space-y-2 text-slate-300">
            <div><span className="font-semibold text-white">Category:</span> {service.category || "General"}</div>
            <div><span className="font-semibold text-white">City:</span> {service.city || "N/A"}</div>
            <div><span className="font-semibold text-white">Description:</span> {service.description || "No description"}</div>
            <div><span className="font-semibold text-white">Starting Price:</span> ₦{service.price || service.price_from || "N/A"}</div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => {
                setShowBooking(!showBooking);
                setShowQuote(false);
                setErr("");
                setMsg("");
              }}
              className="rounded-xl bg-cyan-500 px-4 py-3 font-medium text-black"
            >
              Book Service
            </button>

            <button
              onClick={() => {
                setShowQuote(!showQuote);
                setShowBooking(false);
                setErr("");
                setMsg("");
              }}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3"
            >
              Request Quote
            </button>
          </div>

          {err && <div className="mt-4 text-red-300">{err}</div>}
          {msg && <div className="mt-4 text-green-300">{msg}</div>}

          {showBooking && (
            <div className="mt-6 rounded-xl border border-white/10 bg-slate-900/60 p-4">
              <h2 className="mb-3 text-lg font-semibold">Create Booking</h2>

              <input
                type="datetime-local"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="mb-3 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white"
              />

              <textarea
                value={bookingNote}
                onChange={(e) => setBookingNote(e.target.value)}
                placeholder="Extra note"
                className="mb-3 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white"
              />

              <button
                onClick={handleBooking}
                className="rounded-xl bg-cyan-500 px-4 py-3 font-medium text-black"
              >
                Confirm Booking
              </button>
            </div>
          )}

          {showQuote && (
            <div className="mt-6 rounded-xl border border-white/10 bg-slate-900/60 p-4">
              <h2 className="mb-3 text-lg font-semibold">Request Quote</h2>

              <input
                type="number"
                value={quoteBudget}
                onChange={(e) => setQuoteBudget(e.target.value)}
                placeholder="Budget"
                className="mb-3 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white"
              />

              <textarea
                value={quoteDetails}
                onChange={(e) => setQuoteDetails(e.target.value)}
                placeholder="Tell provider what you need"
                className="mb-3 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white"
              />

              <button
                onClick={handleQuote}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3"
              >
                Send Quote Request
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-bold">Customer Reviews</h2>

          {reviews.length === 0 ? (
            <div className="mt-4 text-slate-400">No reviews yet.</div>
          ) : (
            <div className="mt-4 space-y-4">
              {reviews.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl border border-white/10 bg-slate-900/60 p-4"
                >
                  <div className="font-semibold text-cyan-300">
                    Rating: {r.rating || "N/A"} / 5
                  </div>
                  <div className="mt-1 text-slate-300">
                    {r.comment || "No comment"}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {r.created_at || ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}