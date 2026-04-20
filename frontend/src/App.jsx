import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import SuperadminDashboard from './pages/SuperadminDashboard';
import TenantsManager from './pages/TenantsManager';
import AdminDashboard from './pages/AdminDashboard';
import UsersManager from './pages/UsersManager';
import VehiclesManager from './pages/VehiclesManager';
import TasksManager from './pages/TasksManager';
import DriverDashboard from './pages/DriverDashboard';
import TechnicianDashboard from './pages/TechnicianDashboard';
import WarehouseDashboard from './pages/WarehouseDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/superadmin-dashboard" element={<SuperadminDashboard />} />
        <Route path="/superadmin/tenants" element={<TenantsManager />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<UsersManager />} />
        <Route path="/admin/vehicles" element={<VehiclesManager />} />
        <Route path="/admin/tasks" element={<TasksManager />} />
        <Route path="/driver-dashboard" element={<DriverDashboard />} />
        <Route path="/technician-dashboard" element={<TechnicianDashboard />} />
        <Route path="/warehouse-dashboard" element={<WarehouseDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
