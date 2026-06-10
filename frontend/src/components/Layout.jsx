 import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { getUser, logout } from "../auth";
import NotificationsBell from "./NotificationsBell";

function navClass(active = false) {
  return [
    "block rounded-xl px-3 py-2 text-sm md:text-base font-medium transition",
    active
      ? "bg-cyan-500/20 text-cyan-300 shadow-sm shadow-cyan-500/20"
      : "text-slate-300 hover:bg-white/5 hover:text-white",
  ].join(" ");
}

function isActive(pathname, href) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const user = getUser();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    setMenuOpen(false);
    navigate("/login");
  }
 const customerLinks = [
  { to: "/demand-requests", label: "Request Service" },
  { to: "/my-bookings", label: "My Bookings" },
  { to: "/my-quotes", label: "My Quotes" },
];

   const providerLinks = [
  { to: "/provider", label: "Dashboard" },
  { to: "/provider/bookings", label: "Bookings" },
   { to: "/provider/wallet", label: "Wallet" },
  { to: "/provider/quotes", label: "Quotes" },
  { to: "/provider/demands", label: "Service Requests" },
  { to: "/provider-settings", label: "Settings" },
];
  const publicLinks = [
    { to: "/privacy", label: "Privacy" },
    { to: "/terms", label: "Terms" },
    { to: "/contact", label: "Contact" },
  ];

  const mainLinks = [
    { to: "/", label: "Home" },
    ...(!user
      ? [
          { to: "/login", label: "Login" },
          { to: "/register", label: "Register" },
        ]
      : []),
    ...(user?.role === "customer" ? customerLinks : []),
    ...(user?.role === "provider" ? providerLinks : []),
    ...(user?.role === "admin"
      ? [{ to: "/admin/users", label: "Admin Users" }]
      : []),
    ...publicLinks,
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-50 border-b border-cyan-400/10 bg-slate-950/80 shadow-lg shadow-cyan-950/20 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <Link
              to="/"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-lime-300 via-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/30">
                <span className="text-2xl font-black text-slate-950">N</span>
              </div>

              <div className="leading-tight">
                <div className="text-3xl font-black tracking-tight text-white">
                  Nest
                </div>
                <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-300">
                  Local Services
                </div>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              {user ? <NotificationsBell /> : null}

              <button
                type="button"
                onClick={() => setMenuOpen((value) => !value)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 lg:hidden"
              >
                {menuOpen ? "Close" : "Menu"}
              </button>

              {user ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="hidden rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white lg:inline-flex"
                >
                  Logout
                </button>
              ) : null}
            </div>
          </div>

          <nav
            className={[
              "mt-4 flex-col gap-2 lg:flex lg:flex-row lg:flex-wrap lg:items-center lg:justify-end lg:gap-3",
              menuOpen ? "flex" : "hidden lg:flex",
            ].join(" ")}
          >
            {mainLinks.map((item) => (
              <Link
                key={item.to}
                className={navClass(isActive(location.pathname, item.to))}
                to={item.to}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}

            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                className="block rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-slate-300 transition hover:bg-white/10 hover:text-white lg:hidden"
              >
                Logout
              </button>
            ) : null}
          </nav>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="border-t border-cyan-400/10 px-4 py-6 text-center text-sm text-slate-400">
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/privacy" className="hover:text-white">
            Privacy
          </Link>
          <Link to="/terms" className="hover:text-white">
            Terms
          </Link>
          <Link to="/contact" className="hover:text-white">
            Contact
          </Link>
        </div>

        <p className="mt-3">© {new Date().getFullYear()} Nest. All rights reserved.</p>
      </footer>
    </div>
  );
}