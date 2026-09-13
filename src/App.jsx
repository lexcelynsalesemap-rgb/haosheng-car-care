import { BrowserRouter, Routes, Route } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import NewJob from "./pages/NewJob";
import Jobs from "./pages/Jobs";
import Invoice from "./pages/Invoice";
import Settings from "./pages/Settings";
import JobDetails from "./pages/JobDetails";
import EditJob from "./pages/EditJob";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import TechnicianEarnings from "./pages/TechnicianEarnings";
import AssignTechnician from "./pages/AssignTechnician";
import Reports from "./pages/Reports";
import Inventory from "./pages/Inventory";
import Users from "./pages/Users";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* PUBLIC */}
        <Route
          path="/login"
          element={<Login />}
        />

        {/* ADMIN ONLY */}
        <Route
          path="/"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/new-job"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <NewJob />
            </ProtectedRoute>
          }
        />

        <Route
          path="/jobs"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Jobs />
            </ProtectedRoute>
          }
        />

        <Route
          path="/invoice/:id"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Invoice />
            </ProtectedRoute>
          }
        />

        <Route
          path="/jobs/:id"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <JobDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/edit-job/:id"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <EditJob />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Settings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/technician-earnings"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <TechnicianEarnings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/assign-technician/:id"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AssignTechnician />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Reports />
            </ProtectedRoute>
          }
        />

        <Route
          path="/users"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Users />
            </ProtectedRoute>
          }
        />

        {/* INVENTORY — ADMIN + STAFF */}
        <Route
          path="/inventory"
          element={
            <ProtectedRoute allowedRoles={["admin", "staff"]}>
              <Inventory />
            </ProtectedRoute>
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;