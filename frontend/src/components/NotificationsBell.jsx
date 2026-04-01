 import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllRead,
  markNotificationRead,
} from "../api/notifications";

function notificationTarget(item) {
  const type = String(item?.type || "").toLowerCase();

  if (type.includes("quote")) return "/my-quotes";
  if (type.includes("booking")) return "/my-bookings";
  if (type.includes("provider")) return "/provider-bookings";

  return null;
}

export default function NotificationsBell() {
  const navigate = useNavigate();
  const boxRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  async function loadCount() {
    try {
      const data = await fetchUnreadCount();
      setUnread(Number(data?.count || 0));
    } catch (err) {
      console.error("Failed to load unread count:", err);
      setUnread(0);
    }
  }

  async function loadItems() {
    try {
      setLoading(true);
      const data = await fetchNotifications();
      setItems(Array.isArray(data) ? data : data?.items || []);
    } catch (err) {
      console.error("Failed to load notifications:", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleOpen() {
    const next = !open;
    setOpen(next);

    if (next) {
      await loadItems();
      await loadCount();
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllRead();

      setUnread(0);
      setItems((prev) =>
        prev.map((item) => ({
          ...item,
          is_read: 1,
          read: 1,
        }))
      );
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  }

  async function handleItemClick(item) {
    try {
      const unreadItem = !item?.is_read && !item?.read;

      if (unreadItem) {
        await markNotificationRead(item.id);

        setItems((prev) =>
          prev.map((n) =>
            n.id === item.id ? { ...n, is_read: 1, read: 1 } : n
          )
        );

        setUnread((prev) => Math.max(0, prev - 1));
      }

      const target = notificationTarget(item);
      setOpen(false);

      if (target) {
        navigate(target);
      }
    } catch (err) {
      console.error("Notification click error:", err);
    }
  }

  useEffect(() => {
    loadCount();
  }, []);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (boxRef.current && !boxRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={handleOpen}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-white hover:bg-slate-800"
        aria-label="Notifications"
      >
        <span className="text-lg">🔔</span>

        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 min-w-[20px] rounded-full bg-red-500 px-1.5 py-0.5 text-center text-xs font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-[9999] mt-3 w-80 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>

            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-xs font-medium text-cyan-400 hover:text-cyan-300"
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-4 text-sm text-slate-400">Loading...</div>
            ) : items.length === 0 ? (
              <div className="px-4 py-4 text-sm text-slate-400">
                No notifications yet.
              </div>
            ) : (
              items.map((item) => {
                const unreadItem = !item?.is_read && !item?.read;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleItemClick(item)}
                    className={`block w-full border-b border-slate-800 px-4 py-3 text-left transition hover:bg-slate-900 ${
                      unreadItem ? "bg-slate-900/70" : "bg-transparent"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-1 text-sm">
                        {unreadItem ? "🟢" : "⚪"}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">
                          {item.title || "Notification"}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {item.message || "You have a new update."}
                        </p>

                        {item.createdAt || item.created_at ? (
                          <p className="mt-2 text-[11px] text-slate-500">
                            {item.createdAt || item.created_at}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}