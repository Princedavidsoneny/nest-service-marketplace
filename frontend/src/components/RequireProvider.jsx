import { Navigate, useLocation } from "react-router-dom";

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

export default function RequireProvider({ children }) {
  const location = useLocation();
  const token = localStorage.getItem("token");
  const user = getStoredUser();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user?.role !== "provider") {
    return <Navigate to="/" replace />;
  }

  return children;
}