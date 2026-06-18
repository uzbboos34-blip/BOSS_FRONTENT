import { useState, useEffect } from 'react';
import api from '../api/axios';
import {
  Box, Typography, Button, IconButton, Paper, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Avatar, InputAdornment, Checkbox, Stack, Divider, Drawer, Dialog,
  DialogContent, Tooltip, Select, MenuItem
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';

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

const getInitials = (name = '') => {
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : (parts[0]?.[0] || '?').toUpperCase();
};

const avatarColors = ['#7b61ff', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#ec4899'];
const getColor = (id) => avatarColors[id % avatarColors.length];

export default function Staff() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState('active');

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
  });
  const [editingId, setEditingId] = useState(null);

  async function getStaff() {
    try {
      const statusParam = activeTab === 'active' ? 'active' : 'inactive';
      let url = `/api/v1/users/all?status=${statusParam}`;
      const res = await api.get(url);
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setStaffList(data);
    } catch (err) {
      console.error("Xodimlarni yuklashda xatolik:", err);
    }
  }

  function openCreateDrawer() {
    setEditingId(null);
    resetForm();
    setIsDrawerOpen(true);
  }

  function openEditDrawer(user) {
    setEditingId(user.id);
    setForm({
      full_name: user.full_name || '',
      email: user.email || '',
      password: '',
      phone: user.phone || '',
      address: user.address || '',
    });
    setIsDrawerOpen(true);
  }

  async function handleSubmit() {
    if (editingId) {
      await updateStaff();
    } else {
      await saveStaff();
    }
  }

  async function saveStaff() {
    try {
      if (!form.full_name || !form.email || !form.password || !form.phone) {
        return alert("Barcha majburiy maydonlarni to'ldiring!");
      }

      const res = await api.post('/api/v1/users/admin', {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
      });

      if (res.data?.success || res.status === 201) {
        getStaff();
        setIsDrawerOpen(false);
        resetForm();
      }
    } catch (err) {
      const msg = err.response?.data?.message;
      alert('Xatolik: ' + (Array.isArray(msg) ? msg.join(', ') : msg || "Saqlab bo'lmadi"));
    }
  }

  async function updateStaff() {
    try {
      if (!form.full_name || !form.email || !form.phone) {
        return alert("Majburiy maydonlarni to'ldiring!");
      }

      const payload = {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
      };
      if (form.password) {
        payload.password = form.password.trim();
      }

      const res = await api.put(`/api/v1/users/${editingId}`, payload);
      if (res.data?.success || res.status === 200) {
        getStaff();
        setIsDrawerOpen(false);
        setEditingId(null);
        resetForm();
      }
    } catch (err) {
      const msg = err.response?.data?.message;
      alert('Xatolik: ' + (Array.isArray(msg) ? msg.join(', ') : msg || "Yangilab bo'lmadi"));
    }
  }

  const triggerDelete = (id) => {
    setUserToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await api.delete(`/api/v1/users/${userToDelete}`);
      getStaff();
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
    } catch (err) {
      alert('Xatolik: ' + (err.response?.data?.message || "O'chirib bo'lmadi"));
    }
  };

  async function restoreStaff(id) {
    try {
      await api.put(`/api/v1/users/${id}`, { status: 'active' });
      getStaff();
    } catch (err) {
      alert('Xatolik: ' + (err.response?.data?.message || "Faollashtirib bo'lmadi"));
    }
  }

  function resetForm() {
    setForm({ full_name: '', email: '', password: '', phone: '', address: '' });
  }

  useEffect(() => {
    getStaff();
  }, [activeTab]);

  // Local Search filtering
  const filteredStaff = staffList.filter(user => {
    const term = searchQuery.toLowerCase();
    return (
      (user.full_name || '').toLowerCase().includes(term) ||
      (user.email || '').toLowerCase().includes(term) ||
      (user.phone || '').toLowerCase().includes(term) ||
      (user.role || '').toLowerCase().includes(term)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredStaff.length / ITEMS_PER_PAGE));
  const paginated = filteredStaff.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleToggleAll = (e) => setSelectedIds(e.target.checked ? paginated.map(u => u.id) : []);
  const handleToggleOne = (id) => setSelectedIds(prev =>
    prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
  );

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('ru-RU').replaceAll('/', '.') : '-';

  return (
    <Box sx={{ p: 0 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'flex-start' }, gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#111827', mb: 0.5 }}>
            Сотрудники
          </Typography>
          <Typography variant="body2" sx={{ color: '#6b7280', maxWidth: 600 }}>
            Раздел управления администраторами и сотрудниками в системе.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreateDrawer}
          sx={{
            backgroundColor: '#7b61ff', textTransform: 'none',
            borderRadius: '10px', px: 2.5, fontWeight: 700, whiteSpace: 'nowrap',
            '&:hover': { backgroundColor: '#6a50e8' }
          }}
        >
          Добавить сотрудника
        </Button>
      </Box>

      {/* Tabs & Search */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 2, mb: 3, width: '100%' }}>
        <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: { xs: 1, sm: 0 } }}>
          {[
            { key: 'active', label: "Активные сотрудники" },
            { key: 'archive', label: "Архив", icon: <CalendarMonthIcon sx={{ fontSize: 16 }} /> }
          ].map(tab => (
            <Button key={tab.key} startIcon={tab.icon}
              onClick={() => { setActiveTab(tab.key); setPage(1); }}
              sx={{
                textTransform: 'none', borderRadius: '8px', fontWeight: 600, px: 2,
                color: activeTab === tab.key ? '#7b61ff' : '#6b7280',
                borderBottom: activeTab === tab.key ? '2px solid #7b61ff' : '2px solid transparent',
                '&:hover': { backgroundColor: 'transparent', color: '#7b61ff' }
              }}
            >
              {tab.label}
            </Button>
          ))}
        </Box>

        <TextField
          size="small"
          placeholder="Поиск..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          sx={{ width: { xs: '100%', sm: 260 }, '& .MuiOutlinedInput-root': { borderRadius: '10px', backgroundColor: '#fff' } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 20, color: '#9ca3af' }} />
              </InputAdornment>
            )
          }}
        />
      </Box>

      {/* Table */}
      <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: '16px', overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ backgroundColor: '#f9fafb' }}>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    size="small"
                    onChange={handleToggleAll}
                    checked={paginated.length > 0 && selectedIds.length === paginated.length}
                    indeterminate={selectedIds.length > 0 && selectedIds.length < paginated.length}
                    sx={{ '&.Mui-checked, &.MuiCheckbox-indeterminate': { color: '#7b61ff' } }}
                  />
                </TableCell>
                {['Имя ↓', 'Роль', 'Номер телефона', 'Эл. почта', 'Адрес', 'Дата создания', 'Действия'].map(col => (
                  <TableCell key={col} sx={{ fontWeight: 600, color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: '#9ca3af' }}>
                    Данные не найдены
                  </TableCell>
                </TableRow>
              ) : paginated.map((user) => (
                <TableRow key={user.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={selectedIds.includes(user.id)}
                      onChange={() => handleToggleOne(user.id)}
                      sx={{ '&.Mui-checked': { color: '#7b61ff' } }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar
                        sx={{ width: 32, height: 32, backgroundColor: getColor(user.id), fontSize: '0.75rem', fontWeight: 700 }}
                      >
                        {getInitials(user.full_name)}
                      </Avatar>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{user.full_name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: user.role === 'SUPERADMIN' ? '#d97706' : '#7b61ff' }}>
                      {user.role}
                    </Typography>
                  </TableCell>
                  <TableCell><Typography sx={{ fontSize: '0.8rem', color: '#374151' }}>{user.phone}</Typography></TableCell>
                  <TableCell><Typography sx={{ fontSize: '0.8rem', color: '#374151' }}>{user.email}</Typography></TableCell>
                  <TableCell><Typography sx={{ fontSize: '0.8rem', color: '#374151' }}>{user.address || '—'}</Typography></TableCell>
                  <TableCell><Typography sx={{ fontSize: '0.8rem', color: '#6b7280' }}>{formatDate(user.created_at)}</Typography></TableCell>
                  <TableCell>
                    {activeTab === 'archive' ? (
                      <Tooltip title="Восстановить из архива">
                        <IconButton size="small" onClick={() => restoreStaff(user.id)} sx={{ color: '#10b981', '&:hover': { color: '#059669' } }}>
                          <RefreshIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Stack direction="row" spacing={0.5}>
                        <IconButton size="small" sx={{ color: '#9ca3af', '&:hover': { color: '#7b61ff' } }} onClick={() => openEditDrawer(user)}>
                          <EditIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                        {user.role !== 'SUPERADMIN' && (
                          <IconButton size="small" sx={{ color: '#9ca3af', '&:hover': { color: '#ef4444' } }} onClick={() => triggerDelete(user.id)}>
                            <DeleteIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        )}
                      </Stack>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e5e7eb' }}>
          <Button
            size="small" startIcon={<KeyboardArrowLeftIcon />}
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            sx={{ textTransform: 'none', color: '#4b5563' }}
          >
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
                <Button
                  key={p} size="small"
                  onClick={() => setPage(p)}
                  sx={{
                    minWidth: 32, height: 32, borderRadius: '8px', fontWeight: page === p ? 700 : 400,
                    backgroundColor: page === p ? '#7b61ff' : 'transparent',
                    color: page === p ? '#fff' : '#4b5563',
                    '&:hover': { backgroundColor: page === p ? '#6a50e8' : '#f3f4f6' }
                  }}
                >
                  {p}
                </Button>
              );
            })}
          </Box>
          <Button
            size="small" endIcon={<KeyboardArrowRightIcon />}
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
            sx={{ textTransform: 'none', color: '#4b5563' }}
          >
            Вперед
          </Button>
        </Box>
      </Paper>

      {/* Add / Edit Drawer */}
      <Drawer
        anchor="right" open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        sx={{ zIndex: 2000 }}
        slotProps={{
          backdrop: {
            sx: {
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(2px)',
            }
          }
        }}
        PaperProps={{ sx: { width: { xs: '100%', sm: 400 } } }}
      >
        <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{editingId ? "Редактировать сотрудника" : "Добавить сотрудника"}</Typography>
            <Typography variant="caption" color="text.secondary">
              {editingId ? "Измените данные существующего сотрудника." : "Добавьте нового сотрудника в систему."}
            </Typography>
          </Box>
          <IconButton onClick={() => setIsDrawerOpen(false)}><CloseIcon /></IconButton>
        </Box>
        <Divider />

        <Box sx={{ p: 3, overflowY: 'auto', flex: 1 }}>
          <Stack spacing={2.5}>
            {/* FIO */}
            <Box>
              <Typography sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.82rem', color: '#374151' }}>Полное имя (Ф.И.О.) *</Typography>
              <TextField fullWidth size="small" placeholder="Например: Иван Иванов"
                value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }} />
            </Box>

            {/* Telefon raqam */}
            <Box>
              <Typography sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.82rem', color: '#374151' }}>Номер телефона *</Typography>
              <TextField fullWidth size="small" placeholder="Например: +79991234567"
                value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }} />
            </Box>

            {/* Email */}
            <Box>
              <Typography sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.82rem', color: '#374151' }}>Эл. почта *</Typography>
              <TextField fullWidth size="small" placeholder="Например: admin@example.com"
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }} />
            </Box>

            {/* Manzil */}
            <Box>
              <Typography sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.82rem', color: '#374151' }}>Адрес</Typography>
              <TextField fullWidth size="small" placeholder="Например: г. Москва, ул. Ленина"
                value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }} />
            </Box>

            {/* Parol */}
            <Box>
              <Typography sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.82rem', color: '#374151' }}>
                Пароль {editingId ? "(необязательно для изменения)" : "*"}
              </Typography>
              <TextField fullWidth size="small" type="password" placeholder="Введите надежный пароль"
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }} />
            </Box>
          </Stack>
        </Box>

        <Divider />
        <Box sx={{ p: 2, display: 'flex', gap: 2 }}>
          <Button fullWidth variant="outlined" onClick={() => setIsDrawerOpen(false)}
            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, borderColor: '#e5e7eb', color: '#374151' }}>
            Отмена
          </Button>
          <Button fullWidth variant="contained" onClick={handleSubmit}
            sx={{ backgroundColor: '#7b61ff', borderRadius: '8px', textTransform: 'none', fontWeight: 700, '&:hover': { backgroundColor: '#6a50e8' } }}>
            Сохранить
          </Button>
        </Box>
      </Drawer>

      {/* Arxivlash Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: '20px',
            width: '420px',
            maxWidth: '90vw',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)'
          }
        }}
      >
        <DialogContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Box sx={{
              width: 64, height: 64,
              borderRadius: '50%',
              background: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto', mb: 3
            }}>
              <DeleteOutlineIcon sx={{ fontSize: 32, color: '#ef4444' }} />
            </Box>

            <Typography sx={{ fontWeight: 700, fontSize: '1.2rem', color: '#111827', mb: 1.5 }}>
              Архивировать сотрудника
            </Typography>

            <Typography sx={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.5, mb: 4 }}>
              Вы действительно хотите архивировать этого сотрудника? Вы сможете восстановить его позже из архива.
            </Typography>

            <Stack direction="row" spacing={2} sx={{ justifyContent: 'center' }}>
              <Button
                onClick={() => setDeleteConfirmOpen(false)}
                variant="outlined"
                sx={{
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderColor: '#e5e7eb',
                  color: '#374151',
                  px: 3, py: 1.2,
                  '&:hover': { borderColor: '#d1d5db', backgroundColor: '#f9fafb' }
                }}
              >
                Отмена
              </Button>
              <Button
                onClick={handleConfirmDelete}
                variant="contained"
                sx={{
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontWeight: 600,
                  backgroundColor: '#ef4444',
                  color: '#fff',
                  px: 3, py: 1.2,
                  '&:hover': { backgroundColor: '#dc2626' }
                }}
              >
                Архивировать
              </Button>
            </Stack>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
