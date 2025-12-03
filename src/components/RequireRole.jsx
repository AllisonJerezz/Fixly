import { Navigate } from "react-router-dom";
import { readProfile } from "../api";

export function RequireClient({ children }) {
  const role = readProfile()?.role;
  if (role === "client") return children;
  return <Navigate to="/home" replace />;
}

export function RequireProvider({ children }) {
  const role = readProfile()?.role;
  if (role === "provider") return children;
  return <Navigate to="/home" replace />;
}
