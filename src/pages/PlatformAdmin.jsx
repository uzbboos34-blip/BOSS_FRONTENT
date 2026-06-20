import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
  Box, Typography, Button, IconButton, Paper, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Avatar, InputAdornment, Stack, Divider, Drawer, Dialog,
  DialogContent, Chip, Tooltip, FormControlLabel, Switch, CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';

const getInitials = (name = '') => {
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : (parts[0]?.[0] || '?').toUpperCase();
};

export default function PlatformAdmin() {
  const navigate = useNavigate();
  const tokenVal = localStorage.getItem('token');

  useEffect(() => {
    if (!tokenVal || tokenVal === 'undefined') {
      navigate('/login', { replace: true });
    }
  }, [tokenVal, navigate]);

  if (!tokenVal || tokenVal === 'undefined') {
    return null;
  }

  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToBlock, setUserToBlock] = useState(null);

  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    password: '',
    isActive: true,
    isBlocked: false
  });
  const [editingId, setEditingId] = useState(null);

  const token = () => localStorage.getItem('token');

  async function fetchSuperAdmins() {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/user/user');
      // Filter to only show SUPER_ADMIN roles
      const allUsers = Array.isArray(res.data) ? res.data : res.data?.data || [];
      const superAdmins = allUsers.filter(u => u.role === 'SUPER_ADMIN');
      setUsers(superAdmins);
    } catch (err) {
      if (err.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  useEffect(() => {
    const tokenVal = token();
    if (!tokenVal || tokenVal === 'undefined') {
      navigate('/login');
      return;
    }
    // Verify user role is indeed PLATFORM_SUPER_ADMIN
    try {
      const payload = JSON.parse(atob(tokenVal.split('.')[1]));
      if (payload.role !== 'PLATFORM_SUPER_ADMIN') {
        navigate('/dashboard');
        return;
      }
    } catch (e) {
      navigate('/login');
      return;
    }

    fetchSuperAdmins();
  }, []);

  function openCreateDrawer() {
    setEditingId(null);
    setForm({
      fullName: '',
      phone: '',
      password: '',
      isActive: true,
      isBlocked: false
    });
    setIsDrawerOpen(true);
  }

  function openEditDrawer(user) {
    setEditingId(user.id);
    setForm({
      fullName: user.fullName || '',
      phone: user.phone || '',
      password: '',
      isActive: user.isActive !== false,
      isBlocked: user.isBlocked === true
    });
    setIsDrawerOpen(true);
  }

  async function handleSubmit() {
    if (editingId) {
      await updateSuperAdmin();
    } else {
      await createSuperAdmin();
    }
  }

  async function createSuperAdmin() {
    try {
      if (!form.fullName || !form.phone || !form.password) {
        return alert("Заполните все обязательные поля!");
      }

      const payload = {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        password: form.password.trim(),
      };

      await api.post('/api/v1/user/create/super-admin', payload);
      fetchSuperAdmins();
      setIsDrawerOpen(false);
    } catch (err) {
      const msg = err.response?.data?.message;
      alert('Ошибка: ' + (Array.isArray(msg) ? msg.join(', ') : msg || "Не удалось создать супер-админа"));
    }
  }

  async function updateSuperAdmin() {
    try {
      if (!form.fullName || !form.phone) {
        return alert("Заполните все обязательные поля!");
      }

      const payload = {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        isActive: form.isActive,
        isBlocked: form.isBlocked
      };
      if (form.password) {
        payload.password = form.password.trim();
      }

      await api.put(`/api/v1/user/${editingId}`, payload);
      fetchSuperAdmins();
      setIsDrawerOpen(false);
      setEditingId(null);
    } catch (err) {
      const msg = err.response?.data?.message;
      alert('Ошибка: ' + (Array.isArray(msg) ? msg.join(', ') : msg || "Не удалось обновить"));
    }
  }

  const triggerBlockDeactivate = (user) => {
    setUserToBlock(user);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDeactivate = async () => {
    if (!userToBlock) return;
    try {
      // Deactivate user via DELETE request (marks isActive=false, isBlocked=true)
      await api.delete(`/api/v1/user/${userToBlock.id}`);
      fetchSuperAdmins();
      setDeleteConfirmOpen(false);
      setUserToBlock(null);
    } catch (err) {
      alert('Ошибка: ' + (err.response?.data?.message || "Не удалось заблокировать"));
    }
  };

  const filteredUsers = users.filter((u) =>
    u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.phone?.includes(searchQuery)
  );

  // Stats
  const totalCount = users.length;
  const activeCount = users.filter(u => u.isActive && !u.isBlocked).length;
  const blockedCount = users.filter(u => !u.isActive || u.isBlocked).length;

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      
      {/* ─── Top Brand Header ─── */}
      <Paper elevation={0} sx={{ 
        px: { xs: 3, sm: 6 }, py: 2, 
        backgroundColor: '#090d16', 
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 0,
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: 12 }}>
            <polygon points="16,3 28,10 28,22 16,29 4,22 4,10" stroke="#ffffff" strokeWidth="2.5" strokeLinejoin="round"/>
            <polygon points="16,9 23,13 23,19 16,23 9,19 9,13" fill="#3b82f6" stroke="#3b82f6" strokeWidth="1.5" strokeLinejoin="round" />
            <polygon points="16,13 18,14 18,18 16,19 14,18 14,14" fill="#fff" />
          </svg>
          <Box>
            <Typography sx={{ fontWeight: 900, fontSize: '1.2rem', color: '#ffffff', letterSpacing: '0.5px', lineHeight: 1.1 }}>
              BOSS
            </Typography>
            <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: '#60a5fa', letterSpacing: '1px' }}>
              PLATFORM CONTROL CENTER
            </Typography>
          </Box>
        </Box>

        <Button
          variant="outlined"
          startIcon={<ExitToAppIcon />}
          onClick={handleLogout}
          sx={{
            borderColor: 'rgba(255,255,255,0.15)',
            color: '#94a3b8',
            borderRadius: '10px',
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.85rem',
            px: 2, py: 0.8,
            '&:hover': {
              borderColor: '#ffffff',
              color: '#ffffff',
              backgroundColor: 'rgba(255,255,255,0.05)'
            }
          }}
        >
          Выйти
        </Button>
      </Paper>

      {/* ─── Main Content Body ─── */}
      <Box sx={{ flex: 1, p: { xs: 3, sm: 6 }, maxWidth: 1200, mx: 'auto', width: '100%' }}>
        
        {/* Title & Page Header */}
        <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', mb: 0.5 }}>
              Управление супер-администраторами
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              Панель управления и контроля списка супер-администраторов (руководителей центров/компаний), работающих в системе BOSS.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreateDrawer}
            sx={{
              backgroundColor: '#3b82f6', textTransform: 'none',
              borderRadius: '10px', px: 3, py: 1.2, fontWeight: 700,
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)',
              '&:hover': { backgroundColor: '#2563eb' }
            }}
          >
            Добавить супер-админа
          </Button>
        </Box>

        {/* Dashboard overview Widgets */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 3, mb: 4 }}>
          {[
            { label: 'Всего супер-админов', value: totalCount, glow: 'rgba(59, 130, 246, 0.15)', border: '#3b82f6' },
            { label: 'Активные супер-админы', value: activeCount, glow: 'rgba(16, 185, 129, 0.15)', border: '#10b981' },
            { label: 'Неактивные / Заблокированные', value: blockedCount, glow: 'rgba(239, 68, 68, 0.15)', border: '#ef4444' }
          ].map((widget, i) => (
            <Paper key={i} elevation={0} sx={{ 
              p: 3, borderRadius: '20px', border: '1.5px solid #f1f5f9',
              background: '#ffffff', position: 'relative', overflow: 'hidden',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
            }}>
              <Box sx={{ position: 'absolute', width: 80, height: 80, borderRadius: '50%', background: widget.glow, filter: 'blur(30px)', top: -10, right: -10 }} />
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1 }}>
                {widget.label}
              </Typography>
              <Typography sx={{ fontSize: '2.2rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
                {widget.value}
              </Typography>
            </Paper>
          ))}
        </Box>

        {/* Search controls & Table */}
        <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '20px', p: 3, backgroundColor: '#ffffff', boxShadow: '0 2px 10px rgba(0,0,0,0.01)' }}>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <TextField
              size="small"
              placeholder="Поиск (Ф.И.О. или телефон)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ width: { xs: '100%', sm: 300 }, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 20, color: '#94a3b8' }} />
                    </InputAdornment>
                  )
                }
              }}
            />
            <IconButton onClick={fetchSuperAdmins} size="small" sx={{ border: '1px solid #e2e8f0', borderRadius: '10px', p: 1 }}>
              <RefreshIcon sx={{ color: '#64748b', fontSize: 18 }} />
            </IconButton>
          </Box>

          <TableContainer>
            <Table>
              <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                <TableRow>
                  {['Ф.И.О.', 'Телефон', 'Роль', 'Статус', 'Дата создания', 'Действия'].map(col => (
                    <TableCell key={col} sx={{ fontWeight: 700, color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                      {col}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={30} />
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6, color: '#94a3b8' }}>
                      Супер-администраторы не найдены
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.map((user) => {
                  const isUserActive = user.isActive && !user.isBlocked;
                  return (
                    <TableRow key={user.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 36, height: 36, backgroundColor: '#1e3a8a', fontSize: '0.82rem', fontWeight: 700 }}>
                            {getInitials(user.fullName)}
                          </Avatar>
                          <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>{user.fullName}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell><Typography sx={{ fontSize: '0.85rem', color: '#334155', fontWeight: 500 }}>{user.phone}</Typography></TableCell>
                      <TableCell>
                        <Chip
                          icon={<AdminPanelSettingsIcon style={{ fontSize: 14 }} />}
                          label="Супер-администратор"
                          size="small"
                          sx={{
                            fontSize: '0.72rem', height: 22, fontWeight: 700,
                            backgroundColor: '#1e3a8a10', color: '#1e3a8a', border: '1px solid #1e3a8a20'
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={isUserActive ? <CheckCircleIcon style={{ color: '#10b981', fontSize: 14 }} /> : <BlockIcon style={{ color: '#ef4444', fontSize: 14 }} />}
                          label={isUserActive ? 'Активен' : 'Заблокирован'}
                          size="small"
                          sx={{
                            fontSize: '0.72rem', height: 22, fontWeight: 700,
                            backgroundColor: isUserActive ? '#ecfdf5' : '#fef2f2',
                            color: isUserActive ? '#10b981' : '#ef4444',
                            border: `1px solid ${isUserActive ? '#a7f3d0' : '#fca5a5'}`
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: '0.82rem', color: '#64748b' }}>
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString('ru-RU').replaceAll('/', '.') : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Tooltip title="Редактировать">
                            <IconButton size="small" onClick={() => openEditDrawer(user)} sx={{ color: '#64748b', '&:hover': { color: '#3b82f6', backgroundColor: '#eff6ff' } }}>
                              <EditIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                          {isUserActive && (
                            <Tooltip title="Деактивировать / Заблокировать">
                              <IconButton size="small" onClick={() => triggerBlockDeactivate(user)} sx={{ color: '#94a3b8', '&:hover': { color: '#ef4444', backgroundColor: '#fef2f2' } }}>
                                <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>

      {/* ─── Add/Edit Drawer ─── */}
      <Drawer
        anchor="right" open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        sx={{ zIndex: 2000 }}
        slotProps={{
          backdrop: {
            sx: {
              backgroundColor: 'rgba(9, 13, 22, 0.4)',
              backdropFilter: 'blur(3px)',
            }
          }
        }}
        PaperProps={{ sx: { width: { xs: '100%', sm: 420 }, p: 4, display: 'flex', flexDirection: 'column', height: '100%' } }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
              {editingId ? 'Редактировать супер-админа' : 'Добавить супер-админа'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
              {editingId ? 'Измените данные существующего супер-админа.' : 'Заполните данные для создания аккаунта нового супер-админа.'}
            </Typography>
          </Box>
          <IconButton onClick={() => setIsDrawerOpen(false)} sx={{ border: '1px solid #f1f5f9', borderRadius: '10px' }}><CloseIcon /></IconButton>
        </Box>
        <Divider sx={{ my: 2.5 }} />

        <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* FIO */}
          <Box>
            <Typography sx={{ mb: 0.8, fontWeight: 700, fontSize: '0.82rem', color: '#475569' }}>Ф.И.О. <span style={{ color: '#ef4444' }}>*</span></Typography>
            <TextField fullWidth size="small" placeholder="Например: Иван Иванов"
              value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />
          </Box>

          {/* Phone */}
          <Box>
            <Typography sx={{ mb: 0.8, fontWeight: 700, fontSize: '0.82rem', color: '#475569' }}>Телефон <span style={{ color: '#ef4444' }}>*</span></Typography>
            <TextField fullWidth size="small" placeholder="Например: +998907012161"
              value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />
          </Box>

          {/* Password */}
          <Box>
            <Typography sx={{ mb: 0.8, fontWeight: 700, fontSize: '0.82rem', color: '#475569' }}>
              Пароль {editingId ? '(необязательно для изменения)' : <span style={{ color: '#ef4444' }}>*</span>}
            </Typography>
            <TextField fullWidth size="small" type="password" placeholder={editingId ? 'Новый пароль (необязательно)' : 'Минимум 6 символов'}
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />
          </Box>

          {/* Status Controls (Only for Edit) */}
          {editingId && (
            <Paper elevation={0} sx={{ p: 2.5, border: '1.5px solid #f1f5f9', borderRadius: '14px', backgroundColor: '#f8fafc' }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#475569', mb: 2 }}>
                Статус аккаунта
              </Typography>
              <Stack spacing={1.5}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.isActive}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Активность аккаунта</Typography>
                      <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8' }}>Разрешение на вход в платформу</Typography>
                    </Box>
                  }
                />
                <Divider />
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.isBlocked}
                      onChange={(e) => setForm({ ...form, isBlocked: e.target.checked })}
                      color="error"
                    />
                  }
                  label={
                    <Box>
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Блокировка аккаунта</Typography>
                      <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8' }}>Ограничить использование системы</Typography>
                    </Box>
                  }
                />
              </Stack>
            </Paper>
          )}
        </Box>

        <Divider sx={{ my: 2.5 }} />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button fullWidth variant="outlined" onClick={() => setIsDrawerOpen(false)}
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600, borderColor: '#e2e8f0', color: '#475569' }}>
            Отмена
          </Button>
          <Button fullWidth variant="contained" onClick={handleSubmit}
            sx={{ backgroundColor: '#3b82f6', borderRadius: '10px', textTransform: 'none', fontWeight: 700, '&:hover': { backgroundColor: '#2563eb' } }}>
            Сохранить
          </Button>
        </Box>
      </Drawer>

      {/* ─── Deactivate Confirmation Modal ─── */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        PaperProps={{ sx: { borderRadius: '20px', width: '420px', maxWidth: '90vw', p: 3 } }}
      >
        <DialogContent sx={{ p: 2, textAlign: 'center' }}>
          <Box sx={{ width: 60, height: 60, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
            <DeleteOutlineIcon sx={{ fontSize: 30, color: '#ef4444' }} />
          </Box>
          <Typography sx={{ fontWeight: 800, fontSize: '1.15rem', color: '#0f172a', mb: 1 }}>
            Блокировка супер-админа
          </Typography>
          <Typography sx={{ fontSize: '0.85rem', color: '#64748b', mb: 3.5, lineHeight: 1.5 }}>
            Вы действительно хотите заблокировать этого супер-админа? Все его права в системе будут временно ограничены.
          </Typography>
          <Stack direction="row" spacing={2} sx={{ justifyContent: 'center' }}>
            <Button onClick={() => setDeleteConfirmOpen(false)} variant="outlined" sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600, borderColor: '#e2e8f0', color: '#475569', px: 3 }}>
              Отмена
            </Button>
            <Button onClick={handleConfirmDeactivate} variant="contained" sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600, backgroundColor: '#ef4444', color: '#fff', px: 3, '&:hover': { backgroundColor: '#dc2626' } }}>
              Заблокировать
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>

    </Box>
  );
}
