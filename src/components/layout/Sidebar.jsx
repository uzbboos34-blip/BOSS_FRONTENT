import { useState } from 'react';
import { Box, Typography, List, ListItem, ListItemButton, ListItemIcon, Divider, Button, IconButton, useMediaQuery, useTheme } from '@mui/material';
import { NavLink, useLocation } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import SchoolIcon from '@mui/icons-material/School';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import SettingsIcon from '@mui/icons-material/Settings';
import AssignmentIcon from '@mui/icons-material/Assignment';
import GroupsIcon from '@mui/icons-material/Groups';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import PaymentsIcon from '@mui/icons-material/Payments';
import QuizIcon from '@mui/icons-material/Quiz';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import BoltIcon from '@mui/icons-material/Bolt';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { useNavigate } from 'react-router-dom';

const menuItems = [
  { text: 'Главная', icon: <DashboardIcon />, path: '/dashboard' },
  { text: 'Пользователи', icon: <PeopleIcon />, path: '/users', premium: true },
  { text: 'Бригады', icon: <GroupsIcon />, path: '/groups' },
  { text: 'Рабочие', icon: <SchoolIcon />, path: '/students', premium: true },
  { text: 'Управление', icon: <SettingsIcon />, path: '/management' },
];

export default function Sidebar({ openSettings, setOpenSettings, isSidebarCollapsed, setIsSidebarCollapsed, isManagementMenuOpen, setIsManagementMenuOpen, onMobileClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const collapsed = isMobile ? false : isSidebarCollapsed;

  const tokenVal = localStorage.getItem('token');
  let role = '';
  if (tokenVal) {
    try {
      const payload = JSON.parse(atob(tokenVal.split('.')[1]));
      role = payload.role;
    } catch (e) {
      console.error(e);
    }
  }

  const studentMenuItems = [
    { text: 'Главная', icon: <DashboardIcon />, path: '/student/dashboard' },
    { text: 'Мои оплаты', icon: <PaymentsIcon />, path: '/student/payments' },
    { text: 'Мои бригады', icon: <GroupsIcon />, path: '/student/groups' },
    { text: 'Мои показатели', icon: <AssignmentIcon />, path: '/student/indicators' },
    { text: 'Рейтинг', icon: <WorkspacePremiumIcon />, path: '/student/rating' },
    { text: 'Магазин', icon: <CardGiftcardIcon />, path: '/student/shop' },
    { text: 'Доп. занятия', icon: <SchoolIcon />, path: '/student/extra-lessons' },
    { text: 'Настройки', icon: <SettingsIcon />, path: '/student/settings' },
  ];

  const isStudent = role === 'STUDENT' || /^\/student(\/|$)/.test(location.pathname);

  const itemsToRender = isStudent
    ? studentMenuItems
    : role === 'TEACHER'
    ? [
        { text: 'Бригады', icon: <GroupsIcon />, path: '/groups' },
        { text: 'Профиль', icon: <AccountCircleIcon />, path: '/profile' }
      ]
    : menuItems;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Mobil Drawer yopish uchun yordamchi funksiya
  const closeMobileIfNeeded = () => {
    if (onMobileClose) onMobileClose();
  };

  const activeStyles = isStudent
    ? {
        backgroundColor: '#faede0',
        color: '#c5a059',
        borderRadius: '12px',
        '&:hover': { backgroundColor: '#f3e2d1' },
        '& .MuiListItemIcon-root': { color: '#c5a059' }
      }
    : {
        backgroundColor: '#7b61ff',
        color: '#fff',
        borderRadius: '12px',
        '&:hover': { backgroundColor: '#6a50e8' },
        '& .MuiListItemIcon-root': { color: '#fff' }
      };

  const defaultStyles = {
    borderRadius: '12px',
    marginBottom: '4px',
    color: '#6b7280',
    '&:hover': { backgroundColor: '#f9fafb', color: '#111827' },
    '& .MuiListItemIcon-root': { color: '#6b7280' }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', flexShrink: 0, position: 'relative', zIndex: 1300 }}>
      <Box sx={{ position: 'relative', height: '100%' }}>
        <IconButton
          size="small"
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          sx={{
            display: isStudent ? 'none' : { xs: 'none', md: 'flex' },
            backgroundColor: '#fff',
            color: '#6b7280',
            border: '1.5px solid #e5e7eb',
            borderRadius: '8px',
            width: 24,
            height: 24,
            '&:hover': { backgroundColor: '#f3f4f6', color: '#374151' },
            position: 'absolute',
            right: -12,
            top: 32,
            zIndex: 1500,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}
        >
          <ArrowBackIosNewIcon sx={{ fontSize: 12, transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)' }} />
        </IconButton>

        <Box
          sx={{
            width: { xs: 280, md: collapsed ? 80 : 260 },
            flexShrink: 0,
            height: '100%',
            backgroundColor: '#ffffff',
            borderRadius: '0 0 30px 0',
            borderRight: '1px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {/* Logo Area */}
          <Box sx={{
            height: isStudent ? { xs: 56, sm: 64 } : undefined,
            p: isStudent ? { xs: '0 16px', sm: '0 20px' } : 2.5,
            pb: isStudent ? 0 : 3,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderBottom: isStudent ? '1.5px solid #e2e8f0' : 'none',
            flexShrink: 0,
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polygon points="16,2 29,9 29,23 16,30 3,23 3,9" fill="url(#boss-grad)" stroke="#7b61ff" strokeWidth="1.5" strokeLinejoin="round"/>
                <text x="16" y="18" dominantBaseline="middle" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="900" fontFamily="system-ui, -apple-system, sans-serif">B</text>
                <defs>
                  <linearGradient id="boss-grad" x1="3" y1="2" x2="29" y2="30" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#7b61ff" />
                    <stop offset="100%" stopColor="#60a5fa" />
                  </linearGradient>
                </defs>
              </svg>
              {!collapsed && (
                <Typography sx={{ fontWeight: 900, color: '#111827', fontSize: '1.25rem', letterSpacing: -0.5 }}>
                  BOSS
                </Typography>
              )}
            </Box>
          </Box>

          {/* Main Menu */}
          <List sx={{ px: collapsed ? 1 : 2, flex: 1, overflowY: 'auto' }}>
            {itemsToRender.map((item) => {
              const isActive = location.pathname === item.path || (item.path === '/management' && location.pathname.startsWith('/management'));
              
              const handleClick = (e) => {
                if (item.text === 'Управление') {
                  e.preventDefault();
                  setIsManagementMenuOpen(!isManagementMenuOpen);
                }
                // Mobil Drawer yopilsin
                closeMobileIfNeeded();
              };
 
              return (
                <ListItem key={item.text} disablePadding>
                  <ListItemButton
                    component={NavLink}
                    to={item.path}
                    onClick={handleClick}
                    sx={{
                      ... (isActive ? activeStyles : defaultStyles),
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      px: collapsed ? 0 : 2,
                      minHeight: 52,
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: collapsed ? 0 : 36, justifyContent: 'center', color: isActive ? (isStudent ? '#c5a059' : '#fff') : '#6b7280' }}>
                      {item.icon}
                    </ListItemIcon>
                    {!collapsed && (
                      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography sx={{ fontSize: '1rem', fontWeight: isActive ? 700 : 600, color: isActive ? (isStudent ? '#c5a059' : '#fff') : '#374151' }}>{item.text}</Typography>
                        {item.premium && <WorkspacePremiumIcon sx={{ fontSize: 16, color: '#fbbf24' }} />}
                      </Box>
                    )}
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>

          {/* Subscription Box */}
          {!collapsed && role !== 'TEACHER' && role !== 'STUDENT' && (
            <Box sx={{
              p: { xs: 1.5, md: 2 },
              mb: { xs: 1, md: 2 },
              mx: { xs: 1, md: 1.5 },
              backgroundColor: '#f9fafb',
              borderRadius: '16px',
              border: '1px solid #f3f4f6'
            }}>
              <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
                <Box sx={{ width: 36, height: 36, backgroundColor: '#fff', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                  <Box component="img" src="/subscription-icon.png" sx={{ width: 24 }} onError={(e) => { e.target.src = 'https://cdn-icons-png.flaticon.com/512/5661/5661380.png'; }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#111827' }}>Подписка</Typography>
                  <Typography sx={{ fontSize: '0.65rem', color: '#6b7280', lineHeight: 1.2 }}>Вы можете продлить премиум подписку.</Typography>
                </Box>
              </Box>
              <Box sx={{ mb: 1.5 }}>
                <Box sx={{ height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, position: 'relative', overflow: 'hidden' }}>
                  <Box sx={{ position: 'absolute', left: 0, top: 0, height: '100%', width: '40%', backgroundColor: '#7b61ff', borderRadius: 3 }} />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
                  <Typography sx={{ fontSize: '0.65rem', color: '#6b7280', fontWeight: 500 }}>1г 4м 12ч</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 1, borderTop: '1px solid #f3f4f6' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }}>
                  <BoltIcon sx={{ fontSize: 16, color: '#6b7280' }} />
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#4b5563' }}>Обновить сейчас</Typography>
                </Box>
                <IconButton size="small" sx={{ p: 0.5 }}>
                  <OpenInNewIcon sx={{ fontSize: 14, color: '#9ca3af' }} />
                </IconButton>
              </Box>
            </Box>
          )}

          {/* Logout Button */}
          {!isStudent && (
            <Box sx={{ p: 2, mt: 'auto', borderTop: '1px solid #f3f4f6' }}>
              <ListItem disablePadding>
                <ListItemButton
                  onClick={handleLogout}
                  sx={{
                    ...defaultStyles,
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    px: collapsed ? 0 : 2,
                    minHeight: 52,
                    color: '#ef4444',
                    '&:hover': { backgroundColor: '#fef2f2', color: '#dc2626' },
                    '& .MuiListItemIcon-root': { color: '#ef4444' }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: collapsed ? 0 : 36, justifyContent: 'center' }}>
                    <LogoutIcon sx={{ fontSize: 22 }} />
                  </ListItemIcon>
                  {!collapsed && (
                    <Typography sx={{ fontSize: '1rem', fontWeight: 700 }}>Выйти</Typography>
                  )}
                </ListItemButton>
              </ListItem>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
