import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import {
  Box,
  TextField,
  Button,
  Typography,
  IconButton,
  InputAdornment,
  CircularProgress,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import { Visibility, VisibilityOff, Close } from '@mui/icons-material';
import { keyframes } from '@mui/system';
import api from '../api/axios';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from { 
    opacity: 0;
    transform: translateY(20px);
  }
  to { 
    opacity: 1;
    transform: translateY(0);
  }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-10px) rotate(1deg); }
`;

const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-6px); }
  40%, 80% { transform: translateX(6px); }
`;

const fadeOutScale = keyframes`
  from {
    opacity: 1;
    transform: scale(1);
    filter: blur(0);
  }
  to {
    opacity: 0;
    transform: scale(1.02);
    filter: blur(4px);
  }
`;

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();

  // Forgot Password States (OTP recovery in Russian)
  const [openResetDialog, setOpenResetDialog] = useState(false);
  const [resetStep, setResetStep] = useState(1);
  const [resetPhone, setResetPhone] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState(null);
  const [resetSuccess, setResetSuccess] = useState(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleCloseDialog = () => {
    setOpenResetDialog(false);
    setResetStep(1);
    setResetPhone('');
    setResetOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setResetError(null);
    setResetSuccess(null);
    setResetLoading(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!resetPhone) {
      setResetError("Введите номер телефона");
      return;
    }
    
    let cleanedPhone = resetPhone.trim();
    if (cleanedPhone.length === 9) {
      cleanedPhone = `+998${cleanedPhone}`;
    } else if (cleanedPhone.length === 12 && !cleanedPhone.startsWith('+')) {
      cleanedPhone = `+${cleanedPhone}`;
    }
    
    setResetLoading(true);
    setResetError(null);
    try {
      await api.post('/api/v1/verification/send/phone/verify', { phone: cleanedPhone });
      setResetPhone(cleanedPhone);
      setResetStep(2);
    } catch (err) {
      setResetError(err.response?.data?.message || err.userMessage || "Ошибка при отправке SMS");
    } finally {
      setResetLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!resetOtp) {
      setResetError("Введите код подтверждения");
      return;
    }
    setResetLoading(true);
    setResetError(null);
    try {
      await api.post('/api/v1/verification/verify/otp', { phone: resetPhone, otp: resetOtp.trim() });
      setResetStep(3);
    } catch (err) {
      setResetError(err.response?.data?.message || err.userMessage || "Неверный код подтверждения");
    } finally {
      setResetLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setResetError("Заполните оба поля пароля");
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError("Пароли не совпадают");
      return;
    }
    if (newPassword.length < 6) {
      setResetError("Длина пароля должна быть не менее 6 символов");
      return;
    }
    setResetLoading(true);
    setResetError(null);
    try {
      await api.post('/api/v1/verification/change-password', {
        phone: resetPhone,
        new_password: newPassword
      });
      setResetSuccess("Пароль успешно изменен!");
      setTimeout(() => {
        handleCloseDialog();
      }, 2000);
    } catch (err) {
      setResetError(err.response?.data?.message || err.userMessage || "Ошибка при изменении пароля");
    } finally {
      setResetLoading(false);
    }
  };

  const handleTogglePassword = () => setShowPassword((prev) => !prev);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!login || !password) {
      setError('Введите номер телефона и пароль');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const backendUrl = Capacitor.isNativePlatform()
        ? 'https://boss-backend-glek.onrender.com'
        : (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL !== '/'
            ? import.meta.env.VITE_API_URL.replace(/\/api\/v1\/?$/, '')
            : (import.meta.env.DEV ? '' : 'https://boss-backend-glek.onrender.com'));

      let formattedPhone = login.trim();
      if (!formattedPhone.startsWith('+')) {
        if (formattedPhone.length === 9) {
          formattedPhone = `+998${formattedPhone}`;
        } else if (formattedPhone.length === 12) {
          formattedPhone = `+${formattedPhone}`;
        }
      }

      let response = await fetch(`${backendUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: formattedPhone,
          password: password,
        }),
      });

      let data = await response.json();

      if (!response.ok && formattedPhone !== login.trim()) {
        const rawResponse = await fetch(`${backendUrl}/api/v1/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone: login.trim(),
            password: password,
          }),
        });
        if (rawResponse.ok) {
          response = rawResponse;
          data = await rawResponse.json();
        }
      }

      if (!response.ok) {
        let msg = data.message || 'Неверный номер телефона или пароль';
        if (msg.includes('Unauthorized') || msg.includes('Incorrect') || msg.toLowerCase().includes('invalid')) {
          msg = 'Неверный номер телефона или пароль';
        }
        throw new Error(msg);
      }

      setSuccess(true);
      
      // Save token and redirect
      localStorage.setItem('token', data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }

      // Fetch user role info by decoding JWT token
      let role = null;
      try {
        const payload = JSON.parse(atob(data.accessToken.split('.')[1]));
        role = payload.role;
        localStorage.setItem('user', JSON.stringify(payload));
      } catch (e) {
        console.error('JWT decode error:', e);
      }

      setTimeout(() => {
        if (role === 'PLATFORM_SUPER_ADMIN') {
          navigate('/platform');
        } else if (role === 'TEACHER') {
          navigate('/groups');
        } else if (role === 'STUDENT') {
          navigate('/student/groups');
        } else {
          navigate('/dashboard');
        }
      }, 800);

    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        animation: success ? `${fadeOutScale} 0.8s forwards` : 'none',
        transition: 'all 0.8s ease-in-out'
      }}
    >
      {/* ========== Left Side - Illustration / Brand Info ========== */}
      <Box
        sx={{
          flex: { xs: 'none', lg: '0 0 50%' },
          backgroundColor: '#090d16',
          backgroundImage: `
            radial-gradient(circle at center, rgba(37, 99, 235, 0.15) 0%, rgba(9, 13, 22, 0) 70%),
            linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 45px 45px, 45px 45px',
          display: { xs: 'none', lg: 'flex' },
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          borderRight: '1px solid rgba(255, 255, 255, 0.05)',
          px: 6,
        }}
      >
        {/* Hexagon Mesh Graphics */}
        <Box
          sx={{
            mb: 4,
            animation: `${float} 6s ease-in-out infinite`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <svg width="220" height="220" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Outer Hexagon */}
            <polygon points="50,5 90,28 90,72 50,95 10,72 10,28" stroke="#1d2d44" strokeWidth="1" strokeDasharray="3,3"/>
            <polygon points="50,12 83,31 83,69 50,88 17,69 17,31" stroke="#2563eb" strokeWidth="0.8" opacity="0.4"/>
            
            {/* Middle Hexagon */}
            <polygon points="50,22 74,36 74,64 50,78 26,64 26,36" stroke="#3b82f6" strokeWidth="1" opacity="0.8"/>
            
            {/* Inner Hexagon */}
            <polygon points="50,35 63,42 63,58 50,65 37,58 37,42" fill="rgba(59, 130, 246, 0.15)" stroke="#60a5fa" strokeWidth="1.5" />
            
            {/* Inner Glow Center */}
            <polygon points="50,44 55,47 55,53 50,56 45,53 45,47" fill="#60a5fa" />
            
            {/* Vertices Connector Lines */}
            <line x1="50" y1="5" x2="50" y2="44" stroke="#1d2d44" strokeWidth="0.8" opacity="0.6"/>
            <line x1="90" y1="28" x2="55" y2="47" stroke="#1d2d44" strokeWidth="0.8" opacity="0.6"/>
            <line x1="90" y1="72" x2="55" y2="53" stroke="#1d2d44" strokeWidth="0.8" opacity="0.6"/>
            <line x1="50" y1="95" x2="50" y2="56" stroke="#1d2d44" strokeWidth="0.8" opacity="0.6"/>
            <line x1="10" y1="72" x2="45" y2="53" stroke="#1d2d44" strokeWidth="0.8" opacity="0.6"/>
            <line x1="10" y1="28" x2="45" y2="47" stroke="#1d2d44" strokeWidth="0.8" opacity="0.6"/>
            
            {/* Glowing vertices dots */}
            <circle cx="50" cy="5" r="1.5" fill="#60a5fa" />
            <circle cx="90" cy="28" r="1.5" fill="#60a5fa" />
            <circle cx="90" cy="72" r="1.5" fill="#60a5fa" />
            <circle cx="50" cy="95" r="1.5" fill="#60a5fa" />
            <circle cx="10" cy="72" r="1.5" fill="#60a5fa" />
            <circle cx="10" cy="28" r="1.5" fill="#60a5fa" />
          </svg>
        </Box>

        {/* Headings */}
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            color: '#ffffff',
            mb: 2,
            textAlign: 'center',
            fontSize: '1.9rem',
            letterSpacing: '-0.5px'
          }}
        >
          Система управления персоналом
        </Typography>

        <Typography
          variant="body1"
          sx={{
            color: '#64748b',
            mb: 4,
            textAlign: 'center',
            maxWidth: 420,
            lineHeight: 1.6,
            fontSize: '0.95rem'
          }}
        >
          Учёт рабочих, посещаемости, патентов и отчётов в одной системе
        </Typography>

        {/* Capsule Badges */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, alignItems: 'center' }}>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            {['QR-код', 'Патент', 'Посещаемость'].map((tag) => (
              <Box
                key={tag}
                sx={{
                  border: '1px solid #1e293b',
                  borderRadius: '20px',
                  px: 2.5,
                  py: 0.8,
                  backgroundColor: 'rgba(30, 41, 59, 0.3)',
                  color: '#94a3b8',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: '#3b82f6',
                    color: '#60a5fa',
                    backgroundColor: 'rgba(59, 130, 246, 0.05)'
                  }
                }}
              >
                {tag}
              </Box>
            ))}
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            {['Отчёты', 'Бригады'].map((tag) => (
              <Box
                key={tag}
                sx={{
                  border: '1px solid #1e293b',
                  borderRadius: '20px',
                  px: 2.5,
                  py: 0.8,
                  backgroundColor: 'rgba(30, 41, 59, 0.3)',
                  color: '#94a3b8',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: '#3b82f6',
                    color: '#60a5fa',
                    backgroundColor: 'rgba(59, 130, 246, 0.05)'
                  }
                }}
              >
                {tag}
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* ========== Right Side - Login Form ========== */}
      <Box
        sx={{
          flex: { xs: '1 1 100%', lg: '0 0 50%' },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
          position: 'relative',
          px: { xs: 3, sm: 6, md: 10 },
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 380,
            display: 'flex',
            flexDirection: 'column',
            alignItems: { xs: 'center', lg: 'flex-start' },
            animation: `${slideUp} 0.8s ease-out forwards`
          }}
        >
          {/* Brand Logo & Name */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 5, justifyContent: { xs: 'center', lg: 'flex-start' }, width: '100%' }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: 10 }}>
              <polygon points="16,3 28,10 28,22 16,29 4,22 4,10" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round"/>
              <polygon points="16,9 23,13 23,19 16,23 9,19 9,13" fill="#3b82f6" stroke="#3b82f6" strokeWidth="1.5" strokeLinejoin="round" />
              <polygon points="16,13 18,14 18,18 16,19 14,18 14,14" fill="#fff" />
            </svg>
            <Box>
              <Typography sx={{ fontWeight: 900, fontSize: '1.25rem', color: '#0f172a', lineHeight: 1.1, letterSpacing: '0.5px' }}>
                BOSS
              </Typography>
              <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '1px' }}>
                CRM СИСТЕМА
              </Typography>
            </Box>
          </Box>

          {/* Heading */}
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              color: '#0f172a',
              mb: 1,
              letterSpacing: '-0.8px',
              fontSize: '1.85rem',
              textAlign: { xs: 'center', lg: 'left' },
              width: '100%'
            }}
          >
            Добро пожаловать
          </Typography>

          <Typography
            variant="body2"
            sx={{
              color: '#94a3b8',
              mb: 4,
              fontSize: '0.88rem',
              fontWeight: 500,
              textAlign: { xs: 'center', lg: 'left' },
              width: '100%'
            }}
          >
            Войдите в свой аккаунт
          </Typography>

          {/* ===== Form ===== */}
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 0 }}
          >
            {/* Phone input */}
            <Typography
              sx={{ fontSize: '0.8rem', color: '#525252', fontWeight: 700, mb: 1 }}
            >
              Номер телефона
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="+7 (999) 000-00-00"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#262626',
                  borderRadius: '12px',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  transition: 'all 0.2s',
                  '& fieldset': {
                    border: 'none',
                  },
                  '&:hover': {
                    backgroundColor: '#2e2e2e',
                  },
                  '&.Mui-focused': {
                    backgroundColor: '#2a2a2d',
                    boxShadow: '0 0 0 2px #3b82f6',
                  }
                },
                '& input': {
                  py: '12px',
                  px: '16px',
                  color: '#ffffff',
                  '&::placeholder': {
                    color: '#737373',
                    opacity: 1
                  }
                }
              }}
            />

            {/* Password input */}
            <Typography
              sx={{ fontSize: '0.8rem', color: '#525252', fontWeight: 700, mb: 1 }}
            >
              Пароль
            </Typography>
            <TextField
              fullWidth
              size="small"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={handleTogglePassword}
                        edge="end"
                        size="small"
                        tabIndex={-1}
                        sx={{ color: '#737373', mr: '4px' }}
                      >
                        {showPassword ? (
                          <VisibilityOff sx={{ fontSize: 18 }} />
                        ) : (
                          <Visibility sx={{ fontSize: 18 }} />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
              sx={{
                mb: 4.5,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#262626',
                  borderRadius: '12px',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  transition: 'all 0.2s',
                  '& fieldset': {
                    border: 'none',
                  },
                  '&:hover': {
                    backgroundColor: '#2e2e2e',
                  },
                  '&.Mui-focused': {
                    backgroundColor: '#2a2a2d',
                    boxShadow: '0 0 0 2px #3b82f6',
                  }
                },
                '& input': {
                  py: '12px',
                  px: '16px',
                  color: '#ffffff',
                  '&::placeholder': {
                    color: '#737373',
                    opacity: 1
                  }
                }
              }}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disableElevation
              disabled={loading}
              sx={{
                height: '48px',
                py: 0,
                backgroundColor: '#ffffff',
                color: '#171717',
                borderRadius: '12px',
                border: '1px solid #e5e5e5',
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.95rem',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.2s',
                '&:hover': {
                  backgroundColor: '#f5f5f5',
                  borderColor: '#d4d4d4',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                },
                '&:active': {
                  transform: 'translateY(0)',
                },
                '&.Mui-disabled': {
                  backgroundColor: '#e5e5e5',
                  color: '#a3a3a3'
                }
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Войти'}
            </Button>
          </Box>
        </Box>

        {/* Footer */}
        <Typography
          sx={{
            position: 'absolute',
            bottom: 24,
            color: '#a3a3a3',
            fontSize: '0.75rem',
            textAlign: 'center',
            width: '100%',
            fontWeight: 500
          }}
        >
          © 2026 BOSS CRM · Все права защищены
        </Typography>
      </Box>

      {/* Snackbar alerts */}
      <Snackbar 
        open={!!error} 
        autoHideDuration={4000} 
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ animation: `${shake} 0.5s ease-in-out` }}
      >
        <Alert 
          onClose={() => setError(null)} 
          severity="error" 
          variant="filled"
          sx={{ 
            width: '100%', 
            backgroundColor: '#ef4444',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(239, 68, 68, 0.35)',
            alignItems: 'center',
            fontWeight: 600,
            fontSize: '0.9rem',
            letterSpacing: 0.3,
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          {error} ⚠️
        </Alert>
      </Snackbar>

      <Snackbar 
        open={success} 
        autoHideDuration={6000} 
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSuccess(false)} 
          severity="success" 
          variant="filled"
          sx={{ 
            width: '100%', 
            backgroundColor: '#10b981',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.25)',
            alignItems: 'center',
            fontWeight: 500,
            fontSize: '0.95rem',
            letterSpacing: 0.3,
            px: 3,
            py: 1
          }}
        >
          Вход успешно выполнен! 🎉
        </Alert>
      </Snackbar>

      {/* ========== Password Reset Dialog (Dark theme matching layout) ========== */}
      <Dialog
        open={openResetDialog}
        onClose={handleCloseDialog}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '24px',
            p: 2,
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            backgroundColor: '#171719',
            border: '1px solid #2d2d30',
            color: '#ffffff'
          },
        }}
      >
        <DialogTitle sx={{ pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#ffffff' }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px' }}>
            Восстановление пароля
          </Typography>
          <IconButton onClick={handleCloseDialog} size="small" sx={{ color: '#a3a3a3', '&:hover': { color: '#ffffff' } }}>
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          {/* Step Indicator */}
          <Box sx={{ display: 'flex', gap: 1, mb: 3.5 }}>
            {[1, 2, 3].map((s) => (
              <Box
                key={s}
                sx={{
                  flex: 1,
                  height: '4px',
                  borderRadius: '2px',
                  backgroundColor: resetStep >= s ? '#3b82f6' : '#2d2d30',
                  transition: 'background-color 0.3s ease',
                }}
              />
            ))}
          </Box>

          {resetError && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: '12px', fontSize: '0.82rem', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              {resetError}
            </Alert>
          )}

          {resetSuccess && (
            <Alert severity="success" sx={{ mb: 2.5, borderRadius: '12px', fontSize: '0.82rem', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#a7f3d0', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              {resetSuccess}
            </Alert>
          )}

          {/* STEP 1: Enter Phone Number */}
          {resetStep === 1 && (
            <Box component="form" onSubmit={handleSendOtp} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Typography variant="body2" sx={{ color: '#a3a3a3', lineHeight: 1.5 }}>
                Введите номер телефона, привязанный к вашему аккаунту. Мы отправим вам код подтверждения.
              </Typography>
              <Box>
                <Typography sx={{ fontSize: '0.8rem', color: '#d4d4d4', fontWeight: 600, mb: 1 }}>
                  Номер телефона
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="+7 (999) 000-00-00"
                  value={resetPhone}
                  onChange={(e) => setResetPhone(e.target.value)}
                  disabled={resetLoading}
                  autoFocus
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#262626',
                      borderRadius: '12px',
                      color: '#ffffff',
                      fontSize: '0.9rem',
                      '& fieldset': { border: 'none' },
                      '&:hover': { backgroundColor: '#2e2e2e' },
                      '&.Mui-focused': { backgroundColor: '#2a2a2d', boxShadow: '0 0 0 2px #3b82f6' },
                    },
                    '& input': { py: '12px', px: '16px', color: '#ffffff' },
                  }}
                />
              </Box>
              <Button
                type="submit"
                variant="contained"
                disableElevation
                disabled={resetLoading}
                sx={{
                  mt: 1,
                  py: 1.3,
                  backgroundColor: '#ffffff',
                  color: '#171717',
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  '&:hover': {
                    backgroundColor: '#e5e5e5',
                  },
                }}
              >
                {resetLoading ? <CircularProgress size={20} color="inherit" /> : "Отправить код"}
              </Button>
            </Box>
          )}

          {/* STEP 2: Enter OTP Code */}
          {resetStep === 2 && (
            <Box component="form" onSubmit={handleVerifyOtp} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Typography variant="body2" sx={{ color: '#a3a3a3', lineHeight: 1.5 }}>
                Введите код подтверждения (OTP), отправленный на номер <b>{resetPhone}</b>.
              </Typography>
              <Box>
                <Typography sx={{ fontSize: '0.8rem', color: '#d4d4d4', fontWeight: 600, mb: 1 }}>
                  Код подтверждения (OTP)
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Введите код"
                  value={resetOtp}
                  onChange={(e) => setResetOtp(e.target.value)}
                  disabled={resetLoading}
                  autoFocus
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#262626',
                      borderRadius: '12px',
                      color: '#ffffff',
                      fontSize: '0.9rem',
                      '& fieldset': { border: 'none' },
                      '&:hover': { backgroundColor: '#2e2e2e' },
                      '&.Mui-focused': { backgroundColor: '#2a2a2d', boxShadow: '0 0 0 2px #3b82f6' },
                    },
                    '& input': { py: '12px', px: '16px', color: '#ffffff' },
                  }}
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Button
                  type="button"
                  variant="outlined"
                  onClick={() => setResetStep(1)}
                  disabled={resetLoading}
                  sx={{
                    flex: 1,
                    py: 1.3,
                    borderRadius: '12px',
                    borderColor: '#2d2d30',
                    color: '#a3a3a3',
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    '&:hover': {
                      backgroundColor: '#262626',
                      borderColor: '#404040',
                      color: '#ffffff'
                    },
                  }}
                >
                  Назад
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disableElevation
                  disabled={resetLoading}
                  sx={{
                    flex: 1.5,
                    py: 1.3,
                    backgroundColor: '#ffffff',
                    color: '#171717',
                    borderRadius: '12px',
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    '&:hover': {
                      backgroundColor: '#e5e5e5',
                    },
                  }}
                >
                  {resetLoading ? <CircularProgress size={20} color="inherit" /> : "Подтвердить"}
                </Button>
              </Box>
            </Box>
          )}

          {/* STEP 3: Change Password */}
          {resetStep === 3 && (
            <Box component="form" onSubmit={handleChangePassword} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Typography variant="body2" sx={{ color: '#a3a3a3', lineHeight: 1.5 }}>
                Введите новый пароль и подтвердите его.
              </Typography>
              <Box>
                <Typography sx={{ fontSize: '0.8rem', color: '#d4d4d4', fontWeight: 600, mb: 1 }}>
                  Новый пароль
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Введите новый пароль"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={resetLoading}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            edge="end"
                            size="small"
                            tabIndex={-1}
                            sx={{ color: '#737373' }}
                          >
                            {showNewPassword ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{
                    mb: 2,
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#262626',
                      borderRadius: '12px',
                      color: '#ffffff',
                      fontSize: '0.9rem',
                      '& fieldset': { border: 'none' },
                      '&:hover': { backgroundColor: '#2e2e2e' },
                      '&.Mui-focused': { backgroundColor: '#2a2a2d', boxShadow: '0 0 0 2px #3b82f6' },
                    },
                    '& input': { py: '12px', px: '16px', color: '#ffffff' },
                  }}
                />

                <Typography sx={{ fontSize: '0.8rem', color: '#d4d4d4', fontWeight: 600, mb: 1 }}>
                  Подтвердите пароль
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Повторите новый пароль"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={resetLoading}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            edge="end"
                            size="small"
                            tabIndex={-1}
                            sx={{ color: '#737373' }}
                          >
                            {showConfirmPassword ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#262626',
                      borderRadius: '12px',
                      color: '#ffffff',
                      fontSize: '0.9rem',
                      '& fieldset': { border: 'none' },
                      '&:hover': { backgroundColor: '#2e2e2e' },
                      '&.Mui-focused': { backgroundColor: '#2a2a2d', boxShadow: '0 0 0 2px #3b82f6' },
                    },
                    '& input': { py: '12px', px: '16px', color: '#ffffff' },
                  }}
                />
              </Box>
              <Button
                type="submit"
                variant="contained"
                disableElevation
                disabled={resetLoading || resetSuccess}
                sx={{
                  mt: 1,
                  py: 1.3,
                  backgroundColor: '#ffffff',
                  color: '#171717',
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  '&:hover': {
                    backgroundColor: '#e5e5e5',
                  },
                }}
              >
                {resetLoading ? <CircularProgress size={20} color="inherit" /> : "Изменить пароль"}
              </Button>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
