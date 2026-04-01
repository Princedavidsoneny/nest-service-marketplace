 import { Link, Outlet, useNavigate } from "react-router-dom";
import { getUser, logout } from "../auth";
import NotificationsBell from "./NotificationsBell";

function navClass() {
  return "text-sm md:text-base text-slate-300 hover:text-white transition";
}

export default function Layout() {
  const user = getUser();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-3xl font-extrabold tracking-tight text-white">
            Nest
          </Link>

          <nav className="flex items-center gap-4 md:gap-5">
            <Link className={navClass()} to="/">
              Home
            </Link>

            {!user && (
              <>
                <Link className={navClass()} to="/login">
                  Login
                </Link>
                <Link className={navClass()} to="/register">
                  Register
                </Link>
              </>
            )}

            {user?.role === "customer" && (
              <>
                <Link className={navClass()} to="/my-bookings">
                  My Bookings
                </Link>

                <NotificationsBell />

                <Link className={navClass()} to="/my-quotes">
                  My Quotes
                </Link>
              </>
            )}

            {user?.role === "admin" && (
              <Link className={navClass()} to="/admin/users">
                Admin Users
              </Link>
            )}

            {user?.role === "provider" && (
              <>
                <Link className={navClass()} to="/provider">
                  Provider
                </Link>

                <Link className={navClass()} to="/provider/bookings">
                  Provider Bookings
                </Link>

                <Link className={navClass()} to="/provider/quotes">
                  Provider Quotes
                </Link>
              </>
            )}

            {user && (
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm md:text-base text-slate-300 hover:bg-white/10 hover:text-white transition"
              >
                Logout
              </button>
            )}
          </nav>
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}