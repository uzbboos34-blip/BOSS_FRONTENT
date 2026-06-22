import { useState, useEffect } from 'react';
import { Box, Typography, List, ListItem, ListItemButton, ListItemIcon, ListItemText, IconButton, Drawer, useMediaQuery, BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { keyframes } from '@mui/system';
import { Outlet, useLocation, NavLink, useNavigate } from 'react-router-dom';

// Icons for Management Menu
import BookIcon from '@mui/icons-material/Book';
import ReceiptIcon from '@mui/icons-material/Receipt';
import HistoryIcon from '@mui/icons-material/History';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

// Navigation Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import GroupsIcon from '@mui/icons-material/Groups';
import SchoolIcon from '@mui/icons-material/School';
import SettingsIcon from '@mui/icons-material/Settings';
import PaymentsIcon from '@mui/icons-material/Payments';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

import Sidebar from './Sidebar';
import Header from './Header';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const managementMenuItems = [
  { text: 'Специализации',     icon: <BookIcon />,           path: '/management' },
  { text: 'Чеки оплат',        icon: <ReceiptIcon />,        path: '/management/check' },
  { text: 'Давомат',           icon: <CheckCircleIcon />,    path: '/management/attendance' },
  { text: 'Логи действий',     icon: <HistoryIcon />,        path: '/management/audit-log' },
];

export default function DashboardLayout() {
  const [openSettings, setOpenSettings] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isManagementMenuOpen, setIsManagementMenuOpen] = useState(false);
  // Mobil uchun Drawer holati
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Mobil ekranni aniqlash
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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
    if (!tokenVal || tokenVal === 'undefined') {
      navigate('/login', { replace: true });
    }
  }, [tokenVal, navigate]);

  if (!tokenVal || tokenVal === 'undefined') {
    return null;
  }

  useEffect(() => {
    if (userRole === 'PLATFORM_SUPER_ADMIN') {
      if (!location.pathname.startsWith('/platform')) {
        navigate('/platform', { replace: true });
      }
    } else if (location.pathname.startsWith('/platform')) {
      navigate('/dashboard', { replace: true });
    } else if (userRole === 'SUPERVISOR') {
      if (!location.pathname.startsWith('/supervisor')) {
        navigate('/supervisor/dashboard', { replace: true });
      }
    } else if (userRole === 'TEACHER') {
      const allowedPatterns = [
        /^\/groups$/,
        /^\/group(\/|$)/,
        /^\/profile$/
      ];
      const isAllowed = allowedPatterns.some(pattern => pattern.test(location.pathname));
      if (!isAllowed) {
        navigate('/groups', { replace: true });
      }
    } else if (userRole === 'STUDENT') {
      const allowedPatterns = [
        /^\/student\/groups$/,
        /^\/student\/groups\/\d+\/lessons$/,
        /^\/student\/groups\/\d+\/lessons\/\d+$/,
        /^\/student\/dashboard$/,
        /^\/student\/payments$/,
        /^\/student\/indicators$/,
        /^\/student\/rating$/,
        /^\/student\/shop$/,
        /^\/student\/extra-lessons$/,
        /^\/student\/settings$/,
        /^\/profile$/
      ];
      const isAllowed = allowedPatterns.some(pattern => pattern.test(location.pathname));
      if (!isAllowed) {
        navigate('/student/groups', { replace: true });
      }
    }
  }, [location.pathname, userRole, navigate]);
  const isManagementActive = location.pathname.startsWith('/management');
  const isStudentLessonDetail = /^\/student\/groups\/[^/]+\/lessons\/[^/]+$/.test(location.pathname);

  // Define mobile navigation items based on role
  let navItems = [];
  if (userRole === 'STUDENT') {
    navItems = [
      { label: 'Главная', icon: <DashboardIcon />, path: '/student/dashboard' },
      { label: 'Оплаты', icon: <PaymentsIcon />, path: '/student/payments' },
      { label: 'Бригады', icon: <GroupsIcon />, path: '/student/groups' },
      { label: 'Рейтинг', icon: <WorkspacePremiumIcon />, path: '/student/rating' },
      { label: 'Настройки', icon: <SettingsIcon />, path: '/student/settings' },
    ];
  } else if (userRole === 'TEACHER') {
    navItems = [
      { label: 'Бригады', icon: <GroupsIcon />, path: '/groups' },
      { label: 'Профиль', icon: <AccountCircleIcon />, path: '/profile' },
    ];
  } else {
    navItems = [
      { label: 'Главная', icon: <DashboardIcon />, path: userRole === 'SUPERVISOR' ? '/supervisor/dashboard' : '/dashboard' },
      { label: 'Пользователи', icon: <PeopleIcon />, path: '/users' },
      { label: 'Бригады', icon: <GroupsIcon />, path: '/groups' },
      { label: 'Рабочие', icon: <SchoolIcon />, path: '/students' },
      { label: 'Управление', icon: <SettingsIcon />, path: '/management' },
    ];
  }

  const getActiveTabValue = () => {
    const path = location.pathname;
    const index = navItems.findIndex(item => {
      if (item.path === '/management') {
        return path.startsWith('/management');
      }
      return path.startsWith(item.path);
    });
    return index !== -1 ? index : 0;
  };

  // Shared Sidebar props
  const sidebarProps = {
    openSettings, setOpenSettings,
    isSidebarCollapsed, setIsSidebarCollapsed,
    isManagementMenuOpen, setIsManagementMenuOpen,
    // Mobil menudan bosilganda Drawer yopilsin
    onMobileClose: () => setMobileOpen(false),
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', backgroundColor: '#f5f6fa', overflow: 'hidden' }}>

      {/* Desktop Sidebar — mobilda yashiriladi */}
      <Box sx={{ display: { xs: 'none', md: 'block' }, flexShrink: 0 }}>
        <Sidebar {...sidebarProps} />
      </Box>

      {/* Mobil Drawer — faqat xs va sm ekranlarda ishlaydi */}
      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 280 },
        }}
      >
        <Sidebar {...sidebarProps} />
      </Drawer>

      {/* Management Sub-Sidebar — desktopda */}
      {isManagementMenuOpen && !isMobile && (
        <Box sx={{ 
          width: 260,
          flexShrink: 0, 
          borderRight: '1px solid #e5e7eb',
          backgroundColor: '#fff', 
          display: 'flex', 
          flexDirection: 'column', 
          height: '100%',
          position: 'absolute',
          left: isSidebarCollapsed ? 80 : 260,
          zIndex: 1200, 
          boxShadow: '4px 0 15px rgba(0,0,0,0.03)',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
          <Box sx={{ p: 3, pt: 4, pb: 2 }}>
            <Typography sx={{ fontWeight: 800, color: '#111827', fontSize: '1.2rem' }}>Меню</Typography>
          </Box>
          <List sx={{ px: 2, flexGrow: 1, overflowY: 'auto' }}>
            {managementMenuItems.filter(item => item.path !== '/management/audit-log' || userRole === 'SUPER_ADMIN').map((item) => {
              const isActive = item.path === '/management'
                ? (location.pathname === '/management' || location.pathname === '/management/courses' || location.pathname === '/management/specializations')
                : location.pathname === item.path;
              return (
                <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
                  <ListItemButton 
                    component={NavLink}
                    to={item.path}
                    onClick={() => setIsManagementMenuOpen(false)}
                    sx={{ 
                      borderRadius: '12px',
                      backgroundColor: isActive ? '#7b61ff' : 'transparent',
                      color: isActive ? '#fff' : '#6b7280',
                      '&:hover': { backgroundColor: isActive ? '#6a50e8' : '#f9fafb' },
                      px: 2.5, py: 1.5
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>{item.icon}</ListItemIcon>
                    <ListItemText 
                      primary={
                        <Typography sx={{ fontSize: '1rem', fontWeight: isActive ? 700 : 600, color: 'inherit' }}>
                          {item.text}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Box>
      )}

      {/* Asosiy kontent maydoni */}
      <Box 
        onClick={() => isManagementMenuOpen && setIsManagementMenuOpen(false)}
        sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          animation: `${fadeIn} 0.5s ease-out`,
          minWidth: 0,
        }}
      >
        <Box sx={{ flexShrink: 0 }}>
          <Header
            isSidebarCollapsed={isSidebarCollapsed}
            setIsSidebarCollapsed={setIsSidebarCollapsed}
            isManagementActive={isManagementActive}
            // Hamburger bosilganda Drawer ochilsin
            onMenuToggle={() => setMobileOpen(true)}
          />
        </Box>
        <Box sx={{ 
          p: isStudentLessonDetail ? 0 : { xs: 2, sm: isManagementActive ? 4 : 3 }, 
          pb: isStudentLessonDetail ? 0 : { xs: '80px', md: isManagementActive ? 4 : 3 },
          flexGrow: 1, 
          overflowY: isStudentLessonDetail ? 'hidden' : 'auto',
          backgroundColor: isStudentLessonDetail ? '#f5f6fa' : (isManagementActive ? '#f9fafb' : '#f5f6fa'),
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          '& > *': isStudentLessonDetail ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' } : undefined,
        }}>
          <Outlet />
        </Box>
      </Box>

      {/* Mobile Bottom Navigation */}
      <Paper 
        sx={{ 
          position: 'fixed', 
          bottom: 10, 
          left: 10, 
          right: 10, 
          zIndex: 1000, 
          display: { xs: 'flex', md: 'none' },
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
          border: '1px solid rgba(229, 231, 235, 0.5)'
        }} 
        elevation={0}
      >
        <BottomNavigation
          showLabels
          value={getActiveTabValue()}
          onChange={(event, newValue) => {
            const path = navItems[newValue].path;
            navigate(path);
          }}
          sx={{ 
            width: '100%', 
            height: 60,
            backgroundColor: '#ffffff'
          }}
        >
          {navItems.map((item, index) => (
            <BottomNavigationAction
              key={index}
              label={item.label}
              icon={item.icon}
              sx={{
                minWidth: 'auto',
                padding: '4px 0 6px',
                color: '#9ca3af',
                '& .MuiBottomNavigationAction-label': {
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  transition: 'font-size 0.2s',
                  marginTop: '2px',
                  '&.Mui-selected': {
                    fontSize: '0.68rem',
                    fontWeight: 700,
                  }
                },
                '&.Mui-selected': {
                  color: userRole === 'STUDENT' ? '#c5a059' : '#7b61ff',
                }
              }}
            />
          ))}
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
