 import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

export default function Messages() {
  const { bookingId } = useParams();
  const nav = useNavigate();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const boxRef = useRef(null);

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  async function fetchMessages() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${API}/messages/${bookingId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => ([]));

      if (!res.ok) {
        throw new Error(data?.error || "Failed to load messages");
      }

      setMessages(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    const trimmed = text.trim();
    if (!trimmed) return;

    try {
      setError("");

      const res = await fetch(`${API}/messages/${bookingId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ body: trimmed }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Failed to send message");
      }

      setText("");
      await fetchMessages();
    } catch (e) {
      setError(e.message || "Failed to send message");
    }
  }

  useEffect(() => {
    fetchMessages();

    const timer = setInterval(() => {
      fetchMessages();
    }, 3000);

    return () => clearInterval(timer);
  }, [bookingId]);

  useEffect(() => {
    if (boxRef.current) {
      boxRef.current.scrollTop = boxRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 text-white">
      <button
        onClick={() => nav(-1)}
        className="mb-4 text-sm text-white/80 hover:text-white"
      >
        ← Back
      </button>

      <h1 className="text-3xl font-bold mb-4">Messages (Booking #{bookingId})</h1>

      {error ? <div className="mb-3 text-red-400">{error}</div> : null}
      {loading ? <div className="mb-3 text-white/60">Loading...</div> : null}

      <div
        ref={boxRef}
        className="rounded-2xl border border-white/10 bg-white/5 min-h-[420px] max-h-[420px] overflow-y-auto p-4 space-y-3"
      >
        {messages.length === 0 ? (
          <div className="text-white/60">No messages yet.</div>
        ) : (
          messages.map((msg) => {
            const mine = Number(msg.sender_id) === Number(user?.id);

            return (
              <div
                key={msg.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 shadow ${
                    mine
                      ? "bg-cyan-400 text-slate-900"
                      : "bg-white/10 text-white border border-white/10"
                  }`}
                >
                  <div className="text-xs opacity-70 mb-1">
                    {mine ? "You" : "Other user"} • {msg.created_at}
                  </div>
                  <div className="break-words">{msg.body}</div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 flex gap-3">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
          placeholder="Type a message..."
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
        />

        <button
          onClick={sendMessage}
          className="rounded-xl px-5 py-3 font-semibold bg-cyan-400 text-slate-900 hover:opacity-90"
        >
          Send
        </button>
      </div>
    </div>
  );
}