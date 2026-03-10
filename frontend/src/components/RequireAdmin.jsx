import { Navigate } from "react-router-dom";
import { getUser, isLoggedIn } from "../auth";

export default function RequireAdmin({ children }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />;

  const user = getUser();
  if (!user || user.role !== "admin") return <Navigate to="/" replace />;

  return children;
}