 // frontend/src/components/Layout.jsx
import { Link, Outlet, useNavigate } from "react-router-dom";
import { getUser, logout } from "../auth";

 import NotificationsBell from "./NotificationsBell";

export default function Layout() {
  const user = getUser();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-white/10 bg-gray-950/60 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-extrabold tracking-tight">
            Nest
          </Link>

          <nav className="flex items-center gap-4 text-sm">
            <Link className="hover:text-white" to="/">
              Home
            </Link>

            {!user && (
              <>
                <Link className="hover:text-white" to="/login">
                  Login
                </Link>
                <Link className="hover:text-white" to="/register">
                  Register
                </Link>
              </>
            )}

            {user?.role === "customer" && (
              <>
                <Link className="hover:text-white" to="/my-bookings">
                  My Bookings
                </Link>

                <div className="flex items-center gap-3">
  <NotificationsBell />
  {/* existing Login/Logout button here */}
</div>
                <Link className="hover:text-white" to="/my-quotes">
                  My Quotes
                </Link>
              </>
          
            )}

            {user?.role === "admin" && (
  <Link to="/admin/users">Admin Users</Link>
)}

            {user?.role === "provider" && (
              <>
                <Link className="hover:text-white" to="/provider">Provider</Link>
                
                <Link className="hover:text-white" to="/provider/bookings">
                  Provider Bookings
                </Link>
                <Link className="hover:text-white" to="/provider/quotes">
                  Provider Quotes
                </Link>
              </>
            )}

            {user && (
              <button
                className="px-3 py-1 rounded bg-white/10 hover:bg-white/15"
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
              >
                Logout
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}