import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const API = "http://localhost:5000";

export default function PayVerify() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [msg, setMsg] = useState("Verifying payment...");

  useEffect(() => {
    const reference = params.get("reference");
    if (!reference) {
      setMsg("Missing reference.");
      return;
    }

    const token = localStorage.getItem("token");

    fetch(`${API}/payments/verify/${reference}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.status === "success") {
          setMsg("✅ Payment successful! Redirecting...");
          setTimeout(() => navigate("/my-bookings"), 1200);
        } else {
          setMsg("❌ Payment not successful.");
        }
      })
      .catch(() => setMsg("❌ Verify failed."));
  }, [params, navigate]);

  return (
    <div style={{ padding: 20 }}>
      <h2>{msg}</h2>
    </div>
  );
}