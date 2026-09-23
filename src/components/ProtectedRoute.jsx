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

  // Normalize the user's role
  const userRole = String(user?.role || "")
    .trim()
    .toLowerCase();

  // Normalize allowed roles
  const roles = (allowedRoles || []).map((role) =>
    String(role)
      .trim()
      .toLowerCase()
  );

  // Check permission
  if (roles.length > 0 && !roles.includes(userRole)) {

    // Staff and inventory staff can only access Inventory
    if (
      userRole === "staff" ||
      userRole === "inventory_staff"
    ) {
      return <Navigate to="/inventory" replace />;
    }

    // Manager/admin unauthorized page
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;