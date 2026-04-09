 import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { getUser, logout } from "../auth";
import NotificationsBell from "./NotificationsBell";

function navClass(active = false) {
  return [
    "text-sm md:text-base transition",
    active
      ? "text-white font-semibold"
      : "text-slate-300 hover:text-white",
  ].join(" ");
}

function isActive(pathname, href) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Layout() {
  const user = getUser();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const customerLinks = [
    { to: "/my-bookings", label: "My Bookings" },
    { to: "/my-quotes", label: "My Quotes" },
  ];

  const providerLinks = [
    { to: "/provider", label: "Dashboard" },
    { to: "/provider/bookings", label: "Bookings" },
    { to: "/provider/quotes", label: "Quotes" },
    { to: "/provider-settings", label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/85 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center justify-between gap-4">
              <Link
                to="/"
                className="text-3xl font-extrabold tracking-tight text-white"
              >
                Nest
              </Link>

              {user ? (
                <div className="flex items-center gap-3 lg:hidden">
                  <NotificationsBell />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
                  >
                    Logout
                  </button>
                </div>
              ) : null}
            </div>

            <nav className="flex flex-wrap items-center gap-4 md:gap-5">
              <Link className={navClass(isActive(location.pathname, "/"))} to="/">
                Home
              </Link>

              {!user ? (
                <>
                  <Link
                    className={navClass(isActive(location.pathname, "/login"))}
                    to="/login"
                  >
                    Login
                  </Link>

                  <Link
                    className={navClass(isActive(location.pathname, "/register"))}
                    to="/register"
                  >
                    Register
                  </Link>
                </>
              ) : null}

              {user?.role === "customer"
                ? customerLinks.map((item) => (
                    <Link
                      key={item.to}
                      className={navClass(isActive(location.pathname, item.to))}
                      to={item.to}
                    >
                      {item.label}
                    </Link>
                  ))
                : null}

              {user?.role === "provider"
                ? providerLinks.map((item) => (
                    <Link
                      key={item.to}
                      className={navClass(isActive(location.pathname, item.to))}
                      to={item.to}
                    >
                      {item.label}
                    </Link>
                  ))
                : null}

              {user?.role === "admin" ? (
                <Link
                  className={navClass(isActive(location.pathname, "/admin/users"))}
                  to="/admin/users"
                >
                  Admin Users
                </Link>
              ) : null}
            </nav>

            <div className="hidden lg:flex lg:items-center lg:gap-3">
              {user ? <NotificationsBell /> : null}

              {user ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm md:text-base text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  Logout
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}