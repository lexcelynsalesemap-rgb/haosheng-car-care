import { BrowserRouter, Routes, Route } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import NewJob from "./pages/NewJob";
import Jobs from "./pages/Jobs";
import Invoice from "./pages/Invoice";
import EditJob from "./pages/EditJob";
import Settings from "./pages/Settings";
import JobDetails from "./pages/JobDetails";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import TechnicianEarnings from "./pages/TechnicianEarnings";
import AssignTechnician from "./pages/AssignTechnician";
function App() {

  return (
    <BrowserRouter>

      <Routes>

  {/* Public */}
  <Route 
    path="/login" 
    element={<Login />} 
  />


  {/* Protected */}
  <Route
  path="/"
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  }
/>


  <Route 
    path="/new-job" 
    element={
      <ProtectedRoute>
        <NewJob />
      </ProtectedRoute>
    } 
  />


  <Route 
    path="/jobs" 
    element={
      <ProtectedRoute>
        <Jobs />
      </ProtectedRoute>
    } 
  />


  <Route 
    path="/invoice/:id" 
    element={
      <ProtectedRoute>
        <Invoice />
      </ProtectedRoute>
    } 
  />


  <Route 
    path="/edit-job/:id" 
    element={
      <ProtectedRoute>
        <EditJob />
      </ProtectedRoute>
    } 
  />


  <Route 
    path="/settings" 
    element={
      <ProtectedRoute>
        <Settings />
      </ProtectedRoute>
    } 
  />


        <Route 
        path="/job-details/:id" 
        element={
          <ProtectedRoute>
            <JobDetails />
          </ProtectedRoute>
        } 
      />


      <Route
        path="/technician-earnings"
        element={
          <ProtectedRoute>
            <TechnicianEarnings />
          </ProtectedRoute>
        }
      />


      <Route
        path="/assign-technician/:id"
        element={
          <ProtectedRoute>
            <AssignTechnician />
          </ProtectedRoute>
        }
      />


    </Routes>

    </BrowserRouter>
  );
}


export default App;