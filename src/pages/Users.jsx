import { useState, useEffect } from 'react';
import api from '../api/axios';
import {
  Box, Typography, Button, IconButton, Paper, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Avatar, InputAdornment, Checkbox, Stack, Divider, Drawer, Dialog,
  DialogTitle, DialogContent, DialogActions, Chip, Tooltip, Select, MenuItem, FormControl
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
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import BadgeIcon from '@mui/icons-material/Badge';
import SecurityIcon from '@mui/icons-material/Security';

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

const roleColors = {
  PLATFORM_SUPER_ADMIN: '#dc2626',
  SUPER_ADMIN: '#1e3a8a',
  ADMIN: '#4f46e5',
  SUPERVISOR: '#0d9488',
};

const roleLabels = {
  PLATFORM_SUPER_ADMIN: 'Супер-админ платформы',
  SUPER_ADMIN: 'Супер-администратор',
  ADMIN: 'Администратор',
  SUPERVISOR: 'Супервайзер',
};

export default function Users() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState('users');

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    password: '',
    role: '',
  });
  const [editingId, setEditingId] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState('');

  const token = () => localStorage.getItem('token');

  // Fetch logged in user's role and all users
  async function fetchUsers() {
    try {
      const tokenVal = token();
      if (tokenVal) {
        try {
          const payload = JSON.parse(atob(tokenVal.split('.')[1]));
          setCurrentUserRole(payload.role);
        } catch (e) {
          console.error('Failed to parse token payload:', e);
        }
      }

      const res = await api.get('/api/v1/user/user');
      setUsers(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
  }

  function openCreateDrawer(role) {
    setEditingId(null);
    setForm({
      fullName: '',
      phone: '',
      password: '',
      role: role || '',
    });
    setIsDrawerOpen(true);
  }

  function openEditDrawer(user) {
    setEditingId(user.id);
    setForm({
      fullName: user.fullName || '',
      phone: user.phone || '',
      password: '',
      role: user.role || '',
    });
    setIsDrawerOpen(true);
  }

  async function handleSubmit() {
    if (editingId) {
      await updateUser();
    } else {
      await saveUser();
    }
  }

  async function saveUser() {
    try {
      if (!form.fullName || !form.phone || !form.password || !form.role) {
        return alert("Заполните все обязательные поля!");
      }

      const payload = {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        password: form.password.trim(),
      };

      let endpoint = '';
      if (form.role === 'SUPER_ADMIN') {
        endpoint = '/api/v1/user/create/super-admin';
      } else if (form.role === 'ADMIN') {
        endpoint = '/api/v1/user/create/admin';
      } else if (form.role === 'SUPERVISOR') {
        endpoint = '/api/v1/user/create/supervisor';
      } else {
        return alert("Выбрана некорректная роль!");
      }

      const res = await api.post(endpoint, payload);
      if (res.data.success || res.status === 201 || res.status === 200) {
        fetchUsers();
        setIsDrawerOpen(false);
      }
    } catch (err) {
      const msg = err.response?.data?.message;
      alert('Ошибка: ' + (Array.isArray(msg) ? msg.join(', ') : msg || "Не удалось сохранить"));
    }
  }

  async function updateUser() {
    try {
      if (!form.fullName || !form.phone) {
        return alert("Заполните все обязательные поля!");
      }

      const payload = {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
      };
      if (form.password) {
        payload.password = form.password.trim();
      }

      const res = await api.put(`/api/v1/user/${editingId}`, payload);
      if (res.data.success || res.status === 200) {
        fetchUsers();
        setIsDrawerOpen(false);
        setEditingId(null);
      }
    } catch (err) {
      const msg = err.response?.data?.message;
      alert('Ошибка: ' + (Array.isArray(msg) ? msg.join(', ') : msg || "Не удалось обновить"));
    }
  }

  const triggerDelete = (id) => {
    setUserToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await api.delete(`/api/v1/user/${userToDelete}`);
      fetchUsers();
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
    } catch (err) {
      alert('Ошибка: ' + (err.response?.data?.message || "Не удалось удалить"));
    }
  };

  const handleRestore = async (id) => {
    if (!confirm('Вы действительно хотите активировать этого пользователя?')) {
      return;
    }
    try {
      await api.put(`/api/v1/user/${id}`, {
        isActive: true,
        isBlocked: false
      });
      fetchUsers();
    } catch (err) {
      alert('Ошибка: ' + (err.response?.data?.message || 'Не удалось активировать пользователя'));
    }
  };

  useEffect(() => {
    if (!token() || token() === 'undefined') {
      window.location.href = '/login';
      return;
    }
    fetchUsers();
  }, []);

  // Filter users based on tab and search
  const filteredUsers = users.filter((u) => {
    const matchesStatus = activeTab === 'users' ? u.isActive === true : u.isActive === false;
    const matchesSearch =
      u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone?.includes(searchQuery) ||
      u.role?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
  const paginated = filteredUsers.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // Selection
  const handleToggleAll = (e) => setSelectedIds(e.target.checked ? paginated.map(u => u.id) : []);
  const handleToggleOne = (id) => setSelectedIds(prev =>
    prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
  );

  const getRoleIcon = (role) => {
    switch (role) {
      case 'PLATFORM_SUPER_ADMIN':
        return <SecurityIcon sx={{ fontSize: 16 }} />;
      case 'SUPER_ADMIN':
        return <AdminPanelSettingsIcon sx={{ fontSize: 16 }} />;
      case 'ADMIN':
        return <SupervisorAccountIcon sx={{ fontSize: 16 }} />;
      case 'SUPERVISOR':
        return <BadgeIcon sx={{ fontSize: 16 }} />;
      default:
        return null;
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('ru-RU').replaceAll('/', '.') : '-';

  return (
    <Box sx={{ p: 0 }}>
      {/* ─── Header ─── */}
      <Box sx={{ mb: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#111827', mb: 0.5 }}>
            Пользователи
          </Typography>
          <Typography variant="body2" sx={{ color: '#6b7280', maxWidth: 600 }}>
            На этой странице вы можете управлять списком пользователей (Супер-администраторы, Администраторы и Супервайзеры) в системе.
          </Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignSelf: { xs: 'stretch', sm: 'auto' } }}>
          {currentUserRole === 'PLATFORM_SUPER_ADMIN' && (
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon sx={{ fontSize: '16px' }} />}
              onClick={() => openCreateDrawer('SUPER_ADMIN')}
              sx={{
                backgroundColor: '#7b61ff', textTransform: 'none',
                borderRadius: '6px', px: 1.5, height: '32px', fontWeight: 600, fontSize: '0.78rem', whiteSpace: 'nowrap',
                '&:hover': { backgroundColor: '#6a50e8' }
              }}
            >
              Супер-админ
            </Button>
          )}
          {currentUserRole === 'SUPER_ADMIN' && (
            <>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon sx={{ fontSize: '16px' }} />}
                onClick={() => openCreateDrawer('ADMIN')}
                sx={{
                  backgroundColor: '#4f46e5', textTransform: 'none',
                  borderRadius: '6px', px: 1.5, height: '32px', fontWeight: 600, fontSize: '0.78rem', whiteSpace: 'nowrap',
                  '&:hover': { backgroundColor: '#4338ca' }
                }}
              >
                Администратор
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon sx={{ fontSize: '16px' }} />}
                onClick={() => openCreateDrawer('SUPERVISOR')}
                sx={{
                  backgroundColor: '#0d9488', textTransform: 'none',
                  borderRadius: '6px', px: 1.5, height: '32px', fontWeight: 600, fontSize: '0.78rem', whiteSpace: 'nowrap',
                  '&:hover': { backgroundColor: '#0f766e' }
                }}
              >
                Супервайзер
              </Button>
            </>
          )}
          {currentUserRole === 'ADMIN' && (
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon sx={{ fontSize: '16px' }} />}
              onClick={() => openCreateDrawer('SUPERVISOR')}
              sx={{
                backgroundColor: '#0d9488', textTransform: 'none',
                borderRadius: '6px', px: 1.5, height: '32px', fontWeight: 600, fontSize: '0.78rem', whiteSpace: 'nowrap',
                '&:hover': { backgroundColor: '#0f766e' }
              }}
            >
              Супервайзер
            </Button>
          )}
        </Stack>
      </Box>

      {/* ─── Tabs & Search ─── */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 2, mb: 3, width: '100%' }}>
        <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 0.5 }}>
          {[
            { key: 'users', label: "Пользователи" },
            { key: 'archive', label: "Архив", icon: <CalendarMonthIcon sx={{ fontSize: 16 }} /> }
          ].map(tab => (
            <Button key={tab.key} startIcon={tab.icon}
              onClick={() => { setActiveTab(tab.key); setPage(1); }}
              sx={{
                textTransform: 'none', borderRadius: '8px', fontWeight: 600, px: 2,
                color: activeTab === tab.key ? '#7b61ff' : '#6b7280',
                borderBottom: activeTab === tab.key ? '2px solid #7b61ff' : '2px solid transparent',
                '&:hover': { backgroundColor: 'transparent', color: '#7b61ff' },
                whiteSpace: 'nowrap'
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
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 20, color: '#9ca3af' }} />
                </InputAdornment>
              )
            }
          }}
        />
      </Box>

      {/* ─── Table ─── */}
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
                {['Ф.И.О.', 'Телефон', 'Роль', 'Статус', 'Дата создания', 'Действия'].map(col => (
                  <TableCell key={col} sx={{ fontWeight: 600, color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: '#9ca3af' }}>
                    Данные не найдены
                  </TableCell>
                </TableRow>
              ) : paginated.map((user) => {
                const rColor = roleColors[user.role] || '#6b7280';
                return (
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
                          sx={{ width: 32, height: 32, backgroundColor: rColor, fontSize: '0.75rem', fontWeight: 700 }}
                        >
                          {getInitials(user.fullName)}
                        </Avatar>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{user.fullName}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell><Typography sx={{ fontSize: '0.8rem', color: '#374151' }}>{user.phone}</Typography></TableCell>
                    <TableCell>
                      <Chip
                        icon={getRoleIcon(user.role)}
                        label={roleLabels[user.role] || user.role}
                        size="small"
                        sx={{
                           fontSize: '0.72rem', height: 22, fontWeight: 700,
                          backgroundColor: `${rColor}12`, color: rColor, border: `1px solid ${rColor}30`
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={user.isActive ? <CheckCircleIcon style={{ color: '#10b981', fontSize: 14 }} /> : <BlockIcon style={{ color: '#ef4444', fontSize: 14 }} />}
                        label={user.isActive ? 'Активен' : (user.isBlocked ? 'Заблокирован' : 'Неактивен')}
                        size="small"
                        sx={{
                          fontSize: '0.72rem', height: 22, fontWeight: 600,
                          backgroundColor: user.isActive ? '#ecfdf5' : '#fef2f2',
                          color: user.isActive ? '#10b981' : '#ef4444',
                          border: `1px solid ${user.isActive ? '#a7f3d0' : '#fca5a5'}`
                        }}
                      />
                    </TableCell>

                    <TableCell><Typography sx={{ fontSize: '0.8rem', color: '#6b7280' }}>{formatDate(user.createdAt)}</Typography></TableCell>
                    <TableCell>
                      {activeTab === 'archive' ? (
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleRestore(user.id)}
                          sx={{
                            textTransform: 'none',
                            borderRadius: '8px',
                            fontSize: '0.72rem',
                            py: 0.3,
                            px: 1,
                            borderColor: '#7b61ff',
                            color: '#7b61ff',
                            '&:hover': { borderColor: '#6a50e8', color: '#6a50e8' }
                          }}
                        >
                          Восстановить
                        </Button>
                      ) : (
                        <Stack direction="row" spacing={0.5}>
                          <IconButton size="small" sx={{ color: '#9ca3af', '&:hover': { color: '#ef4444' } }} onClick={() => triggerDelete(user.id)}>
                            <DeleteIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                          <IconButton size="small" sx={{ color: '#9ca3af', '&:hover': { color: '#10b981' } }} onClick={() => openEditDrawer(user)}>
                            <EditIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Stack>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
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
            Далее
          </Button>
        </Box>
      </Paper>

      {/* ─── Add/Edit User Drawer ─── */}
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
        PaperProps={{ sx: { width: { xs: '100%', sm: 260 }, display: 'flex', flexDirection: 'column' } }}
      >
        <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {editingId ? 'Редактировать пользователя' : 'Добавить пользователя'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {editingId ? 'Измените данные пользователя.' : 'Введите следующие данные для создания нового пользователя.'}
            </Typography>
          </Box>
          <IconButton onClick={() => setIsDrawerOpen(false)}><CloseIcon /></IconButton>
        </Box>
        <Divider />

        <Box sx={{ p: 3, overflowY: 'auto', flex: 1 }}>
          <Stack spacing={2}>
            {/* FIO */}
            <Box>
              <Typography sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.82rem', color: '#374151' }}>Ф.И.О. <span style={{ color: '#ef4444' }}>*</span></Typography>
              <TextField fullWidth size="small" placeholder="Введите полное имя"
                value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }} />
            </Box>

            {/* Telefon raqam */}
            <Box>
              <Typography sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.82rem', color: '#374151' }}>Телефон <span style={{ color: '#ef4444' }}>*</span></Typography>
              <TextField fullWidth size="small" placeholder="Например: +998901234567"
                value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }} />
            </Box>

            {/* Rol - faqat create modeda */}
            {!editingId && (
            <Box>
              <Typography sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.82rem', color: '#374151' }}>Роль</Typography>
              <TextField fullWidth size="small" disabled
                value={
                  form.role === 'ADMIN' ? 'Администратор' :
                  form.role === 'SUPERVISOR' ? 'Супервайзер' :
                  form.role === 'SUPER_ADMIN' ? 'Супер-администратор' :
                  form.role === 'PLATFORM_SUPER_ADMIN' ? 'Супер-админ платформы' :
                  form.role || ''
                }
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', backgroundColor: '#f9fafb' } }} />
            </Box>
            )}

            {/* Parol */}
            <Box>
              <Typography sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.82rem', color: '#374151' }}>
                Пароль {editingId ? <span style={{ color: '#9ca3af', fontWeight: 400 }}>(необязательно)</span> : <span style={{ color: '#ef4444' }}>*</span>}
              </Typography>
              <TextField fullWidth size="small" type="password" placeholder={editingId ? 'Новый пароль (необязательно)' : 'Введите пароль'}
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

      {/* ─── O'chirishni Tasdiqlash Modali (Arxivlash) ─── */}
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
              Деактивация пользователя
            </Typography>

            <Typography sx={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.5, mb: 4 }}>
              Вы действительно хотите деактивировать этого пользователя (переместить в архив)? Он больше не сможет войти в систему.
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
                Деактивировать
              </Button>
            </Stack>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
