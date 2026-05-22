 import { Link, NavLink, useNavigate } from "react-router-dom";
import { getUser, logout } from "../auth";

function navClass({ isActive }) {
  return [
    "rounded-xl px-3 py-2 text-sm font-medium transition duration-200",
    isActive
      ? "bg-cyan-500/20 text-cyan-300 shadow-sm shadow-cyan-500/20"
      : "text-white/80 hover:bg-white/5 hover:text-white",
  ].join(" ");
}

export default function AppShell({ children }) {
  const user = getUser();
  const nav = useNavigate();

  function handleLogout() {
    logout();
    nav("/login");
  }

  const isProvider = user?.role === "provider";
  const isCustomer = user?.role === "customer";
  const isAdmin = user?.role === "admin";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-40 border-b border-cyan-400/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          
          {/* LOGO */}
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-lime-300 via-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/30">
              <span className="text-2xl font-black text-slate-950">
                N
              </span>
            </div>

            <div className="leading-tight">
              <div className="text-2xl font-black tracking-tight text-white">
                Nest
              </div>

              <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-300">
                Local Services
              </div>
            </div>
          </Link>

          {/* NAVIGATION */}
          <nav className="flex flex-wrap items-center gap-2">
            <NavLink to="/" className={navClass}>
              Home
            </NavLink>

            {isCustomer && (
              <>
                <NavLink to="/my-bookings" className={navClass}>
                  My Bookings
                </NavLink>

                <NavLink to="/my-quotes" className={navClass}>
                  My Quotes
                </NavLink>
              </>
            )}

            {isProvider && (
              <>
                <NavLink to="/provider" className={navClass}>
                  Provider
                </NavLink>

                <NavLink to="/provider/bookings" className={navClass}>
                  Provider Bookings
                </NavLink>

                <NavLink to="/provider/quotes" className={navClass}>
                  Provider Quotes
                </NavLink>
              </>
            )}

            {isAdmin && (
              <NavLink to="/admin/users" className={navClass}>
                Admin
              </NavLink>
            )}

            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Logout
              </button>
            ) : (
              <>
                <NavLink to="/login" className={navClass}>
                  Login
                </NavLink>

                <NavLink to="/register" className={navClass}>
                  Register
                </NavLink>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}