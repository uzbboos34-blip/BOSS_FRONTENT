import { Box, InputBase, IconButton, Avatar, Typography, Select, MenuItem, Badge, Button } from '@mui/material';
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

export default function Header({ isSidebarCollapsed, setIsSidebarCollapsed, isManagementActive, onMenuToggle }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();

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
        height: { xs: 64, sm: 90 },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: { xs: '0 12px', sm: '0 25px' },
        position: 'relative',
        zIndex: 1000,
        backgroundColor: 'transparent',
      }}
    >
      {/* Chap: Hamburger (mobil) + Harakatlar + Qidiruv */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>

        {/* Hamburger tugmasi — faqat mobilda ko'rinadi */}
        <IconButton
          onClick={onMenuToggle}
          sx={{
            display: { xs: 'flex', md: 'none' },
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            p: 1,
          }}
        >
          <MenuIcon sx={{ fontSize: 20, color: '#4b5563' }} />
        </IconButton>

        {/* Calendar Icon — desktopda ko'rsatiladi */}
        <IconButton sx={{
          display: { xs: 'none', sm: 'flex' },
          backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', p: 1.2
        }}>
          <CalendarTodayIcon sx={{ fontSize: 18, color: '#4b5563' }} />
        </IconButton>

        {/* Qo'shish tugmasi va Qidiruv */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Qo'shish tugmasi */}
          {showAddButton && (
            <Button 
              variant="contained"
              startIcon={<AddIcon />}
              endIcon={<KeyboardArrowDownIcon sx={{ display: { xs: 'none', sm: 'block' } }} />}
              sx={{ 
                backgroundColor: '#7b61ff', 
                color: 'white', 
                borderRadius: '12px', 
                textTransform: 'none',
                fontWeight: 700,
                padding: { xs: '6px 14px', sm: '8px 24px' },
                fontSize: { xs: '0.8rem', sm: '0.875rem' },
                '&:hover': { backgroundColor: '#6a50e8' },
                boxShadow: '0 4px 10px rgba(123, 97, 255, 0.2)'
              }}
            >
              Добавить
            </Button>
          )}

          {/* Qidiruv satri — kichik ekranlarda yashiriladi */}
          <Box
            sx={{
              display: { xs: 'none', sm: 'flex' },
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

      {/* O'ng: Til, Bildirishnoma, Dark mode, Avatar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 2 } }}>
        {/* Til tanlash — faqat sm+ da ko'rsatiladi */}
        <Select
          value="ru"
          size="small"
          IconComponent={KeyboardArrowDownIcon}
          sx={{
            display: { xs: 'none', sm: 'flex' },
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

        {/* Bildirishnomalar */}
        <IconButton sx={{ border: '1px solid #e5e7eb', borderRadius: '10px' }}>
          <NotificationsNoneIcon sx={{ color: '#4b5563', fontSize: 20 }} />
        </IconButton>

        {/* Dark mode — faqat sm+ da */}
        <IconButton sx={{
          display: { xs: 'none', sm: 'flex' },
          backgroundColor: '#1e293b', color: 'white', borderRadius: '10px',
          '&:hover': { backgroundColor: '#0f172a' }
        }}>
          <DarkModeIcon sx={{ fontSize: 20 }} />
        </IconButton>

        {/* Avatar */}
        <Avatar sx={{ width: { xs: 32, sm: 36 }, height: { xs: 32, sm: 36 }, ml: 0.5, bgcolor: '#fca5a5' }} src="/avatar.jpg">
          A
        </Avatar>
      </Box>
    </Box>
  );
}
