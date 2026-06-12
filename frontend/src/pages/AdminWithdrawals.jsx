import { useEffect, useState } from "react";
import {
  fetchAdminWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
} from "../services";

function money(value) {
  return `₦${Number(value || 0).toLocaleString()}`;
}

export default function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    try {
      setErr("");
      setLoading(true);
      const data = await fetchAdminWithdrawals();
      setWithdrawals(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e.message || "Failed to load withdrawals");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id) {
    try {
      setErr("");
      setMsg("");
      setBusyId(id);
      await approveWithdrawal(id);
      setMsg("Withdrawal approved successfully.");
      await load();
    } catch (e) {
      setErr(e.message || "Failed to approve withdrawal");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id) {
    try {
      setErr("");
      setMsg("");
      setBusyId(id);
      await rejectWithdrawal(id);
      setMsg("Withdrawal rejected successfully.");
      await load();
    } catch (e) {
      setErr(e.message || "Failed to reject withdrawal");
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 text-white">
      <h1 className="text-4xl font-bold">Admin Withdrawals</h1>
      <p className="mt-2 text-white/70">
        Review provider withdrawal requests and approve or reject them.
      </p>

      {err && (
        <div className="mt-6 rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-red-200">
          {err}
        </div>
      )}

      {msg && (
        <div className="mt-6 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-4 text-emerald-200">
          {msg}
        </div>
      )}

      {loading ? (
        <p className="mt-8 text-white/70">Loading withdrawals...</p>
      ) : !withdrawals.length ? (
        <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 text-white/60">
          No withdrawal requests yet.
        </div>
      ) : (
        <section className="mt-8 space-y-4">
          {withdrawals.map((w) => (
            <div
              key={w.id}
              className="rounded-3xl border border-white/10 bg-white/5 p-6"
            >
              <div className="flex flex-col justify-between gap-5 md:flex-row">
                <div>
                  <h2 className="text-2xl font-black">{money(w.amount)}</h2>

                  <p className="mt-2 text-white/70">
                    Provider:{" "}
                    <span className="font-bold text-white">
                      {w.provider?.name || w.providerName || "Provider"}
                    </span>
                  </p>

                  <p className="text-white/70">
                    Email: {w.provider?.email || w.providerEmail || "N/A"}
                  </p>

                  <p className="mt-3 text-white/70">
                    Account Name:{" "}
                    <span className="font-bold text-white">{w.accountName}</span>
                  </p>

                  <p className="text-white/70">
                    Account Number:{" "}
                    <span className="font-bold text-white">
                      {w.accountNumber}
                    </span>
                  </p>

                  <p className="text-white/70">
                    Bank:{" "}
                    <span className="font-bold text-white">{w.bankName}</span>
                  </p>

                  <p className="mt-2 text-sm text-white/40">
                    Requested:{" "}
                    {w.createdAt ? new Date(w.createdAt).toLocaleString() : ""}
                  </p>
                </div>

                <div className="flex flex-col items-start gap-3 md:items-end">
                  <span className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold capitalize text-white/80">
                    {w.status}
                  </span>

                  {w.status === "pending" && (
                    <div className="flex gap-3">
                      <button
                        type="button"
                        disabled={busyId === w.id}
                        onClick={() => handleApprove(w.id)}
                        className="rounded-2xl bg-emerald-400 px-5 py-3 font-bold text-slate-950 hover:bg-emerald-300 disabled:opacity-60"
                      >
                        {busyId === w.id ? "Working..." : "Approve"}
                      </button>

                      <button
                        type="button"
                        disabled={busyId === w.id}
                        onClick={() => handleReject(w.id)}
                        className="rounded-2xl bg-red-400 px-5 py-3 font-bold text-slate-950 hover:bg-red-300 disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}