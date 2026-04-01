 // frontend/src/pages/LeaveReview.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createReview, fetchReviewForBooking } from "../services";

export default function LeaveReview() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkExistingReview() {
      try {
        setChecking(true);
        setErr("");

        const data = await fetchReviewForBooking(bookingId);

        if (!mounted) return;

        if (data && data.id) {
          setAlreadyReviewed(true);
          setRating(Number(data.rating || 5));
          setComment(data.comment || "");
          setMsg("Review already submitted");
        }
      } catch (e) {
        if (!mounted) return;

        // If backend says no review yet, that is fine
        if (
          e.message?.toLowerCase().includes("no review yet") ||
          e.message?.toLowerCase().includes("not found")
        ) {
          setAlreadyReviewed(false);
        } else {
          setErr(e.message || "Failed to check existing review");
        }
      } finally {
        if (mounted) setChecking(false);
      }
    }

    if (bookingId) {
      checkExistingReview();
    } else {
      setChecking(false);
      setErr("Missing booking id");
    }

    return () => {
      mounted = false;
    };
  }, [bookingId]);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setMsg("");

    if (!bookingId) {
      setErr("Missing booking id");
      return;
    }

    if (!rating || Number(rating) < 1 || Number(rating) > 5) {
      setErr("Rating must be between 1 and 5");
      return;
    }

    try {
      setLoading(true);

      await createReview({
        bookingId: Number(bookingId),
        rating: Number(rating),
        comment: comment.trim(),
      });

      setMsg("Review submitted successfully");
      setAlreadyReviewed(true);

      setTimeout(() => {
        navigate("/my-bookings");
      }, 900);
    } catch (e2) {
      setErr(e2.message || "Failed to submit review");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur">
        <h1 className="text-3xl font-bold text-white">Leave Review</h1>
        <p className="mt-2 text-sm text-slate-300">Booking ID: {bookingId}</p>

        {checking && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-300">
            Checking booking review...
          </div>
        )}

        {!!err && (
          <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-red-300">
            {err}
          </div>
        )}

        {!!msg && (
          <div className="mt-4 rounded-2xl border border-green-500/20 bg-green-500/10 p-3 text-green-300">
            {msg}
          </div>
        )}

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Rating (1–5)
            </label>

            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              disabled={checking || loading || alreadyReviewed}
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
            >
              <option value={5}>5 - Excellent</option>
              <option value={4}>4 - Very good</option>
              <option value={3}>3 - Good</option>
              <option value={2}>2 - Fair</option>
              <option value={1}>1 - Poor</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">
              Comment
            </label>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={checking || loading || alreadyReviewed}
              rows={5}
              placeholder="Tell others about the service experience"
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={checking || loading || alreadyReviewed}
              className="rounded-2xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Submitting..." : "Submit Review"}
            </button>

            <button
              type="button"
              onClick={() => navigate("/my-bookings")}
              className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 font-semibold text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}