import { useState, useEffect } from 'react';
import api from '../api/axios';
import {
  Box, Typography, Button, IconButton, Paper, Drawer,
  TextField, Stack, Tooltip, Dialog, DialogContent, Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import PersonIcon from '@mui/icons-material/Person';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

export default function Courses() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '' });
  const [specializations, setSpecializations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [specToDelete, setSpecToDelete] = useState(null);

  async function getSpecializations() {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/specialization');
      setSpecializations(res.data || []);
    } catch (e) {
      console.error('Error fetching specializations:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getSpecializations();
  }, []);

  function openCreateDrawer() {
    setEditingId(null);
    setForm({ name: '' });
    setIsDrawerOpen(true);
  }

  function openEditDrawer(spec) {
    setEditingId(spec.id);
    setForm({ name: spec.name });
    setIsDrawerOpen(true);
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      alert('Пожалуйста, введите название специализации');
      return;
    }

    try {
      if (editingId) {
        await api.put(`/api/v1/specialization/${editingId}`, { name: form.name.trim() });
      } else {
        await api.post('/api/v1/specialization', { name: form.name.trim() });
      }
      getSpecializations();
      setIsDrawerOpen(false);
      setEditingId(null);
      setForm({ name: '' });
    } catch (e) {
      alert('Ошибка: ' + (e.response?.data?.message || 'Не удалось сохранить'));
    }
  }

  const triggerDelete = (id) => {
    setSpecToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!specToDelete) return;
    try {
      await api.delete(`/api/v1/specialization/${specToDelete}`);
      getSpecializations();
      setDeleteConfirmOpen(false);
      setSpecToDelete(null);
    } catch (e) {
      alert('Ошибка: ' + (e.response?.data?.message || 'Не удалось удалить'));
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

  return (
    <Box>
      <Paper elevation={0} sx={{ p: { xs: 2, sm: 4 }, borderRadius: '24px', border: '1px solid #e5e7eb', backgroundColor: '#fff' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827' }}>Специализации рабочих</Typography>
            <IconButton size="small" onClick={getSpecializations}>
              <RefreshIcon sx={{ fontSize: 18, color: '#6b7280' }} />
            </IconButton>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreateDrawer}
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
            Добавить спец.
          </Button>
        </Box>

        {/* List Grid */}
        {loading ? (
          <Typography sx={{ color: '#6b7280', fontSize: '0.9rem' }}>Загрузка списка специализаций...</Typography>
        ) : specializations.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center', border: '1px dashed #e5e7eb', borderRadius: '16px' }}>
            <Typography color="text.secondary">Специализации еще не добавлены</Typography>
          </Box>
        ) : (
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
            gap: '20px'
          }}>
            {specializations.map((spec, index) => {
              const borderColors = ['#7b61ff', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899'];
              const color = borderColors[index % borderColors.length];

              return (
                <Paper
                  key={spec.id}
                  elevation={0}
                  sx={{
                    p: 2.5,
                    border: '1px solid #e5e7eb',
                    borderLeft: `4px solid ${color}`,
                    borderRadius: '16px',
                    backgroundColor: '#fff',
                    '&:hover': { boxShadow: '0 8px 20px rgba(0,0,0,0.04)', borderColor: '#cbd5e1' },
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                >
                  {/* Actions */}
                  <Stack direction="row" spacing={0.5} sx={{ position: 'absolute', top: 12, right: 12 }}>
                    <IconButton size="small" onClick={() => openEditDrawer(spec)} sx={{ color: '#9ca3af', '&:hover': { color: '#7b61ff' }, p: 0.5 }}>
                      <EditIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton size="small" onClick={() => triggerDelete(spec.id)} sx={{ color: '#9ca3af', '&:hover': { color: '#ef4444' }, p: 0.5 }}>
                      <DeleteIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Stack>

                  {/* Content */}
                  <Box sx={{ pr: 6 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', mb: 2, wordBreak: 'break-word' }}>
                      {spec.name}
                    </Typography>
                  </Box>

                  <Stack spacing={1} sx={{ mt: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PersonIcon sx={{ fontSize: 14, color: '#94a3b8' }} />
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        Создал: {spec.createdBy || 'Система'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CalendarMonthIcon sx={{ fontSize: 14, color: '#94a3b8' }} />
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        {formatDate(spec.createdAt)}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              );
            })}
          </Box>
        )}
      </Paper>

      {/* Drawer */}
      <Drawer
        anchor="right"
        open={isDrawerOpen}
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
        PaperProps={{ sx: { width: { xs: '100%', sm: 440 }, borderRadius: { xs: 0, sm: '24px 0 0 24px' } } }}
      >
        <Box sx={{ p: { xs: 3, sm: 4 }, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {editingId ? 'Редактировать спец.' : 'Добавить специализацию'}
            </Typography>
            <IconButton onClick={() => setIsDrawerOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            {editingId ? 'Измените название специализации рабочих.' : 'Введите название новой специализации для рабочих.'}
          </Typography>

          <Stack spacing={3} sx={{ flex: 1 }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                Название специализации
              </Typography>
              <TextField
                fullWidth
                placeholder="Например: Каменщик, Сварщик, Разнорабочий..."
                value={form.name}
                onChange={e => setForm({ name: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />
            </Box>
          </Stack>

          <Divider sx={{ my: 3 }} />

          <Stack direction="row" spacing={2}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => setIsDrawerOpen(false)}
              sx={{
                py: 1.5,
                borderRadius: '14px',
                fontWeight: 700,
                textTransform: 'none',
                borderColor: '#e5e7eb',
                color: '#374151'
              }}
            >
              Отмена
            </Button>
            <Button
              fullWidth
              variant="contained"
              onClick={handleSubmit}
              sx={{
                backgroundColor: '#7b61ff',
                py: 1.5,
                borderRadius: '14px',
                fontWeight: 700,
                textTransform: 'none',
                '&:hover': { backgroundColor: '#6a50e8' }
              }}
            >
              Сохранить
            </Button>
          </Stack>
        </Box>
      </Drawer>

      {/* Delete Dialog */}
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
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3
            }}>
              <DeleteOutlineIcon sx={{ fontSize: 32, color: '#ef4444' }} />
            </Box>

            <Typography sx={{ fontWeight: 700, fontSize: '1.2rem', color: '#111827', mb: 1.5 }}>
              Удалить специализацию
            </Typography>

            <Typography sx={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.5, mb: 4 }}>
              Вы действительно хотите удалить эту специализацию? Это действие невозможно отменить, и специализация не должна быть назначена рабочим.
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
                  px: 3,
                  py: 1.2,
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
                  px: 3,
                  py: 1.2,
                  '&:hover': { backgroundColor: '#dc2626' }
                }}
              >
                Удалить
              </Button>
            </Stack>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
