import { Navigate } from "react-router-dom";

function RoleRoute({ children, allowedRoles }) {
  const user = JSON.parse(
    localStorage.getItem("user") || "null"
  );

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/inventory" replace />;
  }

  return children;
}

export default RoleRoute;