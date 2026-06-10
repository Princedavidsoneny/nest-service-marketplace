 import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { initPayment, verifyPayment } from "../services";

export default function PayVerify() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [msg, setMsg] = useState("Preparing secure payment...");
  const [err, setErr] = useState("");

  useEffect(() => {
    async function handlePayment() {
      try {
        setErr("");

        const reference =
          searchParams.get("reference") ||
          searchParams.get("trxref") ||
          searchParams.get("reference[]");

        // STEP 1: Paystack has redirected back, so verify payment
        if (reference) {
          setMsg("Verifying payment...");

          const res = await verifyPayment(reference);

          if (res?.status === "success" || res?.escrowStatus === "held") {
            setMsg("Payment successful. Money is now held safely by Nest.");

            setTimeout(() => {
              navigate("/my-bookings");
            }, 1500);

            return;
          }

          setErr("Payment was not successful. Please try again.");
          return;
        }

        // STEP 2: No reference yet, so start payment
        if (!id) {
          setErr("Booking ID is missing.");
          return;
        }

        const res = await initPayment(id);

        if (res?.alreadyPaid) {
          setMsg("This booking has already been paid.");

          setTimeout(() => {
            navigate("/my-bookings");
          }, 1500);

          return;
        }

        if (res?.authorization_url) {
          window.location.assign(res.authorization_url);
          return;
        }

        setErr("Payment link was not returned.");
      } catch (e) {
        console.error("Payment error:", e);
        setErr(e?.message || "Failed to process payment");
      }
    }

    handlePayment();
  }, [id, searchParams, navigate]);

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-bold">Payment</h1>

        {msg ? <p className="mt-4 text-slate-300">{msg}</p> : null}

        {err ? <p className="mt-4 text-red-400">{err}</p> : null}
      </div>
    </div>
  );
}