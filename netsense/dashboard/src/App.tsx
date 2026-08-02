
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Shell } from './components/layout/Shell';

import { Dashboard } from './screens/dashboard';

// Mock empty pages for routing



export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard?layer=1" replace />} />
        
        <Route element={<Shell />}>
          <Route path="/dashboard" element={
            <div className="h-full">
              <Dashboard />
            </div>
          } />
          <Route path="/incidents" element={<div className="p-6">Incidents List</div>} />
          <Route path="/alerts" element={<div className="p-6">Alert Feed</div>} />
          <Route path="/devices" element={<div className="p-6">Devices</div>} />
          <Route path="/settings" element={<div className="p-6">Settings</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
