import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Box, Typography, Button, Paper, TextField, MenuItem, Select, FormControl,
  BottomNavigation, BottomNavigationAction, Chip, Stack, List, ListItem,
  ListItemText, Divider, LinearProgress, Alert, IconButton, Drawer, Dialog,
  DialogTitle, DialogContent, DialogActions, Radio, RadioGroup, FormControlLabel,
  CircularProgress
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

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const scaleUp = keyframes`
  from { transform: scale(0.6); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
`;


export default function SupervisorDashboard() {
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token || token === 'undefined') {
      window.location.href = '/login';
    }
  }, [token]);

  if (!token || token === 'undefined') {
    return null;
  }

  const [tab, setTab] = useState(() => {
    const saved = localStorage.getItem('supervisor_active_tab');
    return saved !== null ? Number(saved) : 0;
  }); // 0 = Scanner, 1 = Journal, 2 = Stats
  const [scanMode, setScanMode] = useState('camera'); // 'camera', 'manual'
  const [session, setSession] = useState(1);
  const [status, setStatus] = useState('PRESENT');
  const [qrCode, setQrCode] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [submittingScan, setSubmittingScan] = useState(false);
  const [cooldownActive, setCooldownActive] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Remaining list choice dialog states
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState('ABSENT');
  const [customReason, setCustomReason] = useState('');
  const [savingReason, setSavingReason] = useState(false);

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingScans, setPendingScans] = useState([]);
  const [syncingOffline, setSyncingOffline] = useState(false);

  // Load pending scans from local storage
  const loadPendingScans = () => {
    try {
      const saved = localStorage.getItem('pending_scans');
      setPendingScans(saved ? JSON.parse(saved) : []);
    } catch (e) {
      console.error('Failed to load pending scans:', e);
    }
  };

  const syncPendingScans = async () => {
    if (syncingOffline) return;
    setSyncingOffline(true);
    try {
      const saved = localStorage.getItem('pending_scans');
      const queue = saved ? JSON.parse(saved) : [];
      if (queue.length === 0) return;

      const remainingQueue = [];
      let hasError = false;

      for (const scan of queue) {
        if (hasError) {
          remainingQueue.push(scan);
          continue;
        }

        try {
          await api.post('/api/v1/attendance/scan', {
            qrCode: scan.qrCode,
            status: scan.status,
            session: Number(scan.session),
            date: scan.date,
            note: scan.note || undefined,
          });
        } catch (err) {
          const statusVal = err.response?.status;
          const msg = err.response?.data?.message || '';
          
          if (statusVal === 400 && (msg.includes('allaqachon') || msg.includes('уже') || msg.includes('найден') || msg.includes('topilmadi'))) {
            console.warn('Skipping invalid scan during sync:', scan, msg);
            continue;
          } else {
            console.error('Sync failed for scan:', scan, err);
            remainingQueue.push(scan);
            hasError = true;
          }
        }
      }

      localStorage.setItem('pending_scans', JSON.stringify(remainingQueue));
      setPendingScans(remainingQueue);

      if (!hasError) {
        fetchJournal();
      }
    } catch (e) {
      console.error('Offline sync failed:', e);
    } finally {
      setSyncingOffline(false);
    }
  };

  useEffect(() => {
    loadPendingScans();
  }, []);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-sync when online and there are pending items
  useEffect(() => {
    if (isOnline && pendingScans.length > 0) {
      syncPendingScans();
    }
  }, [isOnline, pendingScans.length]);

  const html5QrCodeRef = useRef(null);

  // Live camera scan using html5-qrcode
  useEffect(() => {
    let isMounted = true;
    let scanner = null;

    const startCamera = async () => {
      try {
        if (!isMounted) return;
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

        if (!isMounted) {
          if (scanner.isScanning) {
            await scanner.stop();
          }
        }
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
  const [journalDate, setJournalDate] = useState(new Date().toISOString().split('T')[0]);
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
      const [workersRes, attRes] = await Promise.all([
        api.get(`/api/v1/attendance/supervisor/${supervisorId}/workers`),
        api.get('/api/v1/attendance/my', { params: { date: journalDate } })
      ]);
      const workersList = workersRes.data?.assignedWorkers || [];
      const attList = attRes.data || [];
      setAssignedWorkers(workersList);
      setMyAttendances(attList);
      localStorage.setItem(`cached_workers_${supervisorId}`, JSON.stringify(workersList));
    } catch (e) {
      console.error('Failed to load journal:', e);
      if (!navigator.onLine) {
        const cached = localStorage.getItem(`cached_workers_${supervisorId}`);
        if (cached) {
          setAssignedWorkers(JSON.parse(cached));
        }
      }
    } finally {
      setLoadingJournal(false);
    }
  };

  // Fetch stats data
  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await api.get('/api/v1/attendance/supervisor-stats', { params: { date: journalDate } });
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
  }, [tab, supervisorId, journalDate, journalSession]);

  // Operations
  const triggerSuccessFeedback = () => {
    // 1. Sound Feedback (Pleasant sine wave beep at 880Hz)
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        const audioCtx = new AudioCtxClass();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.12); // Duration 120ms
      }
    } catch (e) {
      console.warn('Audio feedback blocked or unsupported:', e);
    }

    // 2. Tactile / Haptic Vibration
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }

    // 3. Display Success Overlay & Enable Scan Cooldown
    setShowSuccessOverlay(true);
    setCooldownActive(true);

    setTimeout(() => {
      setShowSuccessOverlay(false);
      setCooldownActive(false);
    }, 2000); // 2-second lock/cooldown
  };

  const autoSubmitScan = async (codeToSubmit) => {
    let cleanCode = codeToSubmit ? String(codeToSubmit).trim() : '';
    if (cleanCode.includes(':')) {
      cleanCode = cleanCode.split(':')[0].trim();
    }

    if (submittingScan || cooldownActive) return;
    setSubmittingScan(true);
    setErrorMsg('');
    setScanResult(null);
    setQrCode(''); // Clear the input field immediately
    
    if (!navigator.onLine) {
      try {
        const cached = localStorage.getItem(`cached_workers_${supervisorId}`);
        const cachedWorkersList = cached ? JSON.parse(cached) : [];
        const worker = cachedWorkersList.find(w => w.qrCode === cleanCode || w.passport === cleanCode);
        const workerName = worker ? worker.fullName : `Ishchi (${cleanCode})`;

        const isDuplicate = pendingScans.some(
          p => (p.qrCode === cleanCode || (worker && p.qrCode === worker.qrCode)) &&
          p.date === journalDate &&
          p.session === Number(session)
        );
        if (isDuplicate) {
          throw new Error('Ishchi ushbu sessiya uchun allaqachon oflayn belgilangan');
        }

        const newScan = {
          id: Math.random().toString(36).substring(2, 9),
          qrCode: worker ? worker.qrCode : cleanCode,
          status,
          session: Number(session),
          date: journalDate,
          note: null,
          workerName,
          passport: worker ? worker.passport : '',
          createdAt: new Date().toISOString()
        };

        const updatedPending = [...pendingScans, newScan];
        localStorage.setItem('pending_scans', JSON.stringify(updatedPending));
        setPendingScans(updatedPending);

        setScanResult({
          workerName,
          status,
          message: 'Сохранено локально (офлайн)'
        });

        triggerSuccessFeedback();
      } catch (err) {
        setErrorMsg(err.message || 'Не удалось сохранить офлайн');
        // Prevent immediate retry spam on error
        setCooldownActive(true);
        setTimeout(() => {
          setCooldownActive(false);
        }, 2000);
      } finally {
        setSubmittingScan(false);
      }
      return;
    }

    try {
      const res = await api.post('/api/v1/attendance/scan', {
        qrCode: cleanCode,
        status,
        session: Number(session),
        date: journalDate
      });
      const data = res.data?.data || { success: true, message: res.data?.message || 'Успешно!' };
      setScanResult(data);
      triggerSuccessFeedback();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Не удалось отправить посещение');
      // Prevent immediate retry spam on error
      setCooldownActive(true);
      setTimeout(() => {
        setCooldownActive(false);
      }, 2000);
    } finally {
      setSubmittingScan(false);
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
      return;
    }
    await autoSubmitScan(finalCode);
  };

  const handleSaveReason = async () => {
    if (!selectedWorker) return;
    setSavingReason(true);
    setErrorMsg('');
    setScanResult(null);

    const isCustom = selectedReason === 'CUSTOM';
    const finalStatus = isCustom ? 'ABSENT' : selectedReason;
    const note = isCustom ? customReason.trim() : null;

    if (!navigator.onLine) {
      try {
        const isDuplicate = pendingScans.some(
          p => p.qrCode === selectedWorker.qrCode &&
          p.date === journalDate &&
          p.session === Number(journalSession)
        );
        if (isDuplicate) {
          throw new Error('Ishchi ushbu sessiya uchun allaqachon oflayn belgilangan');
        }

        const newScan = {
          id: Math.random().toString(36).substring(2, 9),
          qrCode: selectedWorker.qrCode,
          status: finalStatus,
          session: Number(journalSession),
          date: journalDate,
          note,
          workerName: selectedWorker.fullName,
          passport: selectedWorker.passport,
          createdAt: new Date().toISOString()
        };

        const updatedPending = [...pendingScans, newScan];
        localStorage.setItem('pending_scans', JSON.stringify(updatedPending));
        setPendingScans(updatedPending);

        setScanResult({
          workerName: selectedWorker.fullName,
          status: finalStatus,
          message: 'Сохранено локально (офлайн)'
        });
        setReasonDialogOpen(false);
      } catch (err) {
        alert(err.message || 'Не удалось сохранить офлайн');
      } finally {
        setSavingReason(false);
      }
      return;
    }

    try {
      const res = await api.post('/api/v1/attendance/scan', {
        qrCode: selectedWorker.qrCode,
        status: finalStatus,
        session: Number(journalSession),
        date: journalDate,
        note
      });
      
      setScanResult(res.data?.data || { success: true, message: res.data?.message || 'Успешно отмечен!' });
      setReasonDialogOpen(false);
      fetchJournal();
    } catch (err) {
      alert('Ошибка: ' + (err.response?.data?.message || 'Не удалось сохранить причину'));
    } finally {
      setSavingReason(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Filter logs for selected date
  const activePending = pendingScans.filter(
    p => p.date === journalDate && p.session === Number(journalSession)
  );

  const scannedForDate = myAttendances.filter(a => a.session === Number(journalSession));

  // Combine synced and pending offline scans to compute lists correctly
  const scannedWorkerIds = new Set([
    ...scannedForDate.map(a => a.workerId),
    ...activePending.map(p => {
      const w = assignedWorkers.find(x => x.qrCode === p.qrCode || x.passport === p.passport);
      return w ? w.id : null;
    }).filter(id => id !== null)
  ]);

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
      {/* Tarmoq holati bannerlari (Offline status banners) */}
      {!isOnline && (
        <Box sx={{
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          borderBottom: '1px solid #fca5a5',
          px: 2,
          py: 1,
          textAlign: 'center',
          fontSize: '0.78rem',
          fontWeight: 700
        }}>
          Режим офлайн. Данные сохраняются локально и отправятся при подключении к сети.
        </Box>
      )}

      {syncingOffline && (
        <Box sx={{
          backgroundColor: '#e0f2fe',
          color: '#0369a1',
          borderBottom: '1px solid #bae6fd',
          px: 2,
          py: 1,
          textAlign: 'center',
          fontSize: '0.78rem',
          fontWeight: 700,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 1
        }}>
          <CircularProgress size={12} color="inherit" />
          Синхронизация офлайн-данных...
        </Box>
      )}

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
                label={`Дата: ${formatDate(journalDate)} • Смена: ${SESSION_OPTIONS.find(o => o.value === session)?.label}`}
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

                  {/* Success Overlay with checkmark (ptichka) and cooldown visual */}
                  {showSuccessOverlay && (
                    <Box sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      backgroundColor: 'rgba(16, 185, 129, 0.9)', // Beautiful translucent emerald green
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 30,
                      animation: `${fadeIn} 0.2s ease-out`
                    }}>
                      <CheckCircleOutlinedIcon sx={{ 
                        color: '#fff', 
                        fontSize: 80, 
                        mb: 1.5,
                        animation: `${scaleUp} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)`
                      }} />
                      <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.2rem' }}>
                        Успешно!
                      </Typography>
                      {scanResult?.workerName && (
                        <Typography sx={{ color: '#ecfdf5', fontSize: '0.85rem', mt: 0.5, px: 2, textAlign: 'center', fontWeight: 600 }}>
                          {scanResult.workerName}
                        </Typography>
                      )}
                    </Box>
                  )}

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



            {/* Date, Shift Select & Subtabs Toggle */}
            <Paper elevation={0} sx={{ p: 2, borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', minWidth: '80px' }}>Дата:</Typography>
                <TextField
                  type="date"
                  size="small"
                  fullWidth
                  disabled
                  value={journalDate}
                  onChange={(e) => setJournalDate(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: '#f1f5f9' } }}
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', minWidth: '80px' }}>Смена:</Typography>
                <FormControl size="small" sx={{ flexGrow: 1 }}>
                  <Select
                    value={journalSession}
                    onChange={(e) => setJournalSession(e.target.value)}
                    sx={{ borderRadius: '8px', bgcolor: '#fff' }}
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
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    py: 0.8,
                    backgroundColor: journalSubTab === 0 ? '#fff' : 'transparent',
                    color: journalSubTab === 0 ? '#7b61ff' : '#64748b',
                    boxShadow: journalSubTab === 0 ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                    '&:hover': { backgroundColor: journalSubTab === 0 ? '#fff' : 'transparent' }
                  }}
                >
                  Отмеченные ({scannedForDate.length})
                </Button>
                <Button
                  fullWidth
                  onClick={() => setJournalSubTab(1)}
                  sx={{
                    textTransform: 'none',
                    borderRadius: '8px',
                    fontSize: '0.72rem',
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
                <Button
                  fullWidth
                  onClick={() => setJournalSubTab(2)}
                  sx={{
                    textTransform: 'none',
                    borderRadius: '8px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    py: 0.8,
                    backgroundColor: journalSubTab === 2 ? '#fff' : 'transparent',
                    color: journalSubTab === 2 ? '#7b61ff' : '#64748b',
                    boxShadow: journalSubTab === 2 ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                    '&:hover': { backgroundColor: journalSubTab === 2 ? '#fff' : 'transparent' }
                  }}
                >
                  Ожидающие ({activePending.length})
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
                scannedForDate.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>В этой смене пока никто не отмечен</Typography>
                  </Box>
                ) : (
                  <List disablePadding>
                    {scannedForDate.map((item, idx) => (
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
              ) : journalSubTab === 1 ? (
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
                        <ListItem
                          button
                          onClick={() => {
                            setSelectedWorker(item);
                            setSelectedReason('ABSENT');
                            setCustomReason('');
                            setReasonDialogOpen(true);
                          }}
                          sx={{
                            py: 1.5,
                            transition: 'all 0.2s',
                            '&:hover': { backgroundColor: '#f8fafc' }
                          }}
                        >
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
              ) : (
                /* Pending (Ожидающие) List */
                activePending.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>Нет ожидающих отправки записей</Typography>
                  </Box>
                ) : (
                  <List disablePadding>
                    {activePending.map((item, idx) => (
                      <Box key={item.id}>
                        {idx > 0 && <Divider />}
                        <ListItem sx={{ py: 1.5 }}>
                          <ListItemText
                            primary={
                              <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                                {item.workerName}
                              </Typography>
                            }
                            secondary={
                              <Typography sx={{ fontSize: '0.72rem', color: '#64748b' }}>
                                Паспорт: {item.passport || '—'} | Ожидает сеть...
                              </Typography>
                            }
                          />
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Chip
                              size="small"
                              label={getStatusLabel(item.status)}
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.7rem',
                                backgroundColor: getStatusBg(item.status),
                                color: getStatusColor(item.status),
                                borderRadius: '6px',
                                mr: 1
                              }}
                            />
                            <Chip
                              size="small"
                              label="Ожидает"
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.65rem',
                                backgroundColor: '#fffbeb',
                                color: '#d97706',
                                border: '1px solid #fef3c7',
                                borderRadius: '6px'
                              }}
                            />
                          </Box>
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

        {/* ─── Shift Settings Dialog (Global) ─── */}
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
          </DialogContent>
          <DialogActions sx={{ p: 2.5, pt: 1 }}>
            <Button variant="contained" fullWidth onClick={() => setSettingsOpen(false)} sx={{ backgroundColor: '#7b61ff', borderRadius: '10px', textTransform: 'none', fontWeight: 700, py: 1.2, '&:hover': { backgroundColor: '#6a50e8' } }}>
              Применить
            </Button>
          </DialogActions>
        </Dialog>

        {/* ─── Mark Attendance Reason Dialog (Global) ─── */}
        <Dialog open={reasonDialogOpen} onClose={() => setReasonDialogOpen(false)}
          PaperProps={{ sx: { borderRadius: '24px', width: '420px', maxWidth: '95vw', p: 1 } }}>
          <DialogTitle sx={{ fontWeight: 800, fontSize: '1.2rem', pb: 1, color: '#0f172a' }}>
            Отметить сотрудника
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Box sx={{ mb: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.92rem', color: '#334155' }}>
                {selectedWorker?.fullName}
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>
                Паспорт: {selectedWorker?.passport || '—'} | Должность: {selectedWorker?.position || '—'}
              </Typography>
            </Box>

            <FormControl component="fieldset" fullWidth>
              <Typography sx={{ mb: 1, fontSize: '0.78rem', fontWeight: 750, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Выберите статус или причину:
              </Typography>
              <RadioGroup
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                sx={{ gap: 1 }}
              >
                {[
                  { value: 'ABSENT', label: 'Не пришел (ABSENT)', color: '#ef4444', bg: '#fef2f2' },
                  { value: 'LATE', label: 'Опоздал (LATE)', color: '#f59e0b', bg: '#fffbeb' },
                  { value: 'VACATION', label: 'В отпуске (VACATION)', color: '#3b82f6', bg: '#eff6ff' },
                  { value: 'SICK', label: 'Болеет (SICK)', color: '#10b981', bg: '#ecfdf5' },
                  { value: 'CUSTOM', label: 'Другая причина (указать вручную)', color: '#64748b', bg: '#f8fafc' },
                ].map((opt) => (
                  <Paper
                    key={opt.value}
                    variant="outlined"
                    onClick={() => setSelectedReason(opt.value)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      px: 2,
                      py: 1.2,
                      borderRadius: '12px',
                      cursor: 'pointer',
                      border: selectedReason === opt.value ? `2px solid ${opt.color}` : '1px solid #e2e8f0',
                      backgroundColor: selectedReason === opt.value ? opt.bg : 'transparent',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: opt.bg,
                        borderColor: opt.color
                      }
                    }}
                  >
                    <FormControlLabel
                      value={opt.value}
                      control={<Radio sx={{ color: opt.color, '&.Mui-checked': { color: opt.color }, display: 'none' }} />}
                      label={
                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 650, color: '#1e293b' }}>
                          {opt.label}
                        </Typography>
                      }
                      sx={{ m: 0, width: '100%' }}
                    />
                  </Paper>
                ))}
              </RadioGroup>
            </FormControl>

            {selectedReason === 'CUSTOM' && (
              <TextField
                autoFocus
                multiline
                rows={2}
                size="small"
                fullWidth
                label="Укажите причину отсутствия"
                placeholder="Например: Отпросился, работает на другом объекте..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': { borderRadius: '12px' }
                }}
              />
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}>
            <Button
              variant="outlined"
              onClick={() => setReasonDialogOpen(false)}
              sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 700, px: 3, borderColor: '#e2e8f0', color: '#4b5563' }}
            >
              Отмена
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveReason}
              disabled={savingReason || (selectedReason === 'CUSTOM' && !customReason.trim())}
              sx={{
                backgroundColor: '#7b61ff',
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 700,
                px: 4,
                '&:hover': { backgroundColor: '#6a50e8' }
              }}
            >
              {savingReason ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogActions>
        </Dialog>

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
          onChange={(e, v) => { setTab(v); localStorage.setItem('supervisor_active_tab', String(v)); setScanResult(null); setErrorMsg(''); }}
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
