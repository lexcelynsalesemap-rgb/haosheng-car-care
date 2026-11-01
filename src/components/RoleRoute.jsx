import { Navigate } from "react-router-dom";

function RoleRoute({ children, allowedRoles }) {
  const userData = localStorage.getItem("user");

  if (!userData) {
    return <Navigate to="/login" replace />;
  }

  let user;

  try {
    user = JSON.parse(userData);
  } catch (error) {
    console.error("Invalid user data:", error);
    localStorage.removeItem("user");
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles || !allowedRoles.includes(user?.role)) {
    if (user?.role === "staff" || user?.role === "inventory_staff") {
      return <Navigate to="/inventory" replace />;
    }

    if (user?.role === "manager") {
      return <Navigate to="/" replace />;
    }

    return <Navigate to="/" replace />;
  }

  return children;
}

export default RoleRoute;