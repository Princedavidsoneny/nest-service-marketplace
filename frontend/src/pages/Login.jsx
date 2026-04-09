 import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { loginUser } from "../services";
import { saveAuth } from "../auth";

function friendlyError(error) {
  const raw = String(error?.message || "").toLowerCase();

  if (raw.includes("invalid login")) {
    return "Incorrect email or password.";
  }

  if (raw.includes("email and password required")) {
    return "Please enter your email and password.";
  }

  if (raw.includes("failed to fetch") || raw.includes("network")) {
    return "Unable to reach the server. Please check your connection and try again.";
  }

  return "Login failed. Please try again.";
}

export default function Login() {
  const nav = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    const safeEmail = email.trim();
    const safePassword = password.trim();

    if (!safeEmail || !safePassword) {
      setErr("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const data = await loginUser({
        email: safeEmail,
        password: safePassword,
      });

      saveAuth(data);

      const fallback =
        data?.user?.role === "provider" ? "/provider" : "/";

      const redirectTo = location.state?.from?.pathname || fallback;
      nav(redirectTo, { replace: true });
    } catch (e2) {
      setErr(friendlyError(e2));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-90px)] bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_420px] lg:items-center">
        <div className="hidden rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl lg:block">
          <h1 className="text-4xl font-extrabold tracking-tight text-white">
            Welcome back to Nest
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-300">
            Log in to manage bookings, review offers, chat with providers, and keep track of your marketplace activity.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-400">
                Customers
              </div>
              <div className="mt-2 text-sm text-slate-300">
                Book trusted local services fast.
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-400">
                Providers
              </div>
              <div className="mt-2 text-sm text-slate-300">
                Manage bookings, quotes, and profile details.
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-400">
                Messaging
              </div>
              <div className="mt-2 text-sm text-slate-300">
                Stay connected with customers and providers.
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-white">Login</h2>
            <p className="mt-2 text-sm text-slate-400">
              Access your Nest account to continue.
            </p>
          </div>

          {err ? (
            <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {err}
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-slate-300">Email</label>
              <input
                type="email"
                autoComplete="email"
                className="w-full rounded-2xl border border-gray-700 bg-gray-900 p-3 text-white placeholder-gray-400 outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-500/20"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Password
              </label>
              <input
                type="password"
                autoComplete="current-password"
                className="w-full rounded-2xl border border-gray-700 bg-gray-900 p-3 text-white placeholder-gray-400 outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-500/20"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              className="w-full rounded-2xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <p className="mt-5 text-sm text-slate-400">
            Don’t have an account?{" "}
            <Link
              to="/register"
              className="font-medium text-cyan-400 transition hover:text-cyan-300"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}