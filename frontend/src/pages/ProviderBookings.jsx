 import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchProviderBookings, updateBookingsStatus } from "../services";
import { getUser } from "../auth";

function formatDateValue(value) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function dedupeRows(list = []) {
  const map = new Map();

  for (const item of list) {
    if (!item || item.id == null) continue;
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  }

  return Array.from(map.values());
}

function normalizeBooking(b) {
  return {
    ...b,
    title: b.title || b.serviceTitle || b.service_name || "Service",
    city:
      b.city ||
      b.serviceCity ||
      b.locationCity ||
      b.service?.city ||
      b.customerCity ||
      "N/A",
    displayDate: formatDateValue(
      b.date || b.bookingDate || b.scheduledDate || b.preferredDate || b.createdAt
    ),
  };
}

export default function ProviderBookings() {
  const user = getUser();
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    setErr("");
    setMsg("");

    try {
      const data = await fetchProviderBookings();
      const list = Array.isArray(data) ? data : Array.isArray(data?.rows) ? data.rows : [];
      setRows(dedupeRows(list).map(normalizeBooking));
    } catch (e) {
      setErr(e?.message || "Failed to load provider bookings");
    } finally {
      setLoading(false);
    }
  }

  async function handleStatus(id, status) {
    setLoading(true);
    setErr("");
    setMsg("");

    try {
      await updateBookingsStatus(id, status);

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
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          const status = String(b.status || "").toLowerCase().trim();
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
                    {b.title}
                  </div>

                  <div style={{ marginTop: 6, opacity: 0.85 }}>
                    <span style={{ marginRight: 10 }}>
                      Date: {b.displayDate}
                    </span>
                    <span style={{ marginRight: 10 }}>
                      City: {b.city}
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

                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
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
                      style={{
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: "0",
                        background: "#06b6d4",
                        color: "#fff",
                        cursor: "pointer",
                      }}
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