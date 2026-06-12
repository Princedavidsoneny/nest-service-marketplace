 import { useEffect, useState } from "react";
import {
  fetchAdminUsers,
  updateAdminUserRole,
  suspendAdminUser,
  unsuspendAdminUser,
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

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 text-white">
      <h1 className="text-4xl font-black">Admin Users</h1>
      <p className="mt-2 text-white/70">
        View users, manage roles, and suspend accounts.
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
        <table className="w-full min-w-[950px] text-left">
          <thead>
            <tr className="border-b border-white/10 text-white/60">
              <th className="p-3">ID</th>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
              <th className="p-3">Change Role</th>
              <th className="p-3">Action</th>
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
                      ? "Please wait..."
                      : u.isSuspended
                      ? "Unsuspend"
                      : "Suspend"}
                  </button>
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