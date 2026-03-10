 // src/pages/LeaveReview.jsx
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createReview } from "../services";

export default function LeaveReview() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setMsg("");

    if (!bookingId) return setErr("Missing booking id");
    if (!rating || rating < 1 || rating > 5) return setErr("Rating must be 1 to 5");

    try {
      setLoading(true);
      await createReview({
        bookingId: Number(bookingId),
        rating: Number(rating),
        comment,
      });
      setMsg("Review submitted ✅");
      setTimeout(() => navigate("/my-bookings"), 800);
    } catch (e2) {
      setErr(e2?.message || "Failed to submit review");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-xl font-semibold">Leave Review</h1>
      <p className="opacity-70 text-sm mt-1">Booking ID: {bookingId}</p>

      {err && <div className="bg-red-100 text-red-700 p-2 rounded mt-3">{err}</div>}
      {msg && <div className="bg-green-100 text-green-700 p-2 rounded mt-3">{msg}</div>}

      <form onSubmit={submit} className="mt-4 space-y-3">
        <div>
          <label className="block text-sm mb-1">Rating (1–5)</label>
          <select
            className="border rounded p-2 w-full bg-transparent"
            value={rating}
            onChange={(e) => setRating(e.target.value)}
          >
            {[1,2,3,4,5].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Comment (optional)</label>
          <textarea
            className="border rounded p-2 w-full bg-transparent"
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="How was the service?"
          />
        </div>

        <button
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
        >
          {loading ? "Submitting..." : "Submit Review"}
        </button>
      </form>
    </div>
  );
}