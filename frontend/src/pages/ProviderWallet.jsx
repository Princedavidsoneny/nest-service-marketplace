 import { useEffect, useState } from "react";
import {
  fetchProviderWallet,
  createWithdrawalRequest,
  fetchMyWithdrawals,
} from "../services";

function money(value) {
  return `₦${Number(value || 0).toLocaleString()}`;
}

export default function ProviderWallet() {
  const [wallet, setWallet] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState({
    amount: "",
    accountName: "",
    accountNumber: "",
    bankName: "",
  });

  function updateForm(e) {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }

  async function load() {
    try {
      setErr("");
      setLoading(true);

      const [walletData, withdrawalsData] = await Promise.all([
        fetchProviderWallet(),
        fetchMyWithdrawals(),
      ]);

      setWallet(walletData);
      setWithdrawals(Array.isArray(withdrawalsData) ? withdrawalsData : []);
    } catch (e) {
      setErr(e.message || "Failed to load wallet");
    } finally {
      setLoading(false);
    }
  }

  async function submitWithdrawal(e) {
    e.preventDefault();

    try {
      setErr("");
      setMsg("");
      setSubmitting(true);

      await createWithdrawalRequest({
        amount: Number(form.amount),
        accountName: form.accountName,
        accountNumber: form.accountNumber,
        bankName: form.bankName,
      });

      setMsg("Withdrawal request submitted successfully.");
      setForm({
        amount: "",
        accountName: "",
        accountNumber: "",
        bankName: "",
      });
      setShowForm(false);

      await load();
    } catch (e) {
      setErr(e.message || "Failed to submit withdrawal request");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 text-white">
      <h1 className="text-4xl font-bold">Provider Wallet</h1>
      <p className="mt-2 text-white/70">
        View your released earnings, request withdrawals, and track wallet history.
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
        <p className="mt-8 text-white/70">Loading wallet...</p>
      ) : (
        <>
          <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-white/60">Available Balance</p>

            <h2 className="mt-2 text-5xl font-black text-emerald-300">
              {money(wallet?.balance)}
            </h2>

            <button
              type="button"
              onClick={() => setShowForm((prev) => !prev)}
              className="mt-6 rounded-2xl bg-emerald-400 px-6 py-3 font-bold text-slate-950 hover:bg-emerald-300"
            >
              {showForm ? "Cancel Withdrawal" : "Request Withdrawal"}
            </button>

            {showForm && (
              <form
                onSubmit={submitWithdrawal}
                className="mt-6 grid gap-4 rounded-2xl border border-white/10 bg-slate-950/40 p-5"
              >
                <div>
                  <label className="text-sm text-white/70">Amount</label>
                  <input
                    name="amount"
                    type="number"
                    value={form.amount}
                    onChange={updateForm}
                    placeholder="e.g. 5000"
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm text-white/70">Account Name</label>
                  <input
                    name="accountName"
                    value={form.accountName}
                    onChange={updateForm}
                    placeholder="e.g. Prince Davidson"
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm text-white/70">Account Number</label>
                  <input
                    name="accountNumber"
                    value={form.accountNumber}
                    onChange={updateForm}
                    placeholder="e.g. 1234567890"
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm text-white/70">Bank Name</label>
                  <input
                    name="bankName"
                    value={form.bankName}
                    onChange={updateForm}
                    placeholder="e.g. First City Monument Bank"
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-2xl bg-cyan-400 px-6 py-3 font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
                >
                  {submitting ? "Submitting..." : "Submit Withdrawal Request"}
                </button>
              </form>
            )}
          </section>

          <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-bold">Withdrawal Requests</h2>

            {!withdrawals.length ? (
              <p className="mt-4 text-white/60">No withdrawal requests yet.</p>
            ) : (
              <div className="mt-5 space-y-3">
                {withdrawals.map((w) => (
                  <div
                    key={w.id}
                    className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-bold">{money(w.amount)}</p>
                        <p className="text-sm text-white/60">
                          {w.bankName} • {w.accountNumber}
                        </p>
                        <p className="text-sm text-white/60">{w.accountName}</p>
                        <p className="mt-1 text-xs text-white/40">
                          {w.createdAt ? new Date(w.createdAt).toLocaleString() : ""}
                        </p>
                      </div>

                      <span className="rounded-full border border-white/10 px-3 py-1 text-sm capitalize text-white/80">
                        {w.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-bold">Transactions</h2>

            {!wallet?.transactions?.length ? (
              <p className="mt-4 text-white/60">No wallet transactions yet.</p>
            ) : (
              <div className="mt-5 space-y-3">
                {wallet.transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-bold capitalize">{tx.type}</p>
                        <p className="text-sm text-white/60">
                          {tx.description || "Wallet transaction"}
                        </p>
                        <p className="mt-1 text-xs text-white/40">
                          {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : ""}
                        </p>
                      </div>

                      <p className="text-xl font-black text-emerald-300">
                        {money(tx.amount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}