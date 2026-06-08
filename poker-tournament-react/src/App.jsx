import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import Display from './pages/Display';
import HouseDashboard from './pages/HouseDashboard';
import Players from './pages/Players';
// import Ranking from './pages/Ranking';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/admin/:tournamentId" element={<Admin />} />
        <Route path="/display/:tournamentId" element={<Display />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/house" element={<HouseDashboard />} />
        <Route path="/players" element={<Players />} />
        {/* <Route path="/ranking" element={<Ranking />} /> */}
      </Routes>
    </BrowserRouter>
  );
}