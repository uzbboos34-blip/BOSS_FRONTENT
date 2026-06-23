import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Management from './pages/Management';
import Users from './pages/Users';
import Groups from './pages/Groups';
import Students from './pages/Students';
import Profile from './pages/Profile';
import PlatformAdmin from './pages/PlatformAdmin';
import SupervisorDashboard from './pages/SupervisorDashboard';
import { UploadProvider } from './context/UploadContext';
import { useLiveUpdate } from './hooks/useLiveUpdate';
import './utils/toast';
import GlobalToast from './components/GlobalToast';

function App() {
  useLiveUpdate();
  return (
    <BrowserRouter>
      <GlobalToast />
      <UploadProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/supervisor/dashboard" element={<SupervisorDashboard />} />

          {/* Protected Dashboard Routes */}
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="management" element={<Management />} />
            <Route path="management/courses" element={<Management />} />
            <Route path="management/rooms" element={<Management />} />
            <Route path="management/branches" element={<Management />} />
            <Route path="management/staff" element={<Management />} />
            <Route path="management/reasons" element={<Management />} />
            <Route path="management/roles" element={<Management />} />
            <Route path="management/coin" element={<Management />} />
            <Route path="management/check" element={<Management />} />
            <Route path="management/attendance" element={<Management />} />
            <Route path="management/audit-log" element={<Management />} />
            <Route path="users" element={<Users />} />
            <Route path="groups" element={<Groups />} />
            <Route path="students" element={<Students />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* Platform Admin Route */}
          <Route path="/platform" element={<PlatformAdmin />} />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </UploadProvider>
    </BrowserRouter>
  );
}

export default App;
