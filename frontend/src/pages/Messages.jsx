 import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const API = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:5000"
).replace(/\/+$/, "");

function formatMessageTime(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getToken() {
  return localStorage.getItem("token") || "";
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

export default function Messages() {
  const { bookingId } = useParams();
  const nav = useNavigate();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const boxRef = useRef(null);

  const token = getToken();
  const user = getUser();

  async function fetchMessages(showLoader = true) {
    try {
      if (showLoader) setLoading(true);
      setError("");

      const res = await fetch(`${API}/bookings/${bookingId}/messages`, {
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const textBody = await res.text();
      let data = [];

      try {
        data = textBody ? JSON.parse(textBody) : [];
      } catch {
        data = [];
      }

      if (!res.ok) {
        throw new Error(data?.error || data?.message || "Failed to load messages");
      }

      setMessages(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Failed to load messages");
      setMessages([]);
    } finally {
      if (showLoader) setLoading(false);
    }
  }

  async function sendMessage() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    try {
      setSending(true);
      setError("");

      const res = await fetch(`${API}/bookings/${bookingId}/messages`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ body: trimmed }),
      });

      const textBody = await res.text();
      let data = {};

      try {
        data = textBody ? JSON.parse(textBody) : {};
      } catch {
        data = {};
      }

      if (!res.ok) {
        throw new Error(data?.error || data?.message || "Failed to send message");
      }

      setText("");
      await fetchMessages(false);
    } catch (e) {
      setError(e.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    fetchMessages();

    const timer = setInterval(() => {
      fetchMessages(false);
    }, 3000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  useEffect(() => {
    if (boxRef.current) {
      boxRef.current.scrollTop = boxRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 text-white">
      <button
        onClick={() => nav(-1)}
        className="mb-4 text-sm text-white/80 transition hover:text-white"
      >
        ← Back
      </button>

      <div className="mb-4">
        <h1 className="text-3xl font-bold">Messages</h1>
        <p className="mt-2 text-sm text-slate-300">
          Booking #{bookingId}
        </p>
      </div>

      {error ? (
        <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
          Loading messages...
        </div>
      ) : null}

      <div
        ref={boxRef}
        className="min-h-[420px] max-h-[420px] space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-4"
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
                      : "border border-white/10 bg-white/10 text-white"
                  }`}
                >
                  <div className="mb-1 text-xs opacity-70">
                    {mine ? "You" : "Other user"} •{" "}
                    {formatMessageTime(msg.created_at || msg.createdAt)}
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
            if (e.key === "Enter") {
              sendMessage();
            }
          }}
          placeholder="Type a message..."
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/40"
        />

        <button
          onClick={sendMessage}
          disabled={sending || !text.trim()}
          className="rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-900 transition hover:opacity-90 disabled:opacity-60"
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}