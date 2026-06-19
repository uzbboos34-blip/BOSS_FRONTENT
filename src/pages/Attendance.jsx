import { useState, useEffect } from 'react';
import api from '../api/axios';
import {
  Box, Typography, Button, IconButton, Paper, Drawer,
  TextField, Stack, Tooltip, Dialog, DialogContent, MenuItem, Select, FormControl,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Divider, Tabs, Tab,
  Checkbox, InputLabel, Chip, Autocomplete, DialogTitle, DialogActions, FormControlLabel
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
const getPaginationRange = (current, total) => {
  const delta = 1;
  const range = [];
  const rangeWithDots = [];
  let l;

  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      range.push(i);
    }
  }

  for (const i of range) {
    if (l) {
      if (i - l === 2) {
        rangeWithDots.push(l + 1);
      } else if (i - l > 2) {
        rangeWithDots.push('...');
      }
    }
    rangeWithDots.push(i);
    l = i;
  }

  return rangeWithDots;
};
const ITEMS_PER_PAGE = 10;

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

export default function Attendance() {
  const [subTab, setSubTab] = useState(0); // 0 = Log, 1 = Assignments
  
  // Log Tab states
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logPage, setLogPage] = useState(1);
  const [filterDate, setFilterDate] = useState('');
  const [filterSession, setFilterSession] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSupervisorId, setFilterSupervisorId] = useState('');
  
  // Register manual attendance states
  const [registerOpen, setRegisterOpen] = useState(false);
  const [allWorkers, setAllWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [regDate, setRegDate] = useState(new Date().toISOString().split('T')[0]);
  const [regSession, setRegSession] = useState(1);
  const [regStatus, setRegStatus] = useState('PRESENT');
  const [regNote, setRegNote] = useState('');
  const [submittingReg, setSubmittingReg] = useState(false);

  // Edit states
  const [editOpen, setEditOpen] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [editSession, setEditSession] = useState(1);
  const [editStatus, setEditStatus] = useState('PRESENT');
  const [editNote, setEditNote] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Delete states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Assignment states
  const [supervisors, setSupervisors] = useState([]);
  const [selectedSupId, setSelectedSupId] = useState('');
  const [assignedWorkers, setAssignedWorkers] = useState([]);
  const [loadingAssigned, setLoadingAssigned] = useState(false);
  const [allAssignments, setAllAssignments] = useState([]);
  
  // Assign new workers dialog states
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignSearchQuery, setAssignSearchQuery] = useState('');
  const [selectedWorkerIdsForAssign, setSelectedWorkerIdsForAssign] = useState([]);
  const [savingAssign, setSavingAssign] = useState(false);
  const [bulkCount, setBulkCount] = useState('');
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [pastedList, setPastedList] = useState('');

  // Export states
  const ALL_COLUMNS = [
    { key: 'workerName', label: 'Рабочий' },
    { key: 'passport', label: 'Серия/номер паспорта' },
    { key: 'note', label: 'Примечание' },
    { key: 'group', label: 'Группа' },
    { key: 'date', label: 'Дата' },
    { key: 'session', label: 'Смена' },
    { key: 'status', label: 'Статус' },
    { key: 'createdBy', label: 'Кто отметил' },
  ];
  const [selectedColumns, setSelectedColumns] = useState(ALL_COLUMNS.map(c => c.key));
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  // Helper fetchers
  async function fetchSupervisors() {
    try {
      const res = await api.get('/api/v1/user/user');
      const users = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      const sups = users.filter(u => u.role === 'SUPERVISOR');
      setSupervisors(sups);
      // Auto select first supervisor if none selected
      if (sups.length > 0 && !selectedSupId) {
        setSelectedSupId(sups[0].id);
      }
    } catch (e) {
      console.error('Failed to fetch users/supervisors:', e);
    }
  }

  async function fetchAllWorkers() {
    try {
      const res = await api.get('/api/v1/worker');
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setAllWorkers(data.filter(w => w.isActive !== false));
    } catch (e) {
      console.error('Failed to fetch workers:', e);
    }
  }

  async function getLogs() {
    setLoadingLogs(true);
    try {
      const params = {};
      if (filterDate) params.date = filterDate;
      if (filterSession) params.session = filterSession;
      if (filterStatus) params.status = filterStatus;
      if (filterSupervisorId) params.supervisorId = filterSupervisorId;

      const res = await api.get('/api/v1/attendance', { params });
      setLogs(res.data || []);
    } catch (e) {
      console.error('Failed to fetch attendance logs:', e);
    } finally {
      setLoadingLogs(false);
    }
  }

  async function getAssignedWorkers(supervisorId) {
    if (!supervisorId) return;
    setLoadingAssigned(true);
    try {
      const res = await api.get(`/api/v1/attendance/supervisor/${supervisorId}/workers`);
      setAssignedWorkers(res.data?.assignedWorkers || []);
    } catch (e) {
      console.error('Failed to fetch assigned workers:', e);
    } finally {
      setLoadingAssigned(false);
    }
  }

  async function fetchAllAssignments() {
    try {
      const res = await api.get('/api/v1/attendance/assign/all');
      setAllAssignments(res.data || []);
    } catch (e) {
      console.error('Failed to fetch all assignments:', e);
    }
  }

  useEffect(() => {
    fetchSupervisors();
    fetchAllWorkers();
  }, []);

  useEffect(() => {
    if (subTab === 0) {
      getLogs();
    }
  }, [subTab, filterDate, filterSession, filterStatus, filterSupervisorId]);

  useEffect(() => {
    if (subTab === 1) {
      fetchAllAssignments();
      if (selectedSupId) {
        getAssignedWorkers(selectedSupId);
      }
    }
  }, [subTab, selectedSupId]);

  // Operations
  const handleExportCSV = () => {
    setExportDialogOpen(true);
  };

  const doExportCSV = () => {
    const sessionNames = { 1: 'Утро', 2: 'Обед', 3: 'Вечер' };
    const statusNames = {
      PRESENT: 'Присутствует',
      ABSENT: 'Отсутствует',
      LATE: 'Опоздал',
      VACATION: 'В отпуске',
      SICK: 'Болеет'
    };

    const cols = ALL_COLUMNS.filter(c => selectedColumns.includes(c.key));
    const headers = cols.map(c => c.label);

    const getCellValue = (l, colKey) => {
      switch (colKey) {
        case 'workerName': return l.worker?.fullName || '';
        case 'passport': return l.worker?.passport || '';
        case 'note': return l.note || '';
        case 'group': return l.worker?.group?.name || '';
        case 'date': return l.date ? new Date(l.date).toLocaleDateString('ru-RU') : '';
        case 'session': return sessionNames[l.session] || l.session;
        case 'status': return statusNames[l.status] || l.status;
        case 'createdBy': return l.supervisor?.fullName || l.createdBy || 'Система';
        default: return '';
      }
    };

    const rows = logs.map(l => cols.map(c => getCellValue(l, c.key)));

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(val => {
        let str = String(val);
        if (str.includes(',') || str.includes('\n') || str.includes('"')) {
          str = '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      }).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `attendance_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportDialogOpen(false);
  };

  const handleImportCSV = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const lines = [];
      let row = [];
      let inQuotes = false;
      let currentValue = '';

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            currentValue += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          row.push(currentValue);
          currentValue = '';
        } else if ((char === '\r' || char === '\n') && !inQuotes) {
          if (char === '\r' && nextChar === '\n') i++;
          row.push(currentValue);
          if (row.length > 0 && row.some(x => x !== '')) lines.push(row);
          row = [];
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      if (currentValue || row.length > 0) {
        row.push(currentValue);
        if (row.some(x => x !== '')) lines.push(row);
      }

      if (lines.length < 2) {
        alert('Файл CSV пуст или не содержит данных');
        return;
      }

      const headers = lines[0].map(h => h.trim().replace(/^\uFEFF/, ''));
      const dataRows = lines.slice(1);

      const idxQrCode = headers.findIndex(h => h.toLowerCase().includes('qr') || h.toLowerCase().includes('код') || h.toLowerCase().includes('passport') || h.toLowerCase().includes('паспорт'));
      if (idxQrCode === -1) {
        alert('Ошибка: Файл CSV должен содержать колонку "QR-код" или "Паспорт"');
        return;
      }

      const idxStatus = headers.findIndex(h => h.toLowerCase().includes('статус') || h.toLowerCase().includes('status'));
      const idxSession = headers.findIndex(h => h.toLowerCase().includes('смена') || h.toLowerCase().includes('сессия') || h.toLowerCase().includes('session'));
      const idxDate = headers.findIndex(h => h.toLowerCase().includes('дата') || h.toLowerCase().includes('date'));

      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
        const r = dataRows[rowIndex];
        if (r.length === 0) continue;

        const qrVal = r[idxQrCode]?.trim() || '';
        if (!qrVal) {
          errorCount++;
          errors.push(`Строка ${rowIndex + 2}: Отсутствует QR-код.`);
          continue;
        }

        let statusVal = 'PRESENT';
        if (idxStatus !== -1 && r[idxStatus]) {
          const rawStatus = r[idxStatus].trim().toUpperCase();
          if (['PRESENT', 'ABSENT', 'LATE', 'VACATION', 'SICK'].includes(rawStatus)) {
            statusVal = rawStatus;
          } else if (rawStatus.includes('ПРИС') || rawStatus === 'YES' || rawStatus === '1') {
            statusVal = 'PRESENT';
          } else if (rawStatus.includes('ОТС') || rawStatus === 'NO' || rawStatus === '0') {
            statusVal = 'ABSENT';
          } else if (rawStatus.includes('ОПОЗД')) {
            statusVal = 'LATE';
          } else if (rawStatus.includes('ОТП')) {
            statusVal = 'VACATION';
          } else if (rawStatus.includes('БОЛ')) {
            statusVal = 'SICK';
          }
        }

        let sessionVal = 1;
        if (idxSession !== -1 && r[idxSession]) {
          const rawSession = r[idxSession].trim().toLowerCase();
          if (rawSession.includes('уtro') || rawSession.includes('утро') || rawSession === '1') {
            sessionVal = 1;
          } else if (rawSession.includes('обед') || rawSession === '2') {
            sessionVal = 2;
          } else if (rawSession.includes('вечер') || rawSession === '3') {
            sessionVal = 3;
          } else {
            const parsedSess = parseInt(rawSession);
            if ([1, 2, 3].includes(parsedSess)) sessionVal = parsedSess;
          }
        }

        let dateVal = new Date().toISOString();
        if (idxDate !== -1 && r[idxDate]) {
          const parsedDate = new Date(r[idxDate].trim());
          if (!isNaN(parsedDate.getTime())) {
            dateVal = parsedDate.toISOString();
          }
        }

        try {
          await api.post('/api/v1/attendance/scan', {
            qrCode: qrVal,
            status: statusVal,
            session: sessionVal,
            date: dateVal
          });
          successCount++;
        } catch (err) {
          errorCount++;
          const apiMsg = err.response?.data?.message;
          const detail = Array.isArray(apiMsg) ? apiMsg.join(', ') : apiMsg || 'Неизвестная ошибка';
          errors.push(`Строка ${rowIndex + 2} (${qrVal}): ${detail}`);
        }
      }

      alert(`Импорт завершен!\nУспешно добавлено: ${successCount}\nОшибок: ${errorCount}${errors.length > 0 ? '\n\nДетали ошибок:\n' + errors.slice(0, 10).join('\n') : ''}`);
      getLogs();
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleOpenRegister = () => {
    setSelectedWorker(null);
    setRegDate(new Date().toISOString().split('T')[0]);
    setRegSession(1);
    setRegStatus('PRESENT');
    setRegNote('');
    setRegisterOpen(true);
  };

  const handleRegister = async () => {
    if (!selectedWorker) {
      alert('Пожалуйста, выберите рабочего');
      return;
    }
    setSubmittingReg(true);
    try {
      await api.post('/api/v1/attendance/scan', {
        qrCode: selectedWorker.qrCode,
        status: regStatus,
        session: Number(regSession),
        date: new Date(regDate).toISOString(),
        note: regNote.trim() || undefined
      });
      getLogs();
      setRegisterOpen(false);
    } catch (e) {
      alert('Ошибка: ' + (e.response?.data?.message || 'Не удалось зарегистрировать посещение'));
    } finally {
      setSubmittingReg(false);
    }
  };

  const handleOpenEdit = (log) => {
    setEditingLog(log);
    setEditSession(log.session);
    setEditStatus(log.status);
    setEditNote(log.note || '');
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editingLog) return;
    setSubmittingEdit(true);
    try {
      await api.put(`/api/v1/attendance/${editingLog.id}`, {
        status: editStatus,
        session: Number(editSession),
        note: editNote.trim() || null
      });
      getLogs();
      setEditOpen(false);
    } catch (e) {
      alert('Ошибка: ' + (e.response?.data?.message || 'Не удалось обновить посещение'));
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleOpenDelete = (log) => {
    setLogToDelete(log);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!logToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/api/v1/attendance/${logToDelete.id}`);
      getLogs();
      setDeleteConfirmOpen(false);
      setLogToDelete(null);
    } catch (e) {
      alert('Ошибка: ' + (e.response?.data?.message || 'Не удалось удалить'));
    } finally {
      setDeleting(false);
    }
  };

  const handleUnassign = async (worker) => {
    if (!worker.assignmentId) {
      alert('Ошибка: Не удалось найти ID закрепления');
      return;
    }
    if (!confirm(`Вы уверены, что хотите открепить рабочего "${worker.fullName}" от супервайзера?`)) {
      return;
    }
    try {
      await api.delete(`/api/v1/attendance/assign/${worker.assignmentId}`);
      await fetchAllAssignments();
      getAssignedWorkers(selectedSupId);
    } catch (e) {
      alert('Ошибка: ' + (e.response?.data?.message || 'Не удалось открепить рабочего'));
    }
  };

  const handleOpenAssignDialog = () => {
    if (!selectedSupId) {
      alert('Пожалуйста, сначала выберите супервайзера');
      return;
    }
    setSelectedWorkerIdsForAssign([]);
    setAssignSearchQuery('');
    setBulkCount('');
    setShowPasteArea(false);
    setPastedList('');
    setAssignDialogOpen(true);
  };

  const handleSelectFirstN = () => {
    const count = parseInt(bulkCount, 10);
    if (isNaN(count) || count <= 0) {
      alert('Пожалуйста, введите корректное число');
      return;
    }
    const sliceIds = unassignedWorkers.slice(0, count).map(w => w.id);
    setSelectedWorkerIdsForAssign(prev => {
      const union = new Set([...prev, ...sliceIds]);
      return Array.from(union);
    });
    setBulkCount('');
  };

  const handleSelectPasted = () => {
    if (!pastedList.trim()) {
      alert('Пожалуйста, вставьте список');
      return;
    }
    const items = pastedList
      .split(/[\n,; \t]+/)
      .map(item => item.trim().toLowerCase())
      .filter(item => item.length > 0);

    if (items.length === 0) {
      alert('Не удалось распознать элементы списка');
      return;
    }

    const itemSet = new Set(items);
    const matched = unassignedWorkers.filter(w => {
      const pass = (w.passport || '').toLowerCase();
      const qr = (w.qrCode || '').toLowerCase();
      const name = (w.fullName || '').toLowerCase();
      return itemSet.has(pass) || itemSet.has(qr) || items.some(it => name.includes(it));
    });

    if (matched.length === 0) {
      alert('Не найдено подходящих рабочих из списка');
      return;
    }

    const matchedIds = matched.map(w => w.id);
    setSelectedWorkerIdsForAssign(prev => {
      const union = new Set([...prev, ...matchedIds]);
      return Array.from(union);
    });
    setPastedList('');
    setShowPasteArea(false);
    alert(`Выбрано ${matched.length} рабочих по вашему списку`);
  };

  const handleAssign = async () => {
    if (selectedWorkerIdsForAssign.length === 0) {
      alert('Пожалуйста, выберите хотя бы одного рабочего');
      return;
    }
    setSavingAssign(true);
    try {
      await api.post('/api/v1/attendance/assign', {
        supervisorId: Number(selectedSupId),
        workerIds: selectedWorkerIdsForAssign
      });
      await fetchAllAssignments();
      getAssignedWorkers(selectedSupId);
      setAssignDialogOpen(false);
    } catch (e) {
      alert('Ошибка: ' + (e.response?.data?.message || 'Не удалось закрепить рабочих'));
    } finally {
      setSavingAssign(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusChip = (statusVal) => {
    const option = STATUS_OPTIONS.find(o => o.value === statusVal);
    if (!option) return <Chip size="small" label={statusVal} />;
    return (
      <Chip
        size="small"
        label={option.label}
        sx={{
          fontWeight: 700,
          fontSize: '0.72rem',
          backgroundColor: option.bg,
          color: option.color,
          border: `1px solid ${option.color}40`,
          borderRadius: '6px'
        }}
      />
    );
  };

  const getSessionLabel = (sessionVal) => {
    const option = SESSION_OPTIONS.find(o => o.value === sessionVal);
    return option ? option.label : `Сессия ${sessionVal}`;
  };

  // Pagination for logs
  const totalLogPages = Math.max(1, Math.ceil(logs.length / ITEMS_PER_PAGE));
  const paginatedLogs = logs.slice((logPage - 1) * ITEMS_PER_PAGE, logPage * ITEMS_PER_PAGE);

  // Filter out workers that are already assigned to ANY supervisor
  const unassignedWorkers = allWorkers.filter(w => {
    const isAssigned = allAssignments.some(aw => aw.workerId === w.id);
    if (isAssigned) return false;
    if (assignSearchQuery) {
      const q = assignSearchQuery.toLowerCase();
      const groupName = w.group?.name || '';
      const position = w.position || '';
      return w.fullName.toLowerCase().includes(q) || 
             (w.passport && w.passport.toLowerCase().includes(q)) ||
             position.toLowerCase().includes(q) ||
             groupName.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <Box>
      <Paper elevation={0} sx={{ p: { xs: 2, sm: 4 }, borderRadius: '24px', border: '1px solid #e5e7eb', backgroundColor: '#fff' }}>
        {/* Sub-tabs selection */}
        <Box sx={{ borderBottom: '1px solid #e5e7eb', mb: 3 }}>
          <Tabs
            value={subTab}
            onChange={(e, v) => setSubTab(v)}
            sx={{
              minHeight: 40,
              '& .MuiTabs-indicator': { backgroundColor: '#7b61ff', height: 3 },
              '& .MuiTab-root': { textTransform: 'none', px: 3, fontWeight: 700, fontSize: '0.9rem', color: '#6b7280' },
              '& .Mui-selected': { color: '#7b61ff !important' }
            }}
          >
            <Tab label="Журнал посещаемости" />
            <Tab label="Закрепление за супервайзерами" />
          </Tabs>
        </Box>

        {/* ─── Sub-Tab 0: Attendance Logs ─── */}
        {subTab === 0 && (
          <Box>
            {/* Log Header & Filters */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827' }}>Журнал посещаемости</Typography>
                  <IconButton size="small" onClick={getLogs} disabled={loadingLogs}>
                    <RefreshIcon sx={{ fontSize: 18, color: '#6b7280' }} />
                  </IconButton>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    component="label"
                    sx={{
                      backgroundColor: '#2563eb', color: '#ffffff', textTransform: 'none',
                      borderRadius: '12px', px: 2, py: 1, fontWeight: 700, fontSize: '0.82rem',
                      boxShadow: 'none',
                      '&:hover': { backgroundColor: '#1d4ed8', boxShadow: 'none' }
                    }}
                  >
                    Импорт
                    <input type="file" accept=".csv" hidden onChange={handleImportCSV} />
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleExportCSV}
                    sx={{
                      backgroundColor: '#16a34a', color: '#ffffff', textTransform: 'none',
                      borderRadius: '12px', px: 2, py: 1, fontWeight: 700, fontSize: '0.82rem',
                      boxShadow: 'none',
                      '&:hover': { backgroundColor: '#15803d', boxShadow: 'none' }
                    }}
                  >
                    Экспорт
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleOpenRegister}
                    sx={{
                      backgroundColor: '#7b61ff',
                      borderRadius: '12px',
                      textTransform: 'none',
                      fontWeight: 700,
                      px: 3,
                      py: 1,
                      '&:hover': { backgroundColor: '#6a50e8' }
                    }}
                  >
                    Внести вручную
                  </Button>
                </Stack>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Дата"
                  type="date"
                  value={filterDate}
                  onChange={(e) => { setFilterDate(e.target.value); setLogPage(1); }}
                  InputLabelProps={{ shrink: true }}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                />
                
                <FormControl size="small" fullWidth>
                  <InputLabel id="session-select-label">Смена / Сессия</InputLabel>
                  <Select
                    labelId="session-select-label"
                    value={filterSession}
                    label="Смена / Сессия"
                    onChange={(e) => { setFilterSession(e.target.value); setLogPage(1); }}
                    sx={{ borderRadius: '10px' }}
                  >
                    <MenuItem value="">Все смены</MenuItem>
                    {SESSION_OPTIONS.map(opt => (
                      <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel id="status-select-label">Статус</InputLabel>
                  <Select
                    labelId="status-select-label"
                    value={filterStatus}
                    label="Статус"
                    onChange={(e) => { setFilterStatus(e.target.value); setLogPage(1); }}
                    sx={{ borderRadius: '10px' }}
                  >
                    <MenuItem value="">Все статусы</MenuItem>
                    {STATUS_OPTIONS.map(opt => (
                      <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel id="sup-select-label">Супервайзер</InputLabel>
                  <Select
                    labelId="sup-select-label"
                    value={filterSupervisorId}
                    label="Супервайзер"
                    onChange={(e) => { setFilterSupervisorId(e.target.value); setLogPage(1); }}
                    sx={{ borderRadius: '10px' }}
                  >
                    <MenuItem value="">Все супервайзеры</MenuItem>
                    {supervisors.map(sup => (
                      <MenuItem key={sup.id} value={sup.id}>{sup.fullName}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>

            {/* Logs Table */}
            <TableContainer sx={{ border: '1px solid #e5e7eb', borderRadius: '16px', overflow: 'hidden' }}>
              <Table size="small">
                <TableHead sx={{ backgroundColor: '#f9fafb' }}>
                  <TableRow>
                    {['Рабочий', 'Серия/номер паспорта', 'Примечание', 'Дата', 'Сессия', 'Статус', 'Кто отметил', 'Действия'].map(col => (
                      <TableCell key={col} sx={{ py: 1.5, fontWeight: 700, color: '#4b5563', fontSize: '0.75rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        {col}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingLogs ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 6, color: '#9ca3af' }}>Загрузка логов посещаемости...</TableCell>
                    </TableRow>
                  ) : paginatedLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 6, color: '#9ca3af' }}>Записи не найдены</TableCell>
                    </TableRow>
                  ) : paginatedLogs.map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.82rem', py: 1.2 }}>{log.worker?.fullName || '—'}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{log.worker?.passport || '—'}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', color: '#475569', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.note || '—'}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8rem' }}>{formatDate(log.date)}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem' }}>{getSessionLabel(log.session)}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem' }}>{getStatusChip(log.status)}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {log.supervisor?.fullName || log.createdBy || 'Система'}
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <Stack direction="row" spacing={0.5}>
                          <IconButton size="small" onClick={() => handleOpenEdit(log)} sx={{ color: '#9ca3af', '&:hover': { color: '#7b61ff' } }}>
                            <EditIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleOpenDelete(log)} sx={{ color: '#9ca3af', '&:hover': { color: '#ef4444' } }}>
                            <DeleteIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Log Pagination */}
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e5e7eb', mt: 2 }}>
              <Button size="small" startIcon={<KeyboardArrowLeftIcon />} disabled={logPage === 1} onClick={() => setLogPage(p => p - 1)} sx={{ textTransform: 'none', color: '#4b5563' }}>
                Назад
              </Button>
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                {getPaginationRange(logPage, totalLogPages).map((p, index) => {
                  if (p === '...') {
                    return (
                      <Typography key={`ell-${index}`} sx={{ px: 1, color: '#6b7280', fontSize: '0.875rem' }}>
                        ...
                      </Typography>
                    );
                  }
                  return (
                    <Button key={p} size="small" onClick={() => setLogPage(p)}
                      sx={{ minWidth: 32, height: 32, borderRadius: '8px', fontWeight: logPage === p ? 700 : 400, backgroundColor: logPage === p ? '#7b61ff' : 'transparent', color: logPage === p ? '#fff' : '#4b5563', '&:hover': { backgroundColor: logPage === p ? '#6a50e8' : '#f3f4f6' } }}
                    >{p}</Button>
                  );
                })}
              </Box>
              <Button size="small" endIcon={<KeyboardArrowRightIcon />} disabled={logPage === totalLogPages} onClick={() => setLogPage(p => p + 1)} sx={{ textTransform: 'none', color: '#4b5563' }}>
                Далее
              </Button>
            </Box>
          </Box>
        )}

        {/* ─── Sub-Tab 1: Supervisor Assignments ─── */}
        {subTab === 1 && (
          <Box>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 3 }}>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ width: { xs: '100%', sm: 'auto' } }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#374151', whiteSpace: 'nowrap' }}>
                  Супервайзер:
                </Typography>
                <FormControl size="small" sx={{ minWidth: 220 }}>
                  <Select
                    value={selectedSupId}
                    onChange={(e) => setSelectedSupId(e.target.value)}
                    sx={{ borderRadius: '10px' }}
                  >
                    {supervisors.length === 0 ? (
                      <MenuItem value=""><em>Нет супервайзеров</em></MenuItem>
                    ) : supervisors.map(sup => (
                      <MenuItem key={sup.id} value={sup.id}>{sup.fullName}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <IconButton size="small" onClick={() => getAssignedWorkers(selectedSupId)} disabled={loadingAssigned || !selectedSupId}>
                  <RefreshIcon sx={{ fontSize: 18, color: '#6b7280' }} />
                </IconButton>
              </Stack>

              <Button
                variant="contained"
                startIcon={<PersonAddIcon />}
                onClick={handleOpenAssignDialog}
                disabled={!selectedSupId}
                sx={{
                  backgroundColor: '#7b61ff',
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontWeight: 700,
                  px: 3,
                  py: 1,
                  '&:hover': { backgroundColor: '#6a50e8' }
                }}
              >
                Закрепить рабочих
              </Button>
            </Box>

            {/* Assigned Workers Table */}
            <TableContainer sx={{ border: '1px solid #e5e7eb', borderRadius: '16px', overflow: 'hidden' }}>
              <Table size="small">
                <TableHead sx={{ backgroundColor: '#f9fafb' }}>
                  <TableRow>
                    {['Рабочий', 'Серия/номер паспорта', 'Должность', 'Бригада / Группа', 'Действия'].map(col => (
                      <TableCell key={col} sx={{ py: 1.5, fontWeight: 700, color: '#4b5563', fontSize: '0.75rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        {col}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingAssigned ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 6, color: '#9ca3af' }}>Загрузка закрепленных рабочих...</TableCell>
                    </TableRow>
                  ) : assignedWorkers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 6, color: '#9ca3af' }}>За супервайзером еще не закреплены рабочие</TableCell>
                    </TableRow>
                  ) : assignedWorkers.map((worker) => (
                    <TableRow key={worker.id} hover>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.82rem', py: 1.2 }}>{worker.fullName}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{worker.passport || '—'}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem' }}>{worker.position || '—'}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem' }}>
                        {worker.group?.name || worker.group?.title || '—'}
                      </TableCell>
                      <TableCell sx={{ py: 0.5 }}>
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          onClick={() => handleUnassign(worker)}
                          sx={{ textTransform: 'none', borderRadius: '6px', fontSize: '0.72rem', py: 0.2, px: 1 }}
                        >
                          Открепить
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Paper>

      {/* ─── Manual Registration Drawer ─── */}
      <Drawer
        anchor="right"
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        sx={{ zIndex: 2000 }}
        slotProps={{ backdrop: { sx: { backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' } } }}
        PaperProps={{ sx: { width: { xs: '100%', sm: '500px' }, display: 'flex', flexDirection: 'column', bgcolor: '#f9fafb' } }}
      >
        {/* Drawer Header */}
        <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#fff', borderBottom: '1px solid #e5e7eb' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>
              Внести посещение вручную
            </Typography>
            <Typography variant="caption" sx={{ color: '#6b7280' }}>
              Выберите рабочего и заполните параметры его посещения
            </Typography>
          </Box>
          <IconButton onClick={() => setRegisterOpen(false)} sx={{ color: '#6b7280' }}><CloseIcon /></IconButton>
        </Box>

        {/* Drawer Body */}
        <Box sx={{ p: 3, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 3.5 }}>
          {/* Worker Select */}
          <Box>
            <Typography sx={{ mb: 1, fontWeight: 600, fontSize: '0.82rem', color: '#374151' }}>
              Рабочий <span style={{ color: '#ef4444' }}>*</span>
            </Typography>
            <Autocomplete
              size="small"
              options={allWorkers}
              getOptionLabel={(w) => `${w.fullName} (${w.passport || 'Без паспорта'})`}
              value={selectedWorker}
              onChange={(e, v) => setSelectedWorker(v)}
              renderInput={(params) => <TextField {...params} placeholder="Поиск по имени или паспорту..." sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: '#fff' } }} />}
            />
          </Box>

          {/* Date Picker */}
          <Box>
            <Typography sx={{ mb: 1, fontWeight: 600, fontSize: '0.82rem', color: '#374151' }}>
              Дата посещения <span style={{ color: '#ef4444' }}>*</span>
            </Typography>
            <TextField
              fullWidth
              size="small"
              type="date"
              value={regDate}
              onChange={(e) => setRegDate(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: '#fff' } }}
            />
          </Box>

          {/* Session Dropdown */}
          <Box>
            <Typography sx={{ mb: 1, fontWeight: 600, fontSize: '0.82rem', color: '#374151' }}>
              Смена / Сессия <span style={{ color: '#ef4444' }}>*</span>
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                value={regSession}
                onChange={(e) => setRegSession(e.target.value)}
                sx={{ borderRadius: '8px', bgcolor: '#fff' }}
              >
                {SESSION_OPTIONS.map(o => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Status Dropdown */}
          <Box>
            <Typography sx={{ mb: 1, fontWeight: 600, fontSize: '0.82rem', color: '#374151' }}>
              Статус посещения <span style={{ color: '#ef4444' }}>*</span>
            </Typography>
            <FormControl fullWidth size="small">
              <Select
                value={regStatus}
                onChange={(e) => setRegStatus(e.target.value)}
                sx={{ borderRadius: '8px', bgcolor: '#fff' }}
              >
                {STATUS_OPTIONS.map(o => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Note Input */}
          <Box>
            <Typography sx={{ mb: 1, fontWeight: 600, fontSize: '0.82rem', color: '#374151' }}>
              Примечание / Причина
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={2}
              size="small"
              placeholder="Укажите причину или примечание..."
              value={regNote}
              onChange={(e) => setRegNote(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: '#fff' } }}
            />
          </Box>
        </Box>

        {/* Drawer Footer */}
        <Box sx={{ p: 2.5, display: 'flex', gap: 2, bgcolor: '#fff', borderTop: '1px solid #e5e7eb' }}>
          <Button fullWidth variant="outlined" onClick={() => setRegisterOpen(false)}
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600, borderColor: '#e5e7eb', color: '#374151', py: 1.2 }}>
            Отмена
          </Button>
          <Button fullWidth variant="contained" onClick={handleRegister} disabled={submittingReg}
            sx={{ backgroundColor: '#7b61ff', borderRadius: '10px', textTransform: 'none', fontWeight: 700, py: 1.2, '&:hover': { backgroundColor: '#6a50e8' } }}>
            {submittingReg ? 'Сохранение...' : 'Зарегистрировать'}
          </Button>
        </Box>
      </Drawer>

      {/* ─── Edit Attendance Dialog ─── */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)}
        PaperProps={{ sx: { borderRadius: '20px', width: '420px', maxWidth: '90vw' } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.2rem', pb: 1 }}>Редактировать запись</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1.5 }}>
            <Box>
              <Typography sx={{ mb: 0.8, fontWeight: 600, fontSize: '0.82rem', color: '#374151' }}>Рабочий</Typography>
              <Typography sx={{ fontWeight: 700, fontSize: '0.92rem', color: '#111827' }}>
                {editingLog?.worker?.fullName}
              </Typography>
            </Box>

            <Box>
              <Typography sx={{ mb: 0.8, fontWeight: 600, fontSize: '0.82rem', color: '#374151' }}>Дата</Typography>
              <Typography sx={{ fontSize: '0.88rem', color: '#4b5563' }}>
                {formatDate(editingLog?.date)}
              </Typography>
            </Box>

            <Box>
              <Typography sx={{ mb: 1, fontWeight: 600, fontSize: '0.82rem', color: '#374151' }}>Смена / Сессия</Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={editSession}
                  onChange={(e) => setEditSession(e.target.value)}
                  sx={{ borderRadius: '8px' }}
                >
                  {SESSION_OPTIONS.map(o => (
                    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box>
              <Typography sx={{ mb: 1, fontWeight: 600, fontSize: '0.82rem', color: '#374151' }}>Статус</Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  sx={{ borderRadius: '8px' }}
                >
                  {STATUS_OPTIONS.map(o => (
                    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box>
              <Typography sx={{ mb: 1, fontWeight: 600, fontSize: '0.82rem', color: '#374151' }}>Примечание / Причина</Typography>
              <TextField
                fullWidth
                multiline
                rows={2}
                size="small"
                placeholder="Укажите причину или примечание..."
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: '#fff' } }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1, gap: 1 }}>
          <Button variant="outlined" onClick={() => setEditOpen(false)} sx={{ borderRadius: '8px', textTransform: 'none', px: 2 }}>
            Отмена
          </Button>
          <Button variant="contained" onClick={handleEdit} disabled={submittingEdit} sx={{ backgroundColor: '#7b61ff', borderRadius: '8px', textTransform: 'none', px: 3, '&:hover': { backgroundColor: '#6a50e8' } }}>
            {submittingEdit ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Delete Confirm Dialog ─── */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}
        PaperProps={{ sx: { borderRadius: '20px', width: '400px', maxWidth: '90vw' } }}>
        <DialogContent sx={{ p: 4, textAlign: 'center' }}>
          <Box sx={{ width: 64, height: 64, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 }}>
            <DeleteOutlineIcon sx={{ fontSize: 32, color: '#ef4444' }} />
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: '1.15rem', color: '#111827', mb: 1 }}>
            Удалить запись посещения?
          </Typography>
          <Typography sx={{ fontSize: '0.85rem', color: '#6b7280', lineHeight: 1.5, mb: 4 }}>
            Вы действительно хотите удалить эту запись посещения для рабочего "{logToDelete?.worker?.fullName}"?
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button variant="outlined" onClick={() => setDeleteConfirmOpen(false)} sx={{ borderRadius: '8px', textTransform: 'none', px: 3, color: '#4b5563', borderColor: '#e5e7eb' }}>
              Отмена
            </Button>
            <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting} sx={{ borderRadius: '8px', textTransform: 'none', px: 3 }}>
              {deleting ? 'Удаление...' : 'Да, удалить'}
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>

      {/* ─── Assign Workers Dialog ─── */}
      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: '20px', width: '500px', maxWidth: '95vw' } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.2rem', pb: 1 }}>
          Закрепить рабочих за супервайзером
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1.5 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Поиск по имени, паспорту, бригаде..."
              value={assignSearchQuery}
              onChange={(e) => setAssignSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: '#9ca3af', mr: 1, fontSize: 20 }} />
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            />

            <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center" sx={{ flexWrap: 'wrap', gap: 1.5 }}>
              <Button
                size="small"
                onClick={() => setShowPasteArea(!showPasteArea)}
                sx={{ textTransform: 'none', fontSize: '0.75rem', fontWeight: 700, color: '#7b61ff', p: 0, minWidth: 0 }}
              >
                {showPasteArea ? 'Скрыть список' : 'Вставить список паспортов'}
              </Button>
              
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600 }}>
                  Первые:
                </Typography>
                <TextField
                  size="small"
                  type="number"
                  placeholder="Кол-во"
                  value={bulkCount}
                  onChange={(e) => setBulkCount(e.target.value)}
                  sx={{
                    width: 75,
                    '& .MuiOutlinedInput-root': { borderRadius: '8px', height: 28, fontSize: '0.75rem', padding: '0 4px' },
                    '& input': { padding: '4px 6px', textAlign: 'center' }
                  }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleSelectFirstN}
                  sx={{
                    textTransform: 'none',
                    borderRadius: '8px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    height: 28,
                    minWidth: 50,
                    borderColor: '#7b61ff',
                    color: '#7b61ff',
                    px: 1,
                    '&:hover': { borderColor: '#6a50e8', backgroundColor: '#f5f3ff' }
                  }}
                >
                  Ок
                </Button>
              </Stack>
            </Stack>

            {showPasteArea && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 1.5, border: '1px dashed #7b61ff', borderRadius: '12px', backgroundColor: '#fafafa' }}>
                <Typography variant="caption" sx={{ color: '#475569', fontWeight: 600 }}>
                  Вставьте список паспортов (каждый с новой строки или через пробел):
                </Typography>
                <TextField
                  multiline
                  rows={3}
                  size="small"
                  fullWidth
                  placeholder="Например:\nV8168483\nS6832877"
                  value={pastedList}
                  onChange={(e) => setPastedList(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '0.8rem', backgroundColor: '#fff' } }}
                />
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleSelectPasted}
                  sx={{
                    alignSelf: 'flex-end',
                    textTransform: 'none',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    backgroundColor: '#7b61ff',
                    '&:hover': { backgroundColor: '#6a50e8' }
                  }}
                >
                  Выбрать из списка
                </Button>
              </Box>
            )}

            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600 }}>
                Выберите рабочих ({selectedWorkerIdsForAssign.length} выбрано):
              </Typography>
              <Box>
                <Button
                  size="small"
                  onClick={() => {
                    const visibleIds = unassignedWorkers.map(w => w.id);
                    setSelectedWorkerIdsForAssign(prev => {
                      const union = new Set([...prev, ...visibleIds]);
                      return Array.from(union);
                    });
                  }}
                  sx={{ textTransform: 'none', fontSize: '0.75rem', fontWeight: 700, color: '#7b61ff', p: 0, minWidth: 0, mr: 2 }}
                >
                  Выбрать все
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    setSelectedWorkerIdsForAssign([]);
                  }}
                  sx={{ textTransform: 'none', fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', p: 0, minWidth: 0 }}
                >
                  Сбросить всё
                </Button>
              </Box>
            </Stack>

            <Paper variant="outlined" sx={{ maxHeight: 250, overflowY: 'auto', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
              {unassignedWorkers.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography sx={{ color: '#9ca3af', fontSize: '0.85rem' }}>
                    Нет доступных рабочих для закрепления
                  </Typography>
                </Box>
              ) : unassignedWorkers.map((worker) => {
                const isChecked = selectedWorkerIdsForAssign.includes(worker.id);
                return (
                  <Box
                    key={worker.id}
                    onClick={() => {
                      setSelectedWorkerIdsForAssign(prev =>
                        isChecked ? prev.filter(id => id !== worker.id) : [...prev, worker.id]
                      );
                    }}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      px: 2,
                      py: 1,
                      cursor: 'pointer',
                      borderBottom: '1px solid #f3f4f6',
                      backgroundColor: isChecked ? '#f5f3ff' : 'transparent',
                      '&:hover': { backgroundColor: isChecked ? '#ede9fe' : '#f9fafb' }
                    }}
                  >
                    <Checkbox
                      checked={isChecked}
                      size="small"
                      sx={{ mr: 1, p: 0.5, '&.Mui-checked': { color: '#7b61ff' } }}
                    />
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {worker.fullName}
                      </Typography>
                      <Typography sx={{ fontSize: '0.72rem', color: '#6b7280' }}>
                        Паспорт: {worker.passport || '—'} | Должность: {worker.position || '—'} | Группа: {worker.group?.name || '—'}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1, gap: 1 }}>
          <Button variant="outlined" onClick={() => setAssignDialogOpen(false)} sx={{ borderRadius: '8px', textTransform: 'none', px: 2 }}>
            Отмена
          </Button>
          <Button variant="contained" onClick={handleAssign} disabled={savingAssign} sx={{ backgroundColor: '#7b61ff', borderRadius: '8px', textTransform: 'none', px: 3, '&:hover': { backgroundColor: '#6a50e8' } }}>
            {savingAssign ? 'Сохранение...' : 'Закрепить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Export Column Picker Dialog ─── */}
      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', pb: 1 }}>
          Какие столбцы экспортировать?
          <IconButton onClick={() => setExportDialogOpen(false)} sx={{ position: 'absolute', right: 12, top: 12, color: '#9ca3af' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ py: 1 }}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
            <Button size="small" sx={{ textTransform: 'none', fontSize: '0.75rem', color: '#7b61ff' }}
              onClick={() => setSelectedColumns(ALL_COLUMNS.map(c => c.key))}>
              Выбрать все
            </Button>
            <Button size="small" sx={{ textTransform: 'none', fontSize: '0.75rem', color: '#ef4444' }}
              onClick={() => setSelectedColumns([])}>
              Сбросить
            </Button>
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
            {ALL_COLUMNS.map(col => (
              <FormControlLabel
                key={col.key}
                control={
                  <Checkbox
                    size="small"
                    checked={selectedColumns.includes(col.key)}
                    onChange={(e) => {
                      setSelectedColumns(prev =>
                        e.target.checked ? [...prev, col.key] : prev.filter(k => k !== col.key)
                      );
                    }}
                    sx={{ '&.Mui-checked': { color: '#7b61ff' }, p: 0.5 }}
                  />
                }
                label={<Typography sx={{ fontSize: '0.78rem', color: '#374151' }}>{col.label}</Typography>}
                sx={{ m: 0, py: 0.25 }}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2, pt: 1.5, gap: 1 }}>
          <Button onClick={() => setExportDialogOpen(false)}
            sx={{ textTransform: 'none', color: '#6b7280', fontWeight: 600 }}>
            Отмена
          </Button>
          <Button
            variant="contained"
            disabled={selectedColumns.length === 0}
            onClick={doExportCSV}
            sx={{ textTransform: 'none', backgroundColor: '#16a34a', fontWeight: 600,
              boxShadow: 'none', '&:hover': { backgroundColor: '#15803d', boxShadow: 'none' } }}
          >
            Экспорт
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
