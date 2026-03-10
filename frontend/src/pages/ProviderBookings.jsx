 import { useEffect, useState } from "react";
 import { useNavigate } from "react-router-dom";
import { fetchProviderBookings, updateBookingsStatus } from "../services";
import { getUser } from "../auth";

export default function ProviderBookings() {
  const user = getUser();
   const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  // ---- Load provider bookings ----
  async function load() {
    setLoading(true);
    setErr("");
    setMsg("");
    try {
      const data = await fetchProviderBookings();

      // allow either: array OR { rows: [...] }
      const list = Array.isArray(data) ? data : Array.isArray(data?.rows) ? data.rows : [];
      setRows(list);
    } catch (e) {
      setErr(e?.message || "Failed to load provider bookings");
    } finally {
      setLoading(false);
    }
  }

  // ---- Update booking status ----
  async function handleStatus(id, status) {
    setLoading(true);
    setErr("");
    setMsg("");
    try {
      // ✅ call your services.js PATCH
      await updateBookingsStatus(id, status);

      // ✅ instant UI update (no need to refresh page)
      setRows((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status } : b))
      );

      setMsg(`Booking ${status}`);
    } catch (e) {
      setErr(e?.message || "Failed to update booking");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Guards ----
  if (!user) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
        <div style={{ border: "1px solid #333", borderRadius: 12, padding: 12 }}>
          Please login as a provider to view bookings.
        </div>
      </div>
    );
  }

  if (user.role !== "provider") {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
        <div style={{ border: "1px solid #333", borderRadius: 12, padding: 12 }}>
          Only providers can view Provider Bookings.
        </div>
      </div>
    );
  }

  // ---- UI ----
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h2 style={{ margin: 0 }}>Bookings for My Services</h2>
        <button
          onClick={load}
          disabled={loading}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid #444",
            background: "transparent",
            color: "#fff",
            cursor: "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          Refresh
        </button>
      </div>

      {loading && <p style={{ opacity: 0.8 }}>Loading…</p>}
      {err && <p style={{ color: "#ff6b6b" }}>{err}</p>}
      {msg && <p style={{ color: "#51cf66" }}>{msg}</p>}

      {!loading && rows.length === 0 && <p style={{ opacity: 0.8 }}>No bookings yet.</p>}

      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        {rows.map((b) => {
          const status = (b.status || "").toLowerCase().trim(); // ✅ normalize
          const canAcceptReject = status === "pending";
          const canComplete = status === "accepted";

          return (
            <div
              key={b.id}
              style={{
                border: "1px solid #444",
                borderRadius: 14,
                padding: 14,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>
                    {b.title || b.serviceTitle || "Service"}
                  </div>

                  <div style={{ marginTop: 6, opacity: 0.85 }}>
                    <span style={{ marginRight: 10 }}>
                      Date: {b.date || "N/A"}
                    </span>
                    <span style={{ marginRight: 10 }}>
                      City: {b.city || "N/A"}
                    </span>
                  </div>

                  {b.note && (
                    <div style={{ marginTop: 8 }}>
                      <b>Note:</b> {b.note}
                    </div>
                  )}
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ marginBottom: 10 }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "4px 10px",
                        borderRadius: 999,
                        border: "1px solid #555",
                        fontSize: 12,
                        opacity: 0.9,
                      }}
                    >
                      {status || "unknown"}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button
                      onClick={() => handleStatus(b.id, "accepted")}
                      disabled={!canAcceptReject || loading}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: "0",
                        background: "#2f9e44",
                        color: "#fff",
                        cursor: "pointer",
                        opacity: !canAcceptReject || loading ? 0.5 : 1,
                      }}
                    >
                      Accept
                    </button>

                    <button
                      onClick={() => handleStatus(b.id, "rejected")}
                      disabled={!canAcceptReject || loading}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: "0",
                        background: "#e03131",
                        color: "#fff",
                        cursor: "pointer",
                        opacity: !canAcceptReject || loading ? 0.5 : 1,
                      }}
                    >
                      Reject
                    </button>

                    <button
                      onClick={() => handleStatus(b.id, "completed")}
                      disabled={!canComplete || loading}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: "0",
                        background: "#1c7ed6",
                        color: "#fff",
                        cursor: "pointer",
                        opacity: !canComplete || loading ? 0.5 : 1,
                      }}
                    >
                      Complete
                    </button>

                    <button
  onClick={() => nav(`/messages/${b.id}`)}
  className="bg-cyan-500 text-white px-3 py-1 rounded"
>
  Message
</button>



                  </div>

                  {!canComplete && status === "pending" && (
                    <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
                      Accept first to enable Complete.
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}