 import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
).replace(/\/+$/, "");

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const hasVerified = useRef(false);

  const token = useMemo(() => {
    return String(params.get("token") || "").trim();
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (hasVerified.current) return;
    hasVerified.current = true;

    async function verify() {
      try {
        if (!token) {
          setSuccess(false);
          setMessage("Verification token missing.");
          return;
        }

        const response = await fetch(
          `${API_BASE}/auth/verify-email?token=${encodeURIComponent(token)}`
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.error || "Verification failed.");
        }

        setSuccess(true);
        setMessage(data.message || "Email verified successfully.");
      } catch (error) {
        setSuccess(false);
        setMessage(error.message || "Verification failed.");
      } finally {
        setLoading(false);
      }
    }

    verify();
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/80 p-8 text-center shadow-2xl">
        <h1 className="text-4xl font-black text-cyan-400">Nest</h1>
        <p className="mt-2 text-sm uppercase tracking-[0.3em] text-slate-400">
          Local Services
        </p>

        {loading ? (
          <div className="mt-8 space-y-4">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
            <p className="text-slate-300">Verifying your email...</p>
          </div>
        ) : success ? (
          <div className="mt-8 space-y-5">
            <div className="text-6xl">✅</div>
            <h2 className="text-2xl font-bold text-emerald-400">
              Email verified
            </h2>
            <p className="text-slate-300">{message}</p>
            <Link
              to="/login"
              className="inline-flex rounded-2xl bg-cyan-500 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-400"
            >
              Go to Login
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-5">
            <div className="text-6xl">❌</div>
            <h2 className="text-2xl font-bold text-red-400">
              Verification failed
            </h2>
            <p className="text-slate-300">{message}</p>
            <Link
              to="/register"
              className="inline-flex rounded-2xl bg-white/10 px-6 py-3 font-semibold text-white hover:bg-white/20"
            >
              Back to Register
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}