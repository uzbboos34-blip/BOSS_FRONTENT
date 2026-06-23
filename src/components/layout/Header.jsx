import { useState, useEffect } from 'react';
import { Box, InputBase, IconButton, Avatar, Typography, Select, MenuItem, Badge, Button, Menu, Divider, Switch } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import AddIcon from '@mui/icons-material/Add';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import BoltIcon from '@mui/icons-material/Bolt';
import { useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../api/axios';
import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { toastBus } from '../../utils/toast';

export default function Header({ isSidebarCollapsed, setIsSidebarCollapsed, isManagementActive, onMenuToggle }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();

  const [anchorEl, setAnchorEl] = useState(null);
  const [notiAnchorEl, setNotiAnchorEl] = useState(null);
  const [birthdaysToday, setBirthdaysToday] = useState([]);

  const tokenVal = localStorage.getItem('token');

  const [updateAvailable, setUpdateAvailable] = useState(localStorage.getItem('updateAvailable') === 'true');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const handleUpdateEvent = () => {
      setUpdateAvailable(true);
    };

    window.addEventListener('appUpdateAvailable', handleUpdateEvent);
    return () => {
      window.removeEventListener('appUpdateAvailable', handleUpdateEvent);
    };
  }, []);

  const handleApplyUpdate = async () => {
    if (!Capacitor.isNativePlatform()) {
      toastBus.show('Обновление работает только в мобильном приложении', 'warning');
      return;
    }
    if (isUpdating) return;
    setIsUpdating(true);
    toastBus.show('Загрузка обновления, пожалуйста, подождите...', 'info');
    try {
      const latestVersion = localStorage.getItem('latestVersion');
      const downloadUrl = localStorage.getItem('updateUrl');

      if (!downloadUrl || !latestVersion) {
        toastBus.show('Данные об обновлении не найдены. Пожалуйста, перезапустите приложение.', 'error');
        setIsUpdating(false);
        return;
      }

      console.log(`[LiveUpdate] Header downloading manual update: ${latestVersion} from ${downloadUrl}`);
      const versionObj = await CapacitorUpdater.download({
        url: downloadUrl,
        version: latestVersion
      });

      console.log('[LiveUpdate] Header setting manual update...');
      await CapacitorUpdater.set(versionObj);

      toastBus.show('Система успешно обновлена! Вам необходимо войти заново.', 'success');

      // Clear local storage and log out
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('updateAvailable');
      localStorage.removeItem('latestVersion');
      localStorage.removeItem('updateUrl');

      // Wait 1.5s then reload to Login screen
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);

    } catch (e) {
      console.error(e);
      toastBus.show('Произошла ошибка при обновлении: ' + (e.message || e), 'error');
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    async function fetchBirthdaysToday() {
      try {
        const res = await api.get('/api/v1/worker/birthdays/today');
        setBirthdaysToday(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        console.error("Failed to fetch today's birthdays:", e);
      }
    }
    if (tokenVal) {
      fetchBirthdaysToday();
    }
  }, [tokenVal]);

  const handleNotiClick = (event) => {
    setNotiAnchorEl(event.currentTarget);
  };

  const handleNotiClose = () => {
    setNotiAnchorEl(null);
  };
  const [userFullName, setUserFullName] = useState(() => {
    try {
      const cached = localStorage.getItem('user_profile');
      if (cached) {
        const u = JSON.parse(cached);
        return u.fullName || u.full_name || '';
      }
    } catch {}
    return '';
  });

  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await api.get('/api/v1/auth/me');
        const userData = res.data?.data || res.data;
        if (userData) {
          const name = userData.fullName || userData.full_name || '';
          setUserFullName(name);
          localStorage.setItem('user_profile', JSON.stringify(userData));
        }
      } catch (e) {
        console.error("Failed to fetch user profile in Header:", e);
      }
    }
    if (tokenVal && !userFullName) {
      fetchMe();
    }
  }, [tokenVal, userFullName]);

  let role = '';
  if (tokenVal) {
    try {
      const payload = JSON.parse(atob(tokenVal.split('.')[1]));
      role = payload.role;
    } catch (e) {
      console.error(e);
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleToggleClick = () => {
    if (isMobile) {
      onMenuToggle();
    } else {
      setIsSidebarCollapsed(!isSidebarCollapsed);
    }
  };

  const handleAvatarClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleAvatarClose = () => {
    setAnchorEl(null);
  };

  const isStudent = role === 'STUDENT' || /^\/student(\/|$)/.test(location.pathname);

  if (isStudent) {
    return (
      <Box
        sx={{
          height: { xs: 56, sm: 64 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: { xs: '0 12px', sm: '0 20px' },
          position: 'relative',
          zIndex: 1000,
          backgroundColor: '#ffffff',
          borderBottom: '1.5px solid #e2e8f0',
        }}
      >
        {/* Left: Golden hamburger toggle button */}
        <IconButton
          onClick={handleToggleClick}
          sx={{
            backgroundColor: '#c5a059',
            color: '#ffffff',
            borderRadius: '12px',
            p: 1.2,
            width: 42,
            height: 42,
            '&:hover': { backgroundColor: '#b89350' },
            boxShadow: '0 2px 8px rgba(197, 160, 89, 0.25)',
          }}
        >
          <MenuIcon sx={{ fontSize: 20 }} />
        </IconButton>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {/* Update Button (Student Mobile) */}
          {updateAvailable && (
            <IconButton 
              onClick={handleApplyUpdate}
              disabled={isUpdating}
              sx={{ 
                backgroundColor: '#faede0', 
                border: '1.5px solid #c5a059', 
                borderRadius: '12px',
                p: 1.2,
                width: 42,
                height: 42,
                color: '#c5a059'
              }}
            >
              <BoltIcon sx={{ fontSize: 20 }} />
            </IconButton>
          )}

          {/* Notifications count "33" in red circle badge */}
          <IconButton sx={{ 
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0', 
            borderRadius: '12px',
            p: 1.2,
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            '&:hover': { backgroundColor: '#f9fafb' }
          }}>
            <NotificationsNoneIcon sx={{ color: '#4b5563', fontSize: 22 }} />
          </IconButton>

          {/* Logout button */}
          <IconButton 
            onClick={handleLogout}
            sx={{ 
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0', 
              borderRadius: '12px',
              p: 1.2,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              '&:hover': { backgroundColor: '#fef2f2', color: '#dc2626' }
            }}
          >
            <LogoutIcon sx={{ color: '#4b5563', fontSize: 22 }} />
          </IconButton>
        </Box>
      </Box>
    );
  }

  const showAddButton = false; // Always hide, as requested by user

  return (
    <Box
      sx={{
        height: { xs: 'auto', md: 90 },
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: { xs: '12px', sm: '20px 25px' },
        position: 'relative',
        zIndex: 1000,
        backgroundColor: 'transparent',
      }}
    >
      {/* First Row (Main Header items) */}
      <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', justifyContext: 'space-between', justifyContent: 'space-between', width: '100%' }}>
        {/* Left Side: Calendar & Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Hamburger toggle — completely hidden as requested */}
          <IconButton
            onClick={onMenuToggle}
            sx={{
              display: 'none',
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              p: 1,
            }}
          >
            <MenuIcon sx={{ fontSize: 20, color: '#4b5563' }} />
          </IconButton>

          {/* Calendar Icon — desktop & tablet */}
          <IconButton sx={{
            display: { xs: 'none', md: 'flex' },
            backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', p: 1.2
          }}>
            <CalendarTodayIcon sx={{ fontSize: 18, color: '#4b5563' }} />
          </IconButton>

          {/* Add Button & Desktop Search */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {showAddButton && (
              <Button 
                variant="contained"
                sx={{ 
                  backgroundColor: '#7b61ff', 
                  color: 'white', 
                  borderRadius: '12px', 
                  textTransform: 'none',
                  fontWeight: 700,
                  minWidth: { xs: 40, md: 140 },
                  width: { xs: 40, md: 'auto' },
                  height: { xs: 40, md: 'auto' },
                  padding: { xs: 0, md: '8px 24px' },
                  fontSize: { xs: '0.8rem', md: '0.875rem' },
                  '&:hover': { backgroundColor: '#6a50e8' },
                  boxShadow: '0 4px 10px rgba(123, 97, 255, 0.2)'
                }}
              >
                <AddIcon sx={{ mr: { xs: 0, md: 1 } }} />
                <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>Добавить</Box>
                <KeyboardArrowDownIcon sx={{ ml: 0.5, display: { xs: 'none', lg: 'block' } }} />
              </Button>
            )}

            {/* Search Input — desktop & tablet */}
            <Box
              sx={{
                display: { xs: 'none', md: 'flex' },
                alignItems: 'center',
                backgroundColor: '#f9fafb',
                borderRadius: '10px',
                padding: '6px 12px',
                width: { sm: '160px', md: '220px' },
                border: '1px solid #e5e7eb',
                '&:focus-within': {
                  borderColor: '#7b61ff',
                  backgroundColor: '#fff',
                  boxShadow: '0 0 0 3px rgba(123, 97, 255, 0.1)'
                },
                transition: 'all 0.3s ease'
              }}
            >
              <SearchIcon sx={{ color: '#9ca3af', fontSize: 18, mr: 1 }} />
              <InputBase
                placeholder="Поиск..."
                sx={{
                  flex: 1,
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  '& input::placeholder': { color: '#9ca3af', opacity: 1 }
                }}
              />
            </Box>
          </Box>
        </Box>

        {/* Right Side: Language select, Notification, Dark mode, Avatar */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, md: 2 } }}>

          {/* Notifications */}
          <IconButton 
            onClick={handleNotiClick}
            sx={{ border: '1px solid #e5e7eb', borderRadius: '10px' }}
          >
            <Badge badgeContent={birthdaysToday.length} color="error">
              <NotificationsNoneIcon sx={{ color: '#4b5563', fontSize: 20 }} />
            </Badge>
          </IconButton>

          <Menu
            anchorEl={notiAnchorEl}
            open={Boolean(notiAnchorEl)}
            onClose={handleNotiClose}
            PaperProps={{
              sx: {
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                minWidth: 280,
                maxHeight: 350,
                mt: 1
              }
            }}
          >
            <Box sx={{ p: 2, pb: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827' }}>
                Оповещения
              </Typography>
            </Box>
            <Divider />
            {birthdaysToday.length === 0 ? (
              <MenuItem sx={{ py: 1.5, fontSize: '0.85rem', color: '#6b7280', whiteSpace: 'normal' }}>
                Сегодня нет дней рождения
              </MenuItem>
            ) : (
              birthdaysToday.map((worker) => (
                <MenuItem key={worker.id} onClick={handleNotiClose} sx={{ py: 1.5, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: '#111827' }}>
                    🎂 Сегодня день рождения!
                  </Typography>
                  <Typography sx={{ fontSize: '0.8rem', color: '#4b5563', mt: 0.5 }}>
                    {worker.fullName} ({worker.passport || 'Без паспорта'})
                  </Typography>
                </MenuItem>
              ))
            )}
          </Menu>

          {/* Logout Button */}
          <IconButton 
            onClick={handleLogout}
            sx={{ 
              border: '1px solid #e5e7eb', 
              borderRadius: '10px',
              color: '#ef4444',
              '&:hover': { backgroundColor: '#fef2f2', borderColor: '#ef4444' }
            }}
          >
            <LogoutIcon sx={{ fontSize: 20 }} />
          </IconButton>

          {/* Dark Mode — desktop only */}
          <IconButton sx={{
            display: { xs: 'none', md: 'flex' },
            backgroundColor: '#1e293b', color: 'white', borderRadius: '10px',
            '&:hover': { backgroundColor: '#0f172a' }
          }}>
            <DarkModeIcon sx={{ fontSize: 20 }} />
          </IconButton>

          {/* Avatar Menu Trigger */}
          <Avatar
            onClick={handleAvatarClick}
            sx={{ 
              width: { xs: 36, md: 40 }, 
              height: { xs: 36, md: 40 }, 
              ml: 0.5, 
              bgcolor: '#fca5a5',
              cursor: 'pointer',
              '&:hover': { opacity: 0.9 }
            }} 
            src="/avatar.jpg"
          >
            A
          </Avatar>

          {/* Dropdown Menu for Avatar */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleAvatarClose}
            PaperProps={{
              sx: {
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                minWidth: 180,
                mt: 1
              }
            }}
          >
            {/* Mobile Only: Dark Mode & Language Options */}
            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
              <MenuItem sx={{ py: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <Typography sx={{ fontSize: '0.9rem', fontWeight: 600 }}>Темная тема</Typography>
                  <Switch size="small" />
                </Box>
              </MenuItem>
              <Divider sx={{ my: 0.5 }} />
            </Box>
            
            <MenuItem onClick={() => { handleAvatarClose(); handleLogout(); }} sx={{ color: '#ef4444', fontSize: '0.9rem', fontWeight: 700, py: 1 }}>
              <LogoutIcon sx={{ fontSize: 18, mr: 1.5 }} />
              Выйти
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Second Row: Mobile Name/Greeting, Notifications & Logout (only on mobile) */}
      <Box
        sx={{
          display: { xs: 'flex', md: 'none' },
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          mt: 0.5
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar 
            sx={{ 
              width: 30, 
              height: 30, 
              fontSize: '0.8rem', 
              fontWeight: 750, 
              bgcolor: '#7b61ff15', 
              color: '#7b61ff',
              border: '1.5px solid rgba(123, 97, 255, 0.25)'
            }}
          >
            {(() => {
              const name = userFullName || 'Администратор';
              const parts = name.trim().split(' ');
              return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : (parts[0]?.[0] || '?').toUpperCase();
            })()}
          </Avatar>
          <Typography sx={{ fontSize: '0.92rem', fontWeight: 850, color: '#0f172a', letterSpacing: '-0.3px' }}>
            {userFullName || 'Администратор'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Update Button (Admin Mobile) */}
          {updateAvailable && (
            <IconButton 
              onClick={handleApplyUpdate}
              disabled={isUpdating}
              sx={{ 
                backgroundColor: '#f5f3ff', 
                border: '1.5px solid #7b61ff', 
                borderRadius: '10px',
                p: 1,
                width: 36,
                height: 36,
                color: '#7b61ff'
              }}
            >
              <BoltIcon sx={{ fontSize: 18 }} />
            </IconButton>
          )}

          {/* Notifications */}
          <IconButton 
            onClick={handleNotiClick}
            sx={{ 
              backgroundColor: '#fff', 
              border: '1px solid #e5e7eb', 
              borderRadius: '10px',
              p: 1,
              width: 36,
              height: 36
            }}
          >
            <Badge badgeContent={birthdaysToday.length} color="error">
              <NotificationsNoneIcon sx={{ color: '#4b5563', fontSize: 18 }} />
            </Badge>
          </IconButton>

          {/* Logout Button */}
          <IconButton 
            onClick={handleLogout}
            sx={{ 
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb', 
              borderRadius: '10px',
              p: 1,
              width: 36,
              height: 36,
              color: '#ef4444',
              '&:hover': { backgroundColor: '#fef2f2', borderColor: '#ef4444' }
            }}
          >
            <LogoutIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
}
