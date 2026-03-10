 import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllRead,
  markNotificationRead,
} from "../api/notifications";

export default function NotificationsBell() {
  const nav = useNavigate();
  const boxRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  async function loadCount() {
    try {
      const data = await fetchUnreadCount();
      setUnread(Number(data?.count || 0));
    } catch {
      setUnread(0);
    }
  }

  async function loadNotifications() {
    try {
      setLoading(true);
      const data = await fetchNotifications();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCount();
    const t = setInterval(loadCount, 10000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      await loadNotifications();
      await loadCount();
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllRead();
      await loadNotifications();
      await loadCount();
    } catch {}
  }

  async function handleItemClick(item) {
    try {
      if (!item?.id) return;

      await markNotificationRead(item.id);
      await loadCount();

      const type = item.type || "";

      if (type === "quote_offer" || type === "quote_status") {
        nav("/my-quotes");
      } else if (type === "booking" || type === "booking_status") {
        nav("/my-bookings");
      } else {
        nav("/");
      }

      setOpen(false);
    } catch {
      if (item?.type === "quote_offer" || item?.type === "quote_status") {
        nav("/my-quotes");
      } else if (item?.type === "booking" || item?.type === "booking_status") {
        nav("/my-bookings");
      } else {
        nav("/");
      }
      setOpen(false);
    }
  }

  return (
    <div className="relative z-[9999]" ref={boxRef}>
      <button
        type="button"
        onClick={handleToggle}
        className="relative text-xl leading-none text-yellow-400 hover:scale-105 transition"
        title="Notifications"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -right-2 -top-2 min-w-[20px] rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[11px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-[99999] mt-3 w-[340px] rounded-2xl border border-white/10 bg-slate-900/95 p-4 shadow-2xl backdrop-blur">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-lg font-semibold text-white">Notifications</div>
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-sm font-medium text-cyan-400 hover:text-cyan-300"
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
            {loading ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
                Loading...
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
                No notifications yet.
              </div>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className={`block w-full rounded-2xl border p-4 text-left transition ${
                    item.is_read
                      ? "border-white/10 bg-white/5 hover:bg-white/10"
                      : "border-cyan-400/40 bg-cyan-500/10 hover:bg-cyan-500/15"
                  }`}
                >
                  <div className="text-base font-semibold text-white">
                    {item.title || "Notification"}
                  </div>

                  {item.message ? (
                    <div className="mt-1 text-sm text-slate-300">
                      {item.message}
                    </div>
                  ) : null}

                  <div className="mt-2 text-xs text-slate-400">
                    {item.created_at || ""}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}