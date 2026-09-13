export function getLoggedInUser() {
  try {
    return JSON.parse(
      localStorage.getItem("user")
    );
  } catch {
    return null;
  }
}

export function isAdmin() {
  return getLoggedInUser()?.role === "admin";
}

export function isManager() {
  return getLoggedInUser()?.role === "manager";
}

export function canSeeInventoryCost() {
  const role = getLoggedInUser()?.role;

  return (
    role === "admin" ||
    role === "manager"
  );
}

export function canSeePayments() {
  const role = getLoggedInUser()?.role;

  return (
    role === "admin" ||
    role === "manager"
  );
}

export function canManageUsers() {
  return isAdmin();
}