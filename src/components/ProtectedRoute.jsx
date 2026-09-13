import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, allowedRoles }) {

  const userData = localStorage.getItem("user");

  // Not logged in
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

  // If this route has role restrictions
  if (
    allowedRoles &&
    !allowedRoles.includes(user?.role)
  ) {
    // Staff can only use Inventory
    if (user?.role === "staff") {
      return <Navigate to="/inventory" replace />;
    }

    // Other unauthorized users
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;