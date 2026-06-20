import { useState, useEffect } from 'react';
import { Box, Typography, List, ListItem, ListItemButton, ListItemIcon, ListItemText, IconButton, Drawer, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { keyframes } from '@mui/system';
import { Outlet, useLocation, NavLink, useNavigate } from 'react-router-dom';

// Icons for Management Menu
import BookIcon from '@mui/icons-material/Book';
import ReceiptIcon from '@mui/icons-material/Receipt';
import HistoryIcon from '@mui/icons-material/History';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

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
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 260 },
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
    </Box>
  );
}
