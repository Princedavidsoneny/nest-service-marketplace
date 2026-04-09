 import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "../services";
import { saveAuth } from "../auth";

function friendlyError(error) {
  const raw = String(error?.message || "").toLowerCase();

  if (raw.includes("email already exists")) {
    return "An account with this email already exists.";
  }

  if (raw.includes("name, email, password, role required")) {
    return "Please complete all required fields.";
  }

  if (raw.includes("role must be customer or provider")) {
    return "Please choose a valid account type.";
  }

  if (raw.includes("failed to fetch") || raw.includes("network")) {
    return "Unable to reach the server. Please check your connection and try again.";
  }

  return "Registration failed. Please try again.";
}

export default function Register() {
  const nav = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("customer");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    const safeName = name.trim();
    const safeEmail = email.trim();
    const safePassword = password.trim();

    if (!safeName || !safeEmail || !safePassword || !role) {
      setErr("Please complete all required fields.");
      return;
    }

    if (safePassword.length < 6) {
      setErr("Password should be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const data = await registerUser({
        name: safeName,
        email: safeEmail,
        password: safePassword,
        role,
      });

      saveAuth(data);
      nav(role === "provider" ? "/provider" : "/", { replace: true });
    } catch (e2) {
      setErr(friendlyError(e2));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-90px)] bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_440px] lg:items-center">
        <div className="hidden rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl lg:block">
          <h1 className="text-4xl font-extrabold tracking-tight text-white">
            Join Nest today
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-300">
            Create an account as a customer to book services, or as a provider to list your business and receive bookings and quote requests.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5">
              <div className="text-sm font-semibold text-white">Customer account</div>
              <p className="mt-2 text-sm text-slate-300">
                Browse trusted local providers, request quotes, make bookings, pay, and leave reviews.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5">
              <div className="text-sm font-semibold text-white">Provider account</div>
              <p className="mt-2 text-sm text-slate-300">
                Create service listings, manage bookings, reply to quote requests, and build your public profile.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-white">Create account</h2>
            <p className="mt-2 text-sm text-slate-400">
              Start using Nest in just a few steps.
            </p>
          </div>

          {err ? (
            <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {err}
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Full name
              </label>
              <input
                className="w-full rounded-2xl border border-gray-700 bg-gray-900 p-3 text-white placeholder-gray-400 outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-500/20"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

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
                autoComplete="new-password"
                className="w-full rounded-2xl border border-gray-700 bg-gray-900 p-3 text-white placeholder-gray-400 outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-500/20"
                placeholder="Choose a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="mt-2 text-xs text-slate-400">
                Use at least 6 characters.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Account type
              </label>
              <select
                className="w-full rounded-2xl border border-gray-700 bg-gray-900 p-3 text-white outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-500/20"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="customer">Customer</option>
                <option value="provider">Provider</option>
              </select>
            </div>

            <button
              className="w-full rounded-2xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-5 text-sm text-slate-400">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-cyan-400 transition hover:text-cyan-300"
            >
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}