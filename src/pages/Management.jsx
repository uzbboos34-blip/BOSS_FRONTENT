import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Typography, Tab, Tabs } from '@mui/material';
import Courses from './Courses';
import Rooms from './Rooms';
import Attendance from './Attendance';
import AuditLog from './AuditLog';

const tabs = [
  'Специализации', 'Чеки оплат', 'Давомат', 'Логи действий'
];

const PATH_TO_TAB = {
  '/management': 0,
  '/management/courses': 0,
  '/management/specializations': 0,
  '/management/check': 1,
  '/management/rooms': 1,
  '/management/attendance': 2,
  '/management/audit-log': 3,
};

const TAB_TO_PATH = [
  '/management',
  '/management/check',
  '/management/attendance',
  '/management/audit-log',
];

export default function Management() {
  const location = useLocation();
  const navigate = useNavigate();

  const tokenVal = localStorage.getItem('token');
  let userRole = null;
  if (tokenVal) {
    try {
      const payload = JSON.parse(atob(tokenVal.split('.')[1]));
      userRole = payload.role;
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    if (location.pathname === '/management/audit-log' && userRole !== 'SUPER_ADMIN') {
      navigate('/management', { replace: true });
    }
  }, [location.pathname, userRole, navigate]);

  const activeTab = (location.pathname === '/management/audit-log' && userRole !== 'SUPER_ADMIN')
    ? 0
    : (PATH_TO_TAB[location.pathname] ?? 0);

  const renderContent = () => {
    switch (activeTab) {
      case 0: return <Courses />;
      case 1: return <Rooms />;
      case 2: return <Attendance />;
      case 3: return userRole === 'SUPER_ADMIN' ? <AuditLog /> : null;
      default:
        return null;
    }
  };

  const visibleTabs = userRole === 'SUPER_ADMIN'
    ? tabs
    : userRole === 'ADMIN'
      ? tabs.slice(0, 3)
      : tabs.slice(0, 2);

  return (
    <Box sx={{ animation: 'fadeIn 0.5s ease-out' }}>
      <Typography variant="h4" sx={{ fontWeight: 800, color: '#111827', mb: 1 }}>Управление</Typography>

      {/* Horizontal Tabs */}
      <Box sx={{ mb: 4 }}>
        <Tabs
          value={activeTab}
          onChange={(e, v) => navigate(TAB_TO_PATH[v])}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 40,
            '& .MuiTabs-indicator': { backgroundColor: '#7b61ff', height: 3, borderRadius: '3px 3px 0 0' },
            '& .MuiTab-root': { textTransform: 'none', minWidth: 0, px: 2, fontWeight: 700, fontSize: '0.95rem', color: '#9ca3af', mr: 2 },
            '& .Mui-selected': { color: '#7b61ff !important' }
          }}
        >
          {visibleTabs.map(tab => <Tab key={tab} label={tab} />)}
        </Tabs>
      </Box>

      {renderContent()}
    </Box>
  );
}
