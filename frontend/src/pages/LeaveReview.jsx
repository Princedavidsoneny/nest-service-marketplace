 import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createReview, fetchReviewForBooking } from "../services";

function friendlyError(error) {
  const raw = String(error?.message || "").toLowerCase();

  if (raw.includes("review already submitted")) {
    return "You have already submitted a review for this booking.";
  }

  if (raw.includes("only completed bookings")) {
    return "You can only review a booking after it has been completed.";
  }

  if (raw.includes("booking not found")) {
    return "This booking could not be found.";
  }

  if (raw.includes("rating must be 1-5")) {
    return "Rating must be between 1 and 5.";
  }

  return error?.message || "Failed to submit review";
}

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
          setMsg("Review already submitted.");
        }
      } catch (e) {
        if (!mounted) return;

        const raw = String(e?.message || "").toLowerCase();

        if (raw.includes("no review yet") || raw.includes("not found")) {
          setAlreadyReviewed(false);
        } else {
          setErr(friendlyError(e));
        }
      } finally {
        if (mounted) setChecking(false);
      }
    }

    if (bookingId) {
      checkExistingReview();
    } else {
      setChecking(false);
      setErr("Missing booking id.");
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
      setErr("Missing booking id.");
      return;
    }

    if (!rating || Number(rating) < 1 || Number(rating) > 5) {
      setErr("Rating must be between 1 and 5.");
      return;
    }

    try {
      setLoading(true);

      await createReview({
        bookingId: Number(bookingId),
        rating: Number(rating),
        comment: comment.trim(),
      });

      setMsg("Review submitted successfully.");
      setAlreadyReviewed(true);

      setTimeout(() => {
        navigate("/my-bookings");
      }, 900);
    } catch (e2) {
      setErr(friendlyError(e2));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-90px)] bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur">
          <h1 className="text-3xl font-bold text-white">Leave Review</h1>
          <p className="mt-2 text-sm text-slate-300">Booking ID: {bookingId}</p>

          {checking ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-300">
              Checking booking review...
            </div>
          ) : null}

          {err ? (
            <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-red-300">
              {err}
            </div>
          ) : null}

          {msg ? (
            <div className="mt-4 rounded-2xl border border-green-500/20 bg-green-500/10 p-3 text-green-300">
              {msg}
            </div>
          ) : null}

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
    </div>
  );
}