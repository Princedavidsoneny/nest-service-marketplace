 import { useEffect, useState } from "react";
import {
  fetchAdminUsers,
  updateAdminUserRole,
  suspendAdminUser,
  unsuspendAdminUser,
  verifyProviderAdmin,
  unverifyProviderAdmin,
} from "../services";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [loadingId, setLoadingId] = useState(null);

  async function loadUsers() {
    try {
      setErr("");
      const data = await fetchAdminUsers();
      setUsers(Array.isArray(data) ? data : data.users || []);
    } catch (e) {
      setErr(e.message || "Failed to load users");
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function changeRole(userId, role) {
    try {
      setErr("");
      setMsg("");
      setLoadingId(userId);
      await updateAdminUserRole(userId, role);
      setMsg("User role updated successfully.");
      await loadUsers();
    } catch (e) {
      setErr(e.message || "Failed to update role");
    } finally {
      setLoadingId(null);
    }
  }

  async function toggleSuspension(user) {
    try {
      setErr("");
      setMsg("");
      setLoadingId(user.id);

      if (user.isSuspended) {
        await unsuspendAdminUser(user.id);
        setMsg("User unsuspended successfully.");
      } else {
        await suspendAdminUser(user.id);
        setMsg("User suspended successfully.");
      }

      await loadUsers();
    } catch (e) {
      setErr(e.message || "Failed to update suspension status");
    } finally {
      setLoadingId(null);
    }
  }

  async function toggleProviderVerification(user) {
    try {
      setErr("");
      setMsg("");
      setLoadingId(user.id);

      if (user.isProviderVerified) {
        await unverifyProviderAdmin(user.id);
        setMsg("Provider verification removed.");
      } else {
        await verifyProviderAdmin(user.id);
        setMsg("Provider verified successfully.");
      }

      await loadUsers();
    } catch (e) {
      setErr(e.message || "Failed to update provider verification");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 text-white">
      <h1 className="text-4xl font-black">Admin Users</h1>
      <p className="mt-2 text-white/70">
        View users, manage roles, suspend accounts, and verify providers.
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

      <section className="mt-8 overflow-x-auto rounded-3xl border border-white/10 bg-white/5 p-4">
        <table className="w-full min-w-[1150px] text-left">
          <thead>
            <tr className="border-b border-white/10 text-white/60">
              <th className="p-3">ID</th>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
              <th className="p-3">Provider Badge</th>
              <th className="p-3">Change Role</th>
              <th className="p-3">Suspend</th>
              <th className="p-3">Verify</th>
            </tr>
          </thead>

          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-white/10">
                <td className="p-3">{u.id}</td>
                <td className="p-3">{u.name || "No name"}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3 font-bold capitalize">{u.role}</td>

                <td className="p-3">
                  {u.isSuspended ? (
                    <span className="rounded-full bg-red-500/20 px-3 py-1 text-sm text-red-200">
                      Suspended
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-sm text-emerald-200">
                      Active
                    </span>
                  )}
                </td>

                <td className="p-3">
                  {u.role === "provider" ? (
                    u.isProviderVerified ? (
                      <span className="rounded-full bg-sky-500/20 px-3 py-1 text-sm text-sky-200">
                        Verified ✓
                      </span>
                    ) : (
                      <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/60">
                        Not verified
                      </span>
                    )
                  ) : (
                    <span className="text-white/40">N/A</span>
                  )}
                </td>

                <td className="p-3">
                  <select
                    value={u.role}
                    disabled={loadingId === u.id}
                    onChange={(e) => changeRole(u.id, e.target.value)}
                    className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white"
                  >
                    <option value="customer">customer</option>
                    <option value="provider">provider</option>
                    <option value="admin">admin</option>
                  </select>
                </td>

                <td className="p-3">
                  <button
                    type="button"
                    disabled={loadingId === u.id}
                    onClick={() => toggleSuspension(u)}
                    className={`rounded-xl px-4 py-2 text-sm font-bold ${
                      u.isSuspended
                        ? "bg-emerald-500 text-white"
                        : "bg-red-500 text-white"
                    } disabled:opacity-50`}
                  >
                    {loadingId === u.id
                      ? "Wait..."
                      : u.isSuspended
                      ? "Unsuspend"
                      : "Suspend"}
                  </button>
                </td>

                <td className="p-3">
                  {u.role === "provider" ? (
                    <button
                      type="button"
                      disabled={loadingId === u.id}
                      onClick={() => toggleProviderVerification(u)}
                      className={`rounded-xl px-4 py-2 text-sm font-bold ${
                        u.isProviderVerified
                          ? "bg-slate-600 text-white"
                          : "bg-sky-500 text-white"
                      } disabled:opacity-50`}
                    >
                      {loadingId === u.id
                        ? "Wait..."
                        : u.isProviderVerified
                        ? "Remove"
                        : "Verify"}
                    </button>
                  ) : (
                    <span className="text-white/40">N/A</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!users.length && <p className="p-4 text-white/60">No users found.</p>}
      </section>
    </main>
  );
}