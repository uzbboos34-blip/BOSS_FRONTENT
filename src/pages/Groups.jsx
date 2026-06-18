import { useState, useEffect } from 'react';
import api from '../api/axios';
import {
  Box, Typography, Button, IconButton, Paper, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Stack, Divider, Drawer, Chip, InputAdornment,
  Dialog, DialogContent, Avatar, CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import GroupsIcon from '@mui/icons-material/Groups';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const ITEMS_PER_PAGE = 10;

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

const groupColors = ['#7b61ff', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#ec4899', '#06b6d4'];
const getGroupColor = (name = '') => groupColors[name.charCodeAt(0) % groupColors.length];

const getInitials = (name = '') => {
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : (parts[0]?.[0] || '?').toUpperCase();
};

const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}.${dt.getFullYear()}`;
};

const getDaysUntilBirthday = (birthDateInput) => {
  if (!birthDateInput) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const birthDate = new Date(birthDateInput);
  const nextBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  nextBirthday.setHours(0, 0, 0, 0);

  if (nextBirthday < today) {
    nextBirthday.setFullYear(today.getFullYear() + 1);
  }

  const diffTime = nextBirthday.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const getRemainingDays = (dateStr) => {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(dateStr);
  targetDate.setHours(0, 0, 0, 0);
  const diffTime = targetDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState('groups');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '' });

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState(null);

  // Master-detail
  const [selectedGroup, setSelectedGroup] = useState(null); // null = groups view
  const [groupWorkers, setGroupWorkers] = useState([]);
  const [workersLoading, setWorkersLoading] = useState(false);
  const [workersSearch, setWorkersSearch] = useState('');

  const token = () => localStorage.getItem('token');

  async function fetchGroups() {
    try {
      const res = await api.get('/api/v1/group/group/all');
      setGroups(Array.isArray(res.data) ? res.data : (res.data?.data || []));
    } catch (e) {
      if (e.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
  }

  useEffect(() => {
    if (!token() || token() === 'undefined') { window.location.href = '/login'; return; }
    fetchGroups();
  }, []);

  async function openGroupDetail(group) {
    setSelectedGroup(group);
    setGroupWorkers([]);
    setWorkersSearch('');
    setWorkersLoading(true);
    try {
      const res = await api.get(`/api/v1/worker/by-group/${group.id}`);
      setGroupWorkers(Array.isArray(res.data) ? res.data : (res.data?.data || []));
    } catch (e) {
      console.error(e);
    } finally {
      setWorkersLoading(false);
    }
  }

  function backToGroups() {
    setSelectedGroup(null);
    setGroupWorkers([]);
    setWorkersSearch('');
  }

  function openCreateDrawer() {
    setEditingId(null);
    setForm({ name: '' });
    setDrawerOpen(true);
  }

  function openEditDrawer(group) {
    setEditingId(group.id);
    setForm({ name: group.name || '' });
    setDrawerOpen(true);
  }

  async function handleSubmit() {
    if (!form.name.trim()) return alert('Введите название бригады!');
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/api/v1/group/${editingId}`, { name: form.name.trim() });
      } else {
        await api.post('/api/v1/group', { name: form.name.trim() });
      }
      fetchGroups();
      setDrawerOpen(false);
      setForm({ name: '' });
      setEditingId(null);
    } catch (e) {
      const msg = e.response?.data?.message;
      alert('Ошибка: ' + (Array.isArray(msg) ? msg.join(', ') : msg || 'Не удалось сохранить'));
    } finally { setSaving(false); }
  }

  const triggerDelete = (id) => {
    setGroupToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!groupToDelete) return;
    try {
      await api.delete(`/api/v1/group/${groupToDelete}`);
      fetchGroups();
      setDeleteConfirmOpen(false);
      setGroupToDelete(null);
    } catch (e) {
      alert('Ошибка: ' + (e.response?.data?.message || 'Не удалось удалить'));
    }
  };

  const filtered = groups.filter(g =>
    g.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const filteredWorkers = groupWorkers.filter(w =>
    (w.fullName || '').toLowerCase().includes(workersSearch.toLowerCase()) ||
    (w.passport || '').toLowerCase().includes(workersSearch.toLowerCase()) ||
    (w.phone || '').toLowerCase().includes(workersSearch.toLowerCase())
  );

  // ═══════════════════════════════════════════
  // DETAIL VIEW — ishchilar ro'yxati
  // ═══════════════════════════════════════════
  if (selectedGroup) {
    const groupColor = getGroupColor(selectedGroup.name);
    return (
      <Box sx={{ p: 0 }}>
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={backToGroups}
            sx={{ textTransform: 'none', fontWeight: 600, color: '#6b7280', borderRadius: '10px', border: '1px solid #e5e7eb', px: 2, '&:hover': { backgroundColor: '#f9fafb' } }}
          >
            Бригадаlar
          </Button>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: '10px', backgroundColor: `${groupColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${groupColor}30` }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: groupColor }}>{getInitials(selectedGroup.name)}</Typography>
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#111827', lineHeight: 1 }}>{selectedGroup.name}</Typography>
              <Typography variant="caption" sx={{ color: '#6b7280' }}>
                {workersLoading ? 'Yuklanmoqda...' : `${filteredWorkers.length} нафар ишчи`}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ flex: 1 }} />
          <TextField
            size="small"
            placeholder="Поиск по имени, паспорту, телефону..."
            value={workersSearch}
            onChange={(e) => setWorkersSearch(e.target.value)}
            sx={{ width: { xs: '100%', sm: 280 }, '& .MuiOutlinedInput-root': { borderRadius: '10px', backgroundColor: '#fff' } }}
            slotProps={{ input: { startAdornment: <SearchIcon sx={{ fontSize: 18, color: '#9ca3af', mr: 0.5 }} /> } }}
          />
        </Box>

        {/* Workers Table */}
        <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: '16px', overflow: 'hidden' }}>
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 2500 }}>
              <TableHead sx={{ backgroundColor: '#f9fafb' }}>
                <TableRow>
                  {[
                    'Merkez no', 'Pasaport No', 'Şantiye', 'Sicil No', 'Ad Soyad', 'Ф.И.О.',
                    'Görev Adı', 'Гражданство',
                    'Giriş Tarihi', 'Saatlik Ücret', 'Ekip Dagilimi', 'Departman', 'TEL №', 
                    'Дата рождения', 'KUN', 'Патент №', 'Дата выдачи патента', 'Patent Bitis Tarihi', 
                    'INN', 'Киг', 'Camp VE Oturum yeri', 'Пол'
                  ].map(col => {
                    const isYellow = ['Pasaport No', 'Sicil No', 'KUN', 'Giriş Tarihi', 'Departman', 'Дата рождения'].includes(col);
                    const isCyan = col === 'INN';
                    return (
                      <TableCell key={col} sx={{ 
                        fontWeight: 700, 
                        color: isYellow ? '#b7791f' : isCyan ? '#006064' : '#4b5563', 
                        backgroundColor: isCyan ? '#e0f7fa' : 'inherit',
                        fontSize: '0.75rem', 
                        textTransform: 'uppercase', 
                        whiteSpace: 'nowrap', 
                        py: 1.5 
                      }}>{col}</TableCell>
                    );
                  })}
                </TableRow>
              </TableHead>
              <TableBody>
                {workersLoading ? (
                  <TableRow>
                    <TableCell colSpan={22} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={28} sx={{ color: '#7b61ff' }} />
                    </TableCell>
                  </TableRow>
                ) : filteredWorkers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={22} align="center" sx={{ py: 6, color: '#9ca3af' }}>
                      {workersSearch ? 'Qidiruv bo\'yicha natija topilmadi' : 'Bu brigadada ishchilar yo\'q'}
                    </TableCell>
                  </TableRow>
                ) : filteredWorkers.map(w => {
                  const daysUntilBday = w.birthDate ? getDaysUntilBirthday(w.birthDate) : null;

                  return (
                    <TableRow key={w.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                      <TableCell><Typography sx={{ fontSize: '0.78rem', color: '#374151' }}>{w.centerNo || '—'}</Typography></TableCell>
                      <TableCell><Typography sx={{ fontSize: '0.78rem', fontFamily: 'monospace', fontWeight: 600, color: '#1a56db' }}>{w.passport || '—'}</Typography></TableCell>
                      <TableCell><Typography sx={{ fontSize: '0.78rem', color: '#374151' }}>{w.constructionSite || '—'}</Typography></TableCell>
                      <TableCell><Typography sx={{ fontSize: '0.78rem', color: '#374151', fontFamily: 'monospace' }}>{w.sicilNo || '—'}</Typography></TableCell>
                      <TableCell><Typography sx={{ fontWeight: 600, fontSize: '0.82rem', color: '#111827' }}>{w.fullName}</Typography></TableCell>
                      <TableCell><Typography sx={{ fontSize: '0.78rem', color: '#374151' }}>{w.fullNameRu || '—'}</Typography></TableCell>
                      <TableCell><Typography sx={{ fontSize: '0.78rem', color: '#374151' }}>{w.position || '—'}</Typography></TableCell>
                      <TableCell><Typography sx={{ fontSize: '0.78rem', color: '#374151' }}>{w.citizenship || '—'}</Typography></TableCell>
                      <TableCell><Typography sx={{ fontSize: '0.78rem', color: '#374151' }}>{w.startDate ? fmtDate(w.startDate) : '—'}</Typography></TableCell>
                      <TableCell><Typography sx={{ fontSize: '0.78rem', color: '#374151' }}>{w.hourlyRate ?? '—'}</Typography></TableCell>
                      <TableCell><Typography sx={{ fontSize: '0.78rem', color: '#374151' }}>{w.teamDivision || '—'}</Typography></TableCell>
                      <TableCell><Typography sx={{ fontSize: '0.78rem', color: '#374151' }}>{w.department || '—'}</Typography></TableCell>
                      <TableCell><Typography sx={{ fontSize: '0.78rem', color: '#374151' }}>{w.phone || '—'}</Typography></TableCell>
                      <TableCell><Typography sx={{ fontSize: '0.78rem', color: '#374151' }}>{w.birthDate ? fmtDate(w.birthDate) : '—'}</Typography></TableCell>
                      <TableCell><Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: daysUntilBday !== null && daysUntilBday <= 10 ? '#ef4444' : '#10b981' }}>{daysUntilBday !== null ? `${daysUntilBday} д.` : '—'}</Typography></TableCell>
                      <TableCell><Typography sx={{ fontSize: '0.78rem', color: '#374151' }}>{w.patentNo || '—'}</Typography></TableCell>
                      <TableCell><Typography sx={{ fontSize: '0.78rem', color: '#374151' }}>{w.patentStartDate ? fmtDate(w.patentStartDate) : '—'}</Typography></TableCell>
                      <TableCell><Typography sx={{ fontSize: '0.78rem', color: '#374151' }}>{w.patentEndDate ? fmtDate(w.patentEndDate) : '—'}</Typography></TableCell>
                      <TableCell sx={{ backgroundColor: '#f0fdfa' }}><Typography sx={{ fontSize: '0.78rem', color: '#0f766e', fontFamily: 'monospace', fontWeight: 600 }}>{w.inn || '—'}</Typography></TableCell>
                      <TableCell><Typography sx={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#374151' }}>{w.qrCode || '—'}</Typography></TableCell>
                      <TableCell><Typography sx={{ fontSize: '0.78rem', color: w.campAddress ? '#dc2626' : '#374151', fontWeight: w.campAddress ? 600 : 400 }}>{w.campAddress || '—'}</Typography></TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.78rem', color: '#374151' }}>
                          {w.gender === 'MALE' ? 'Мужской' : w.gender === 'FEMALE' ? 'Женский' : '—'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
    );
  }

  // ═══════════════════════════════════════════
  // MAIN VIEW — guruhlar ro'yxati
  // ═══════════════════════════════════════════
  return (
    <Box sx={{ p: 0 }}>
      {/* ─── Header ─── */}
      <Box sx={{ mb: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#111827', mb: 0.5 }}>
            Бригады
          </Typography>
          <Typography variant="body2" sx={{ color: '#6b7280' }}>
            Управление списком бригад. Нажмите на бригаду, чтобы увидеть её рабочих.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreateDrawer}
          sx={{ backgroundColor: '#7b61ff', textTransform: 'none', borderRadius: '10px', px: 2.5, fontWeight: 700, whiteSpace: 'nowrap', '&:hover': { backgroundColor: '#6a50e8' } }}
        >
          Создать бригаду
        </Button>
      </Box>

      {/* ─── Stat cards ─── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2.5, mb: 3 }}>
        {[
          { label: 'Всего бригад', value: groups.length, icon: <GroupsIcon sx={{ fontSize: 28, color: '#7b61ff' }} />, bg: '#f0eeff' },
          { label: 'Всего рабочих', value: groups.reduce((s, g) => s + (g.workers?.length || g._count?.workers || 0), 0), icon: <PeopleAltIcon sx={{ fontSize: 28, color: '#10b981' }} />, bg: '#ecfdf5' },
        ].map((card, i) => (
          <Paper key={i} elevation={0} sx={{ p: 3, border: '1px solid #e5e7eb', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography sx={{ fontSize: '0.8rem', color: '#6b7280', mb: 1 }}>{card.label}</Typography>
              <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: '#111827', lineHeight: 1 }}>{card.value}</Typography>
            </Box>
            <Box sx={{ width: 48, height: 48, borderRadius: '12px', backgroundColor: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {card.icon}
            </Box>
          </Paper>
        ))}
      </Box>

      {/* ─── Tabs & Search ─── */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {[
            { key: 'groups', label: 'Бригады' },
            { key: 'archive', label: 'Архив', icon: <CalendarMonthIcon sx={{ fontSize: 16 }} /> },
          ].map(tab => (
            <Button key={tab.key} startIcon={tab.icon}
              onClick={() => { setActiveTab(tab.key); setPage(1); }}
              sx={{
                textTransform: 'none', borderRadius: '8px', fontWeight: 600, px: 2,
                color: activeTab === tab.key ? '#7b61ff' : '#6b7280',
                borderBottom: activeTab === tab.key ? '2px solid #7b61ff' : '2px solid transparent',
                '&:hover': { backgroundColor: 'transparent', color: '#7b61ff' },
              }}
            >
              {tab.label}
            </Button>
          ))}
        </Box>
        <TextField
          size="small"
          placeholder="Поиск бригады..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          sx={{ width: { xs: '100%', sm: 260 }, '& .MuiOutlinedInput-root': { borderRadius: '10px', backgroundColor: '#fff' } }}
          slotProps={{ input: { startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ fontSize: 20, color: '#9ca3af' }} /></InputAdornment>) } }}
        />
      </Box>

      {/* ─── Table ─── */}
      <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: '16px', overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ backgroundColor: '#f9fafb' }}>
              <TableRow>
                {['Бригада', 'Рабочих', 'Специализации', 'Статус', 'Создана', 'Действия'].map(col => (
                  <TableCell key={col} sx={{ fontWeight: 600, color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, color: '#9ca3af' }}>
                    Данные не найдены
                  </TableCell>
                </TableRow>
              ) : paginated.map((group) => {
                const color = getGroupColor(group.name);
                const workerCount = group.workers?.length ?? group._count?.workers ?? 0;
                return (
                  <TableRow
                    key={group.id}
                    hover
                    onClick={() => openGroupDetail(group)}
                    sx={{ cursor: 'pointer', '&:last-child td': { border: 0 } }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{
                          width: 36, height: 36, borderRadius: '10px',
                          backgroundColor: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: `1.5px solid ${color}30`
                        }}>
                          <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color }}>
                            {getInitials(group.name)}
                          </Typography>
                        </Box>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: '#111827' }}>{group.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${workerCount} чел.`}
                        size="small"
                        sx={{ fontSize: '0.72rem', fontWeight: 700, height: 22, backgroundColor: '#f0eeff', color: '#7b61ff', border: '1px solid #e0d9ff' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {group.specializations && group.specializations.length > 0 ? (
                          group.specializations.slice(0, 3).map(sp => (
                            <Chip key={sp.id} label={sp.name} size="small"
                              sx={{ fontSize: '0.68rem', height: 20, fontWeight: 600, backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }} />
                          ))
                        ) : (
                          <Typography sx={{ fontSize: '0.78rem', color: '#d1d5db' }}>—</Typography>
                        )}
                        {group.specializations?.length > 3 && (
                          <Chip label={`+${group.specializations.length - 3}`} size="small"
                            sx={{ fontSize: '0.68rem', height: 20, fontWeight: 600, backgroundColor: '#f3f4f6', color: '#6b7280' }} />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={workerCount > 0 ? 'Активна' : 'Пустая'}
                        size="small"
                        sx={{
                          fontSize: '0.72rem', height: 22, fontWeight: 600,
                          backgroundColor: workerCount > 0 ? '#ecfdf5' : '#f9fafb',
                          color: workerCount > 0 ? '#10b981' : '#9ca3af',
                          border: `1px solid ${workerCount > 0 ? '#a7f3d0' : '#e5e7eb'}`
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: '0.8rem', color: '#6b7280' }}>{fmtDate(group.createdAt)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); triggerDelete(group.id); }} sx={{ color: '#9ca3af', '&:hover': { color: '#ef4444' } }}>
                          <DeleteIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); openEditDrawer(group); }} sx={{ color: '#9ca3af', '&:hover': { color: '#10b981' } }}>
                          <EditIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e5e7eb' }}>
          <Button size="small" startIcon={<KeyboardArrowLeftIcon />} disabled={page === 1} onClick={() => setPage(p => p - 1)} sx={{ textTransform: 'none', color: '#4b5563' }}>
            Назад
          </Button>
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            {getPaginationRange(page, totalPages).map((p, index) => {
              if (p === '...') {
                return (
                  <Typography key={`ell-${index}`} sx={{ px: 1, color: '#6b7280', fontSize: '0.875rem' }}>
                    ...
                  </Typography>
                );
              }
              return (
                <Button key={p} size="small" onClick={() => setPage(p)}
                  sx={{ minWidth: 32, height: 32, borderRadius: '8px', fontWeight: page === p ? 700 : 400, backgroundColor: page === p ? '#7b61ff' : 'transparent', color: page === p ? '#fff' : '#4b5563', '&:hover': { backgroundColor: page === p ? '#6a50e8' : '#f3f4f6' } }}
                >{p}</Button>
              );
            })}
          </Box>
          <Button size="small" endIcon={<KeyboardArrowRightIcon />} disabled={page === totalPages} onClick={() => setPage(p => p + 1)} sx={{ textTransform: 'none', color: '#4b5563' }}>
            Далее
          </Button>
        </Box>
      </Paper>

      {/* ─── Create/Edit Drawer ─── */}
      <Drawer
        anchor="right" open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{ zIndex: 2000 }}
        slotProps={{ backdrop: { sx: { backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' } } }}
        PaperProps={{ sx: { width: { xs: '100%', sm: 400 }, display: 'flex', flexDirection: 'column' } }}
      >
        <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {editingId ? 'Редактировать бригаду' : 'Создать бригаду'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {editingId ? 'Измените название бригады.' : 'Введите название для новой бригады.'}
            </Typography>
          </Box>
          <IconButton onClick={() => setDrawerOpen(false)}><CloseIcon /></IconButton>
        </Box>
        <Divider />

        <Box sx={{ p: 3, flex: 1 }}>
          <Typography sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.82rem', color: '#374151' }}>
            Название бригады <span style={{ color: '#ef4444' }}>*</span>
          </Typography>
          <TextField
            fullWidth size="small"
            placeholder="Например: Бригада А-1"
            value={form.name}
            onChange={(e) => setForm({ name: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
            autoFocus
          />
        </Box>

        <Divider />
        <Box sx={{ p: 2, display: 'flex', gap: 2 }}>
          <Button fullWidth variant="outlined" onClick={() => setDrawerOpen(false)}
            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, borderColor: '#e5e7eb', color: '#374151' }}>
            Отмена
          </Button>
          <Button fullWidth variant="contained" onClick={handleSubmit} disabled={saving}
            sx={{ backgroundColor: '#7b61ff', borderRadius: '8px', textTransform: 'none', fontWeight: 700, '&:hover': { backgroundColor: '#6a50e8' } }}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </Box>
      </Drawer>

      {/* ─── Delete Confirm Dialog ─── */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}
        PaperProps={{ sx: { borderRadius: '20px', width: '420px', maxWidth: '90vw', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)' } }}>
        <DialogContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Box sx={{ width: 64, height: 64, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 }}>
              <DeleteOutlineIcon sx={{ fontSize: 32, color: '#ef4444' }} />
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: '1.2rem', color: '#111827', mb: 1.5 }}>
              Удалить бригаду?
            </Typography>
            <Typography sx={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.5, mb: 4 }}>
              Вы уверены, что хотите удалить эту бригаду? Это действие необратимо.
            </Typography>
            <Stack direction="row" spacing={2} sx={{ justifyContent: 'center' }}>
              <Button onClick={() => setDeleteConfirmOpen(false)} variant="outlined"
                sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 600, borderColor: '#e5e7eb', color: '#374151', px: 3, py: 1.2 }}>
                Отмена
              </Button>
              <Button onClick={handleConfirmDelete} variant="contained"
                sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 600, backgroundColor: '#ef4444', color: '#fff', px: 3, py: 1.2, '&:hover': { backgroundColor: '#dc2626' } }}>
                Удалить
              </Button>
            </Stack>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
