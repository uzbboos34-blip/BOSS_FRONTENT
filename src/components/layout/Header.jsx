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
import { useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../api/axios';

export default function Header({ isSidebarCollapsed, setIsSidebarCollapsed, isManagementActive, onMenuToggle }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();

  const [anchorEl, setAnchorEl] = useState(null);
  const [notiAnchorEl, setNotiAnchorEl] = useState(null);
  const [birthdaysToday, setBirthdaysToday] = useState([]);

  const tokenVal = localStorage.getItem('token');

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

        {/* Right: Notification and Logout icons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
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

  const showAddButton = role !== 'TEACHER' && role !== 'STUDENT';

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
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContext: 'space-between', justifyContent: 'space-between', width: '100%' }}>
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
                borderRadius: '12px',
                padding: '8px 16px',
                width: { sm: '180px', md: '250px' },
                border: '1px solid #e5e7eb',
                '&:focus-within': {
                  borderColor: '#7b61ff',
                  backgroundColor: '#fff',
                  boxShadow: '0 0 0 4px rgba(123, 97, 255, 0.1)'
                },
                transition: 'all 0.3s ease'
              }}
            >
              <SearchIcon sx={{ color: '#9ca3af', fontSize: 22, mr: 1.5 }} />
              <InputBase
                placeholder="Поиск..."
                sx={{
                  flex: 1,
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  '& input::placeholder': { color: '#9ca3af', opacity: 1 }
                }}
              />
            </Box>
          </Box>
        </Box>

        {/* Right Side: Language select, Notification, Dark mode, Avatar */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, md: 2 } }}>
          {/* Language Selector — desktop only */}
          <Select
            value="ru"
            size="small"
            IconComponent={KeyboardArrowDownIcon}
            sx={{
              display: { xs: 'none', md: 'flex' },
              boxShadow: 'none',
              '.MuiOutlinedInput-notchedOutline': { border: 0 },
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 500,
              '&:hover': { backgroundColor: '#f3f4f6' }
            }}
          >
            <MenuItem value="uz">O'zbekcha</MenuItem>
            <MenuItem value="ru">Русский</MenuItem>
          </Select>

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
              <MenuItem sx={{ fontSize: '0.9rem', fontWeight: 600, py: 1 }}>
                Язык: Русский
              </MenuItem>
              <MenuItem sx={{ fontSize: '0.9rem', fontWeight: 600, py: 1 }}>
                Язык: O'zbekcha
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

      {/* Second Row: Mobile Search (only on mobile) */}
      <Box
        sx={{
          display: { xs: 'flex', md: 'none' },
          alignItems: 'center',
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '8px 16px',
          width: '100%',
          mt: 1.5,
          border: '1px solid #e5e7eb',
          '&:focus-within': {
            borderColor: '#7b61ff',
            boxShadow: '0 0 0 4px rgba(123, 97, 255, 0.1)'
          },
          transition: 'all 0.3s ease'
        }}
      >
        <SearchIcon sx={{ color: '#9ca3af', fontSize: 22, mr: 1.5 }} />
        <InputBase
          placeholder="Поиск..."
          fullWidth
          sx={{
            fontSize: '0.95rem',
            fontWeight: 500,
            '& input::placeholder': { color: '#9ca3af', opacity: 1 }
          }}
        />
      </Box>
    </Box>
  );
}
