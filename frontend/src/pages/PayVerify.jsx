 import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { initPayment } from "../services";

export default function PayVerify() {
  const { id } = useParams();
  const [msg, setMsg] = useState("Preparing secure payment...");
  const [err, setErr] = useState("");

  useEffect(() => {
    async function startPayment() {
      try {
        setErr("");

        const res = await initPayment(id);

        

        if (res?.alreadyPaid) {
          setMsg("This booking has already been paid.");
          return;
        }

        if (res?.authorization_url) {
          window.location.assign(res.authorization_url);
          return;
        }

        setErr("Payment link was not returned.");
      } catch (e) {
        console.error("Payment start error:", e);
        setErr(e?.message || "Failed to start payment");
      }
    }

    if (id) {
      startPayment();
    }
  }, [id]);

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-bold">Payment</h1>
        {msg && <p className="mt-4 text-slate-300">{msg}</p>}
        {err && <p className="mt-4 text-red-400">{err}</p>}
      </div>
    </div>
  );
}