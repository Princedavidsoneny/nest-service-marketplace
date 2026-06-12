import { useEffect, useState } from "react";
import { fetchAdminStats } from "../services";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await fetchAdminStats();
        setStats(data);
      } catch (e) {
        setErr(e.message || "Failed to load admin stats");
      }
    }

    loadStats();
  }, []);

  const cards = [
    ["Total Users", stats?.totalUsers ?? 0],
    ["Total Providers", stats?.totalProviders ?? 0],
    ["Total Bookings", stats?.totalBookings ?? 0],
    ["Total Revenue", `₦${(stats?.totalRevenue ?? 0).toLocaleString()}`],
    ["Total Withdrawals", `₦${(stats?.totalWithdrawals ?? 0).toLocaleString()}`],
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 text-white">
      <h1 className="text-4xl font-black">Admin Dashboard</h1>
      <p className="mt-2 text-white/70">
        Overview of platform users, bookings, payments, and withdrawals.
      </p>

      {err && (
        <div className="mt-6 rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-red-200">
          {err}
        </div>
      )}

      <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map(([label, value]) => (
          <div
            key={label}
            className="rounded-3xl border border-white/10 bg-white/5 p-6"
          >
            <p className="text-sm text-white/60">{label}</p>
            <h2 className="mt-3 text-3xl font-black">{value}</h2>
          </div>
        ))}
      </section>
    </main>
  );
}