import { BrowserRouter, Routes, Route } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import NewJob from "./pages/NewJob";
import Jobs from "./pages/Jobs";
import Invoice from "./pages/Invoice";
import EditJob from "./pages/EditJob";
import Settings from "./pages/Settings";
import JobDetails from "./pages/JobDetails";


function App() {

  return (
    <BrowserRouter>

      <Routes>

        <Route path="/" element={<Dashboard />} />

        <Route path="/new-job" element={<NewJob />} />

        <Route path="/jobs" element={<Jobs />} />

        <Route path="/invoice/:id" element={<Invoice />} />

        <Route path="/edit-job/:id" element={<EditJob />} />

        <Route path="/settings" element={<Settings />} />

        <Route 
          path="/job-details/:id" 
          element={<JobDetails />}
        />

      </Routes>

    </BrowserRouter>
  );
}

export default App;