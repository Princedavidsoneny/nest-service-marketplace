 // frontend/src/pages/MyBookings.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMyBookings, initPayment } from "../services";
import { Container, Card, Badge, Btn, PageTitle } from "../components/ui";
import { getUser } from "../auth";

function fmtMoney(n, currency = "NGN") {
  if (n === null || n === undefined) return "";
  const num = Number(n);
  if (Number.isNaN(num)) return String(n);
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(num);
  } catch {
    return `${currency} ${num}`;
  }
}

export default function MyBookings() {
  const nav = useNavigate();
  const user = getUser();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Simple “logged in?” guard
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!user || !token) nav("/login");
  }, [user, nav]);

  async function load() {
    try {
      setErr("");
      setLoading(true);
      const data = await fetchMyBookings(); // should return array
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // optional: auto refresh every 6s
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePay(bookingId) {
    try {
      setErr("");
      // IMPORTANT: use services.js wrapper, not hardcoded fetch
      const p = await initPayment({ bookingId: Number(bookingId) });

      if (p?.alreadyPaid) {
        alert("Already paid");
        return;
      }
      if (!p?.reference) {
        alert(p?.error || "Payment init failed");
        return;
      }

      // Paystack hosted page shortcut (your current method)
      window.location.href = `https://checkout.paystack.com/${p.reference}`;
    } catch (e) {
      alert(e?.message || "Payment init failed");
    }
  }

  const sorted = useMemo(() => {
    // newest first if created_at exists
    const copy = [...rows];
    copy.sort((a, b) => {
      const da = new Date(a.created_at || a.date || 0).getTime();
      const db = new Date(b.created_at || b.date || 0).getTime();
      return db - da;
    });
    return copy;
  }, [rows]);

  return (
    <Container>
      <PageTitle>My Bookings</PageTitle>

      {err ? <div style={{ color: "tomato", marginBottom: 12 }}>{err}</div> : null}
      {loading ? <div style={{ opacity: 0.8, marginBottom: 12 }}>Loading…</div> : null}

      {sorted.length === 0 ? (
        <Card>
          <div style={{ padding: 14, opacity: 0.8 }}>
            No bookings yet.
          </div>
        </Card>
      ) : (
        sorted.map((b) => {
          const status = (b.status || "").toLowerCase();
          const isCompleted = status === "completed";
          const isPending = status === "pending";
          const isAccepted = status === "accepted";

          // Only allow review when completed AND not already reviewed
          // Your backend reviews table uses booking_id UNIQUE, so we rely on reviewId if API sends it.
          const canReview = isCompleted && !b.reviewId;

          // Message button should work once booking has provider assigned
          // If your API returns provider_id/customer_id
          const canMessage = !!b.provider_id || !!b.providerId; // support either name

          return (
            <Card key={b.id} style={{ marginBottom: 12 }}>
              <div style={{ padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>
                      {b.title || b.service_title || "Booking"}
                    </div>

                    <div style={{ opacity: 0.8, fontSize: 13, marginTop: 2 }}>
                      {b.category ? `${b.category}` : null}
                      {b.city ? ` • ${b.city}` : null}
                      {b.price ? ` • ${fmtMoney(b.price)}` : null}
                      {b.amount ? ` • Amount: ${fmtMoney(b.amount)}` : null}
                    </div>

                    <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>
                      <div>Booking ID: {b.id}</div>
                      <div>Date: {b.date || "N/A"}</div>
                      {b.note ? <div>Note: {b.note}</div> : null}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <Badge>
                      {status || "unknown"}
                    </Badge>
                    <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
                      {b.source ? `source: ${b.source}` : null}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                  {/* PAY: allow pay when pending/accepted/completed but not paid */}
                  <Btn onClick={() => handlePay(b.id)}>
                    Pay
                  </Btn>

                  <Btn
                    variant="secondary"
                    onClick={() => nav(`/messages/${b.id}`)}
                    disabled={!canMessage}
                    title={!canMessage ? "No provider assigned yet" : ""}
                  >
                    Message
                  </Btn>

                  {canReview ? (
                    <Btn variant="secondary" onClick={() => nav(`/leave-review/${b.id}`)}>
                      Leave Review
                    </Btn>
                  ) : b.reviewId ? (
                    <span style={{ fontSize: 13, opacity: 0.75, alignSelf: "center" }}>
                      Reviewed
                    </span>
                  ) : null}
                </div>
              </div>
            </Card>
          );
        })
      )}
    </Container>
  );
}