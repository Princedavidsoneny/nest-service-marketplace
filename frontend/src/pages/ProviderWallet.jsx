import { useEffect, useState } from "react";
import { fetchProviderWallet } from "../services";

function money(value) {
  return `₦${Number(value || 0).toLocaleString()}`;
}

export default function ProviderWallet() {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    try {
      setErr("");
      setLoading(true);
      const data = await fetchProviderWallet();
      setWallet(data);
    } catch (e) {
      setErr(e.message || "Failed to load wallet");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 text-white">
      <h1 className="text-4xl font-bold">Provider Wallet</h1>
      <p className="mt-2 text-white/70">
        View your released earnings and wallet transaction history.
      </p>

      {err && (
        <div className="mt-6 rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-red-200">
          {err}
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
              disabled
              className="mt-6 rounded-2xl bg-emerald-400/40 px-6 py-3 font-bold text-slate-950 opacity-60"
            >
              Withdraw Coming Soon
            </button>
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
                          {tx.createdAt
                            ? new Date(tx.createdAt).toLocaleString()
                            : ""}
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