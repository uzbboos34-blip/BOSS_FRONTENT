import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Box, Typography, Button, Paper, TextField, MenuItem, Select, FormControl,
  BottomNavigation, BottomNavigationAction, Chip, Stack, List, ListItem,
  ListItemText, Divider, LinearProgress, Alert, IconButton, Drawer, Dialog,
  DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import ListAltIcon from '@mui/icons-material/ListAlt';
import BarChartIcon from '@mui/icons-material/BarChart';
import LogoutIcon from '@mui/icons-material/Logout';
import RefreshIcon from '@mui/icons-material/Refresh';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import HelpOutlinedIcon from '@mui/icons-material/HelpOutlined';
import SettingsIcon from '@mui/icons-material/Settings';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import CloseIcon from '@mui/icons-material/Close';
import { keyframes } from '@mui/system';

const STATUS_OPTIONS = [
  { value: 'PRESENT', label: 'Присутствует', color: '#10b981', bg: '#ecfdf5' },
  { value: 'ABSENT', label: 'Отсутствует', color: '#ef4444', bg: '#fef2f2' },
  { value: 'LATE', label: 'Опоздал', color: '#f59e0b', bg: '#fffbeb' },
  { value: 'VACATION', label: 'В отпуске', color: '#3b82f6', bg: '#eff6ff' },
  { value: 'SICK', label: 'Болеет', color: '#8b5cf6', bg: '#f5f3ff' },
];

const SESSION_OPTIONS = [
  { value: 1, label: 'Утро (Ertalab)' },
  { value: 2, label: 'Обед (Tush)' },
  { value: 3, label: 'Вечер (Kech)' },
];

const scanAnimation = keyframes`
  0% { top: 0%; }
  50% { top: 100%; }
  100% { top: 0%; }
`;

export default function SupervisorDashboard() {
  const [tab, setTab] = useState(0); // 0 = Scanner, 1 = Journal, 2 = Stats
  const [scanMode, setScanMode] = useState('camera'); // 'camera', 'hardware', 'manual'
  const [session, setSession] = useState(1);
  const [status, setStatus] = useState('PRESENT');
  const [qrCode, setQrCode] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [submittingScan, setSubmittingScan] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const inputRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  // Focus hidden input only in hardware mode to avoid keyboard popups
  useEffect(() => {
    const handleGlobalClick = () => {
      if (tab === 0 && scanMode === 'hardware' && inputRef.current) {
        inputRef.current.focus();
      }
    };

    if (tab === 0 && scanMode === 'hardware') {
      document.addEventListener('click', handleGlobalClick);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 150);
    }
    return () => {
      document.removeEventListener('click', handleGlobalClick);
    };
  }, [tab, scanMode]);

  // Live camera scan using html5-qrcode
  useEffect(() => {
    let isMounted = true;
    let scanner = null;

    const startCamera = async () => {
      try {
        // Double check reader div exists in DOM
        const el = document.getElementById('reader');
        if (!el) return;

        scanner = new Html5Qrcode('reader');
        html5QrCodeRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            autoSubmitScan(decodedText);
          },
          () => {} // silent error parser
        );
      } catch (err) {
        console.error('Html5Qrcode start failed:', err);
        if (isMounted) {
          setErrorMsg('Не удалось запустить камеру. Проверьте разрешения камеры.');
        }
      }
    };

    if (tab === 0 && scanMode === 'camera') {
      // Give React 150ms to mount the #reader DOM element
      const timer = setTimeout(() => {
        startCamera();
      }, 150);

      return () => {
        isMounted = false;
        clearTimeout(timer);
        if (scanner) {
          if (scanner.isScanning) {
            scanner.stop().catch(err => console.error('Html5Qrcode stop failed:', err));
          }
        }
      };
    }
  }, [tab, scanMode]);

  // Journal states
  const [journalSession, setJournalSession] = useState(1);
  const [journalSubTab, setJournalSubTab] = useState(0); // 0 = Scanned, 1 = Remaining
  const [assignedWorkers, setAssignedWorkers] = useState([]);
  const [myAttendances, setMyAttendances] = useState([]);
  const [loadingJournal, setLoadingJournal] = useState(false);

  // Stats states
  const [stats, setStats] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);

  // Auth/Supervisor details
  const [supervisorId, setSupervisorId] = useState(null);
  const [supervisorName, setSupervisorName] = useState('');

  const tokenVal = () => localStorage.getItem('token');

  // Decode JWT safely
  useEffect(() => {
    const token = tokenVal();
    if (!token || token === 'undefined') {
      window.location.href = '/login';
      return;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setSupervisorId(payload.id);
      setSupervisorName(payload.fullName || 'Супервайзер');
    } catch (e) {
      console.error('Failed to parse token payload:', e);
      window.location.href = '/login';
    }
  }, []);

  // Auto detect current session based on time
  useEffect(() => {
    const hours = new Date().getHours();
    let currentSession = 1;
    if (hours >= 12 && hours < 18) {
      currentSession = 2;
    } else if (hours >= 18 || hours < 5) {
      currentSession = 3;
    }
    setSession(currentSession);
    setJournalSession(currentSession);
  }, []);

  // Fetch journal data
  const fetchJournal = async () => {
    if (!supervisorId) return;
    setLoadingJournal(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const [workersRes, attRes] = await Promise.all([
        api.get(`/api/v1/attendance/supervisor/${supervisorId}/workers`),
        api.get('/api/v1/attendance/my', { params: { date: todayStr } })
      ]);
      setAssignedWorkers(workersRes.data?.assignedWorkers || []);
      setMyAttendances(attRes.data || []);
    } catch (e) {
      console.error('Failed to load journal:', e);
    } finally {
      setLoadingJournal(false);
    }
  };

  // Fetch stats data
  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await api.get('/api/v1/attendance/supervisor-stats', { params: { date: todayStr } });
      setStats(res.data || []);
    } catch (e) {
      console.error('Failed to load stats:', e);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (tab === 1 && supervisorId) {
      fetchJournal();
    } else if (tab === 2) {
      fetchStats();
    }
  }, [tab, supervisorId]);

  // Operations
  const autoSubmitScan = async (codeToSubmit) => {
    if (submittingScan) return;
    setSubmittingScan(true);
    setErrorMsg('');
    setScanResult(null);
    setQrCode(''); // Clear the input field immediately
    
    try {
      const res = await api.post('/api/v1/attendance/scan', {
        qrCode: codeToSubmit,
        status,
        session: Number(session)
      });
      setScanResult(res.data?.data || { success: true, message: res.data?.message || 'Успешно!' });
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Не удалось отправить посещение');
    } finally {
      setSubmittingScan(false);
      // Auto-refocus the text input field
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 150);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQrCode(val);

    // If the input value contains a colon, split it, take the first part and auto submit immediately
    if (val.includes(':')) {
      const prefix = val.split(':')[0].trim();
      if (prefix) {
        autoSubmitScan(prefix);
      }
    }
  };

  const handleScanSubmit = async (e) => {
    if (e) e.preventDefault();
    let finalCode = qrCode.trim();
    if (finalCode.includes(':')) {
      finalCode = finalCode.split(':')[0].trim();
    }
    if (!finalCode) {
      setErrorMsg('Пожалуйста, введите QR-код / Паспорт');
      setScanResult(null);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 150);
      return;
    }
    await autoSubmitScan(finalCode);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  // Filter logs for today
  const scannedToday = myAttendances.filter(a => a.session === Number(journalSession));
  const scannedWorkerIds = new Set(scannedToday.map(a => a.workerId));
  const remainingWorkers = assignedWorkers.filter(w => !scannedWorkerIds.has(w.id));

  const getStatusLabel = (statusVal) => {
    const opt = STATUS_OPTIONS.find(o => o.value === statusVal);
    return opt ? opt.label : statusVal;
  };

  const getStatusColor = (statusVal) => {
    const opt = STATUS_OPTIONS.find(o => o.value === statusVal);
    return opt ? opt.color : '#6b7280';
  };

  const getStatusBg = (statusVal) => {
    const opt = STATUS_OPTIONS.find(o => o.value === statusVal);
    return opt ? opt.bg : '#f3f4f6';
  };

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Mobile-centric Header */}
      <Box sx={{
        position: 'sticky',
        top: 0,
        zIndex: 1100,
        backgroundColor: '#fff',
        borderBottom: '1px solid #e2e8f0',
        px: 2,
        py: 1.5,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon points="16,2 29,9 29,23 16,30 3,23 3,9" fill="#7b61ff" stroke="#7b61ff" strokeWidth="1.5" strokeLinejoin="round"/>
            <text x="16" y="18" dominantBaseline="middle" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="900">B</text>
          </svg>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', lineHeight: 1.2 }}>BOSS</Typography>
            <Typography sx={{ fontSize: '0.68rem', color: '#64748b' }}>{supervisorName}</Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={handleLogout} sx={{ color: '#ef4444', border: '1px solid #fecaca', borderRadius: '8px', p: 0.8 }}>
          <LogoutIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      {/* Main Content Area */}
      <Box sx={{
        flexGrow: 1,
        maxWidth: '480px',
        width: '100%',
        mx: 'auto',
        p: 2,
        pb: 10, // padding at bottom to not get cut by BottomNavigation
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }}>

        {/* ─── View 0: Scanner Simulator ─── */}
        {tab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>


            {/* Current parameters chip */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
              <Chip
                label={`Смена: ${SESSION_OPTIONS.find(o => o.value === session)?.label} • Статус: ${STATUS_OPTIONS.find(o => o.value === status)?.label}`}
                onClick={() => setSettingsOpen(true)}
                onDelete={() => setSettingsOpen(true)}
                deleteIcon={<SettingsIcon sx={{ '&&': { color: '#7b61ff' } }} />}
                sx={{
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  borderRadius: '12px',
                  border: '1px dashed #7b61ff',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  px: 1.5,
                  py: 2.2,
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: '#e2e8f0' }
                }}
              />
            </Box>

            {/* Mode selection tabs */}
            <Box sx={{ display: 'flex', borderRadius: '12px', backgroundColor: '#f1f5f9', p: 0.5, mb: 1 }}>
              <Button
                fullWidth
                onClick={() => { setScanMode('camera'); setScanResult(null); setErrorMsg(''); setQrCode(''); }}
                sx={{
                  textTransform: 'none',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  py: 0.8,
                  backgroundColor: scanMode === 'camera' ? '#fff' : 'transparent',
                  color: scanMode === 'camera' ? '#7b61ff' : '#64748b',
                  boxShadow: scanMode === 'camera' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                  '&:hover': { backgroundColor: scanMode === 'camera' ? '#fff' : 'transparent' }
                }}
              >
                Камера
              </Button>
              <Button
                fullWidth
                onClick={() => { setScanMode('hardware'); setScanResult(null); setErrorMsg(''); setQrCode(''); }}
                sx={{
                  textTransform: 'none',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  py: 0.8,
                  backgroundColor: scanMode === 'hardware' ? '#fff' : 'transparent',
                  color: scanMode === 'hardware' ? '#7b61ff' : '#64748b',
                  boxShadow: scanMode === 'hardware' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                  '&:hover': { backgroundColor: scanMode === 'hardware' ? '#fff' : 'transparent' }
                }}
              >
                Сканер (Без клав.)
              </Button>
              <Button
                fullWidth
                onClick={() => { setScanMode('manual'); setScanResult(null); setErrorMsg(''); setQrCode(''); }}
                sx={{
                  textTransform: 'none',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  py: 0.8,
                  backgroundColor: scanMode === 'manual' ? '#fff' : 'transparent',
                  color: scanMode === 'manual' ? '#7b61ff' : '#64748b',
                  boxShadow: scanMode === 'manual' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                  '&:hover': { backgroundColor: scanMode === 'manual' ? '#fff' : 'transparent' }
                }}
              >
                Вручную
              </Button>
            </Box>

            {/* ─── Mode 1: Camera Scan ─── */}
            {scanMode === 'camera' && (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
                <Paper elevation={0} sx={{
                  position: 'relative',
                  width: 280,
                  height: 280,
                  borderRadius: '24px',
                  border: '3px solid #7b61ff',
                  boxShadow: '0 0 30px rgba(123,97,255,0.4)',
                  backgroundColor: '#0f172a',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  // Hide library default shaded region and borders
                  '& #qr-shaded-region': { display: 'none !important' }
                }}>
                  {/* html5-qrcode video viewport container */}
                  <Box id="reader" sx={{ 
                    width: '100%', 
                    height: '100%', 
                    '& video': { objectFit: 'cover !important', width: '100% !important', height: '100% !important' } 
                  }} />

                  {/* Custom Perfect Square Viewfinder Overlay */}
                  <Box sx={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '180px',
                    height: '180px',
                    border: '3px solid #ffffff',
                    borderRadius: '20px',
                    boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.6)', // Shaded backdrop mask
                    zIndex: 10,
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {/* Pulsing Scan Radar overlay inside the square */}
                    <Box sx={{
                      position: 'absolute',
                      left: 0,
                      width: '100%',
                      height: '3px',
                      background: 'linear-gradient(to right, rgba(123,97,255,0), #7b61ff, rgba(123,97,255,0))',
                      boxShadow: '0 0 15px #7b61ff',
                      animation: `${scanAnimation} 3.5s linear infinite`
                    }} />
                  </Box>

                  <Typography sx={{ 
                    position: 'absolute',
                    bottom: 15,
                    color: '#cbd5e1', 
                    fontSize: '0.72rem', 
                    fontWeight: 700, 
                    zIndex: 12,
                    backgroundColor: 'rgba(15,23,42,0.8)',
                    px: 1.5,
                    py: 0.5,
                    borderRadius: '20px'
                  }}>
                    Наведите камеру на QR-код
                  </Typography>
                </Paper>
              </Box>
            )}

            {/* ─── Mode 2: Hardware Laser Scanner ─── */}
            {scanMode === 'hardware' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
                  <Paper elevation={0} sx={{
                    position: 'relative',
                    width: 280,
                    height: 280,
                    borderRadius: '24px',
                    border: '3px solid #64748b',
                    boxShadow: '0 0 30px rgba(100,116,139,0.3)',
                    backgroundColor: '#0f172a',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {/* Viewfinder brackets */}
                    <Box sx={{
                      width: 170,
                      height: 170,
                      border: '2px dashed rgba(255, 255, 255, 0.3)',
                      borderRadius: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <QrCodeScannerIcon sx={{ fontSize: 76, color: 'rgba(255,255,255,0.7)' }} />
                    </Box>
                    <Typography sx={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 650, mt: 2.5, px: 2, textAlign: 'center' }}>
                      Используйте внешний/аппаратный лазерный сканер
                    </Typography>
                  </Paper>
                </Box>

                {/* Hardware Scanner Status Indicator */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1.5,
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                  }}
                >
                  <Box sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    boxShadow: '0 0 10px #10b981',
                    animation: 'pulse 2s infinite',
                    '@keyframes pulse': {
                      '0%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.7)' },
                      '70%': { transform: 'scale(1)', boxShadow: '0 0 0 10px rgba(16, 185, 129, 0)' },
                      '100%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(16, 185, 129, 0)' }
                    }
                  }} />
                  <Typography sx={{ fontWeight: 750, fontSize: '0.82rem', color: '#1e293b' }}>
                    Готов к приему кодов без клавиатуры
                  </Typography>
                </Paper>
              </Box>
            )}

            {/* ─── Mode 3: Manual Text Input ─── */}
            {scanMode === 'manual' && (
              <Paper elevation={0} sx={{
                p: 3,
                my: 1,
                borderRadius: '20px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#fff',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
              }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 750, color: '#334155', fontSize: '0.85rem' }}>
                  Ввод номера паспорта или QR-кода вручную
                </Typography>
                <Box component="form" onSubmit={handleScanSubmit} sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    size="small"
                    fullWidth
                    label="Паспорт или QR-код"
                    placeholder="Например, U252000006"
                    value={qrCode}
                    onChange={(e) => setQrCode(e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-root': { borderRadius: '8px' }
                    }}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={submittingScan}
                    sx={{
                      backgroundColor: '#7b61ff',
                      borderRadius: '8px',
                      textTransform: 'none',
                      fontWeight: 700,
                      px: 3,
                      '&:hover': { backgroundColor: '#6a50e8' }
                    }}
                  >
                    Ок
                  </Button>
                </Box>
              </Paper>
            )}

            {/* Scan Feedback State Messages */}
            {scanResult && (
              <Alert icon={<CheckCircleOutlinedIcon fontSize="inherit" />} severity="success" sx={{ borderRadius: '12px' }}>
                {scanResult.workerName ? (
                  <strong>"{scanResult.workerName}" отмечен: {getStatusLabel(scanResult.status)}</strong>
                ) : (
                  scanResult.message || 'Успешно зарегистрировано!'
                )}
              </Alert>
            )}

            {errorMsg && (
              <Alert severity="error" sx={{ borderRadius: '12px' }}>
                {errorMsg}
              </Alert>
            )}

            {/* Hidden Scanner Form to receive hardware scans */}
            <Box
              component="form"
              onSubmit={handleScanSubmit}
              sx={{
                position: 'absolute',
                left: '-9999px',
                top: '-9999px',
                opacity: 0,
                width: 0,
                height: 0,
                overflow: 'hidden'
              }}
            >
              <input
                ref={inputRef}
                type="text"
                value={qrCode}
                onChange={handleInputChange}
                inputMode={scanMode === 'hardware' ? 'none' : 'text'}
                autoFocus
              />
            </Box>

            {/* Scanner Status Indicator */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: '20px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1.5,
                mt: 1,
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)'
              }}
            >
              {/* Pulsing Green Indicator */}
              <Box sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: '#10b981',
                boxShadow: '0 0 10px #10b981',
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.7)' },
                  '70%': { transform: 'scale(1)', boxShadow: '0 0 0 10px rgba(16, 185, 129, 0)' },
                  '100%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(16, 185, 129, 0)' }
                }
              }} />
              <Typography sx={{ fontWeight: 750, fontSize: '0.85rem', color: '#1e293b' }}>
                Сканер готов к автоматическому приему кодов
              </Typography>
            </Paper>

            {/* ─── Shift Settings Dialog ─── */}
            <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)}
              PaperProps={{ sx: { borderRadius: '20px', width: '380px', maxWidth: '90vw' } }}>
              <DialogTitle sx={{ fontWeight: 800, fontSize: '1.1rem', pb: 1 }}>
                Параметры смены
              </DialogTitle>
              <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1.5 }}>
                <FormControl size="small" fullWidth sx={{ mt: 1 }}>
                  <Typography sx={{ mb: 0.8, fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>Смена</Typography>
                  <Select
                    value={session}
                    onChange={(e) => setSession(e.target.value)}
                    sx={{ borderRadius: '8px' }}
                  >
                    {SESSION_OPTIONS.map(o => (
                      <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <Typography sx={{ mb: 0.8, fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>Статус по умолчанию</Typography>
                  <Select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    sx={{ borderRadius: '8px' }}
                  >
                    {STATUS_OPTIONS.map(o => (
                      <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </DialogContent>
              <DialogActions sx={{ p: 2.5, pt: 1 }}>
                <Button variant="contained" fullWidth onClick={() => setSettingsOpen(false)} sx={{ backgroundColor: '#7b61ff', borderRadius: '10px', textTransform: 'none', fontWeight: 700, py: 1.2, '&:hover': { backgroundColor: '#6a50e8' } }}>
                  Применить
                </Button>
              </DialogActions>
            </Dialog>
          </Box>
        )}

        {/* ─── View 1: Logs / Journal (Marked & Remaining) ─── */}
        {tab === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>Сводка за сегодня</Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Список отмеченных и оставшихся сотрудников.
                </Typography>
              </Box>
              <IconButton size="small" onClick={fetchJournal} disabled={loadingJournal} sx={{ border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <RefreshIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>

            {/* Shift Select & Subtabs Toggle */}
            <Paper elevation={0} sx={{ p: 2, borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Выбрать смену:</Typography>
                <FormControl size="small" sx={{ flexGrow: 1 }}>
                  <Select
                    value={journalSession}
                    onChange={(e) => setJournalSession(e.target.value)}
                    sx={{ borderRadius: '8px' }}
                  >
                    {SESSION_OPTIONS.map(o => (
                      <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ display: 'flex', borderRadius: '10px', backgroundColor: '#f1f5f9', p: 0.5 }}>
                <Button
                  fullWidth
                  onClick={() => setJournalSubTab(0)}
                  sx={{
                    textTransform: 'none',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    py: 0.8,
                    backgroundColor: journalSubTab === 0 ? '#fff' : 'transparent',
                    color: journalSubTab === 0 ? '#7b61ff' : '#64748b',
                    boxShadow: journalSubTab === 0 ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                    '&:hover': { backgroundColor: journalSubTab === 0 ? '#fff' : 'transparent' }
                  }}
                >
                  Отмеченные ({scannedToday.length})
                </Button>
                <Button
                  fullWidth
                  onClick={() => setJournalSubTab(1)}
                  sx={{
                    textTransform: 'none',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    py: 0.8,
                    backgroundColor: journalSubTab === 1 ? '#fff' : 'transparent',
                    color: journalSubTab === 1 ? '#7b61ff' : '#64748b',
                    boxShadow: journalSubTab === 1 ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                    '&:hover': { backgroundColor: journalSubTab === 1 ? '#fff' : 'transparent' }
                  }}
                >
                  Оставшиеся ({remainingWorkers.length})
                </Button>
              </Box>
            </Paper>

            {/* List Output */}
            <Paper elevation={0} sx={{ borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              {loadingJournal ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography sx={{ color: '#64748b', fontSize: '0.85rem' }}>Загрузка списков...</Typography>
                </Box>
              ) : journalSubTab === 0 ? (
                /* Scanned List */
                scannedToday.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>В этой смене пока никто не отмечен</Typography>
                  </Box>
                ) : (
                  <List disablePadding>
                    {scannedToday.map((item, idx) => (
                      <Box key={item.id}>
                        {idx > 0 && <Divider />}
                        <ListItem sx={{ py: 1.5 }}>
                          <ListItemText
                            primary={
                              <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                                {item.worker?.fullName}
                              </Typography>
                            }
                            secondary={
                              <Typography sx={{ fontSize: '0.72rem', color: '#64748b' }}>
                                Паспорт: {item.worker?.passport || '—'} | Время: {new Date(item.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                              </Typography>
                            }
                          />
                          <Chip
                            size="small"
                            label={getStatusLabel(item.status)}
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.7rem',
                              backgroundColor: getStatusBg(item.status),
                              color: getStatusColor(item.status),
                              borderRadius: '6px'
                            }}
                          />
                        </ListItem>
                      </Box>
                    ))}
                  </List>
                )
              ) : (
                /* Remaining List */
                remainingWorkers.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: 'center', bgcolor: '#ecfdf5' }}>
                    <CheckCircleOutlinedIcon sx={{ color: '#10b981', fontSize: 32, mb: 1 }} />
                    <Typography sx={{ color: '#065f46', fontSize: '0.85rem', fontWeight: 600 }}>Все сотрудники отмечены!</Typography>
                  </Box>
                ) : (
                  <List disablePadding>
                    {remainingWorkers.map((item, idx) => (
                      <Box key={item.id}>
                        {idx > 0 && <Divider />}
                        <ListItem sx={{ py: 1.5 }}>
                          <ListItemText
                            primary={
                              <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                                {item.fullName}
                              </Typography>
                            }
                            secondary={
                              <Typography sx={{ fontSize: '0.72rem', color: '#64748b' }}>
                                Паспорт: {item.passport || '—'} | Должность: {item.position || '—'}
                              </Typography>
                            }
                          />
                          <Chip
                            icon={<HelpOutlinedIcon sx={{ '&&': { color: '#64748b', fontSize: '14px' } }} />}
                            size="small"
                            label="Не отмечен"
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.7rem',
                              backgroundColor: '#f1f5f9',
                              color: '#64748b',
                              borderRadius: '6px'
                            }}
                          />
                        </ListItem>
                      </Box>
                    ))}
                  </List>
                )
              )}
            </Paper>
          </Box>
        )}

        {/* ─── View 2: Cross-Supervisor Stats ─── */}
        {tab === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>Статистика постов</Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Сравнение количества отмеченных сотрудников по супервайзерам за сегодня.
                </Typography>
              </Box>
              <IconButton size="small" onClick={fetchStats} disabled={loadingStats} sx={{ border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <RefreshIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>

            {/* Stats Comparison List */}
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 3 }}>
              {loadingStats ? (
                <Typography sx={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center' }}>Загрузка статистики...</Typography>
              ) : stats.length === 0 ? (
                <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center' }}>Статистика недоступна</Typography>
              ) : (
                stats.map((sup) => {
                  const maxCount = Math.max(...stats.map(s => s.totalCount), 1);
                  const percentage = Math.round((sup.totalCount / maxCount) * 100);

                  return (
                    <Box key={sup.supervisorId}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: '#334155' }}>
                          {sup.supervisorName}
                        </Typography>
                        <Chip
                          size="small"
                          label={`${sup.totalCount} раб.`}
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.72rem',
                            backgroundColor: '#f3e8ff',
                            color: '#7b61ff',
                            borderRadius: '6px'
                          }}
                        />
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={percentage}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: '#f1f5f9',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: '#7b61ff',
                            borderRadius: 4
                          }
                        }}
                      />
                      <Stack direction="row" spacing={1.5} sx={{ mt: 0.6 }}>
                        <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 600 }}>прис: {sup.presentCount}</Typography>
                        <Typography variant="caption" sx={{ color: '#ef4444', fontWeight: 600 }}>отс: {sup.absentCount}</Typography>
                        <Typography variant="caption" sx={{ color: '#f59e0b', fontWeight: 600 }}>опозд: {sup.lateCount}</Typography>
                      </Stack>
                    </Box>
                  );
                })
              )}
            </Paper>
          </Box>
        )}

      </Box>

      {/* Mobile-centric Bottom Navigation Bar */}
      <Paper elevation={10} sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
        borderTop: '1px solid #e2e8f0',
        borderRadius: '16px 16px 0 0',
        overflow: 'hidden'
      }}>
        <BottomNavigation
          showLabels
          value={tab}
          onChange={(e, v) => setTab(v)}
          sx={{
            height: 64,
            '& .MuiBottomNavigationAction-root': { py: 1 },
            '& .Mui-selected': { color: '#7b61ff !important', '& .MuiSvgIcon-root': { color: '#7b61ff' } },
            '& .MuiBottomNavigationAction-label': { fontSize: '0.68rem', fontWeight: 600, color: '#64748b' },
            '& .Mui-selected .MuiBottomNavigationAction-label': { fontSize: '0.75rem', fontWeight: 700 }
          }}
        >
          <BottomNavigationAction label="Сканер" icon={<QrCodeScannerIcon sx={{ fontSize: 24, color: '#64748b' }} />} />
          <BottomNavigationAction label="Журнал" icon={<ListAltIcon sx={{ fontSize: 24, color: '#64748b' }} />} />
          <BottomNavigationAction label="Статистика" icon={<BarChartIcon sx={{ fontSize: 24, color: '#64748b' }} />} />
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
