 import { useEffect, useState } from "react";
import { fetchProviderQuotes, createQuoteOffer } from "../services";
import { getUser } from "../auth";
import { PageTitle, Card, Btn, Badge } from "../components/ui";

function dedupeById(list = []) {
  const map = new Map();
  for (const item of list) {
    if (!item || item.id == null) continue;
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values());
}

export default function ProviderQuotes() {
  const user = getUser();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sendingId, setSendingId] = useState(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    setErr("");
    setMsg("");
    setLoading(true);

    try {
      const data = await fetchProviderQuotes();
      const list = Array.isArray(data) ? data : Array.isArray(data?.rows) ? data.rows : [];
      setRows(dedupeById(list));
    } catch (e) {
      setErr(e.message || "Failed to load provider quotes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user || user.role !== "provider") {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 text-white">
        <PageTitle title="Quote Requests" subtitle="Login as provider to view quote requests." />
      </div>
    );
  }

  const toneFor = (status) =>
    status === "accepted"
      ? "green"
      : status === "rejected"
      ? "red"
      : status === "offered"
      ? "amber"
      : "slate";

  async function handleSendOffer(q) {
    setErr("");
    setMsg("");

    const amountStr = prompt("Offer amount (numbers only e.g. 15000):");
    if (!amountStr) return;

    const amount = Number(String(amountStr).replace(/,/g, "").trim());
    if (!Number.isFinite(amount) || amount <= 0) {
      setErr("Enter a valid amount");
      return;
    }

    const message = prompt("Short message to customer (optional):") || "";

    try {
      setSendingId(q.id);
      await createQuoteOffer(q.id, { amount, message });
      setMsg("Offer sent ✅");
      await load();
    } catch (e) {
      setErr(e.message || "Failed to send offer");
    } finally {
      setSendingId(null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 text-white">
      <PageTitle title="Quote Requests" subtitle="Reply to customers with an offer price." />

      {err && <div className="mb-4 text-red-300">{err}</div>}
      {msg && <div className="mb-4 text-green-300">{msg}</div>}

      <div className="flex gap-2 mb-4">
        <Btn onClick={load} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </Btn>
      </div>

      <div className="space-y-3">
        {rows.map((q) => {
          const status = String(q.status || "pending").toLowerCase();

          return (
            <Card key={q.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold">{q.title || q.serviceTitle || "Quote Request"}</div>

                  <div className="text-sm opacity-80 mt-1 flex items-center gap-2">
                    <Badge tone={toneFor(status)}>{status.toUpperCase()}</Badge>
                    <span>Quote ID: {q.id}</span>
                  </div>

                  {q.details && (
                    <div className="text-sm mt-2">
                      <b>Customer request:</b> {q.details}
                    </div>
                  )}

                  {q.city && (
                    <div className="text-sm mt-2 opacity-80">
                      <b>City:</b> {q.city}
                    </div>
                  )}
                </div>

                <Btn
                  onClick={() => handleSendOffer(q)}
                  disabled={sendingId === q.id || status === "accepted" || status === "rejected"}
                >
                  {sendingId === q.id ? "Sending..." : "Send Offer"}
                </Btn>
              </div>
            </Card>
          );
        })}

        {!rows.length && !loading && (
          <div className="opacity-80">No quote requests yet.</div>
        )}
      </div>
    </div>
  );
}