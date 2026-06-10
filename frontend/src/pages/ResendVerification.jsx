import { useState } from "react";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000";

export default function ResendVerification() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `${API_BASE}/auth/resend-verification`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({ email }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Something went wrong"
        );
      }

      setMessage(data.message);
      setEmail("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl">
        <h1 className="mb-2 text-center text-3xl font-black text-cyan-400">
          Resend Verification
        </h1>

        <p className="mb-6 text-center text-slate-400">
          Enter your email to receive a new verification link.
        </p>

        {message && (
          <div className="mb-4 rounded-xl bg-green-500/20 p-3 text-green-300">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl bg-red-500/20 p-3 text-red-300">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            className="w-full rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 outline-none focus:border-cyan-500"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-cyan-500 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
          >
            {loading
              ? "Sending..."
              : "Resend Verification Email"}
          </button>
        </form>
      </div>
    </div>
  );
}