import { useState, useEffect } from 'react';
import api from '../api/axios';
import {
  Box, Typography, Button, IconButton, Paper, Drawer,
  TextField, Stack, Tooltip, Dialog, DialogContent, MenuItem, Select, FormControl,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Divider,
  Checkbox, FormControlLabel, DialogTitle, DialogActions, Autocomplete, Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';

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

export default function Rooms() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [form, setForm] = useState({ passport: '', paidAt: '', numberOfMonths: 1 });
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [checkToDelete, setCheckToDelete] = useState(null);

  const [allWorkers, setAllWorkers] = useState([]);
  const [selectedWorkers, setSelectedWorkers] = useState([]);

  // Export states
  const ALL_COLUMNS = [
    { key: 'workerName', label: 'Рабочий' },
    { key: 'passport', label: 'Серия/номер паспорта' },
    { key: 'paidAt', label: 'Дата оплаты' },
    { key: 'validFrom', label: 'Действителен с' },
    { key: 'validUntil', label: 'Действителен до' },
    { key: 'numberOfMonths', label: 'Оплачено месяцев' },
    { key: 'createdBy', label: 'Кем добавлен' },
  ];
  const [selectedColumns, setSelectedColumns] = useState(ALL_COLUMNS.map(c => c.key));
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  async function getChecks() {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/check');
      setChecks(res.data || []);
    } catch (e) {
      console.error('Error fetching checks:', e);
    } finally {
      setLoading(false);
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

  useEffect(() => {
    getChecks();
    fetchAllWorkers();
  }, []);

  function openCreateDrawer() {
    // Default payment date is today
    const todayStr = new Date().toISOString().split('T')[0];
    setForm({ passport: '', paidAt: todayStr, numberOfMonths: 1 });
    setSelectedWorkers([]);
    setIsDrawerOpen(true);
  }

  async function handleSubmit() {
    if (selectedWorkers.length === 0) {
      alert('Пожалуйста, выберите хотя бы одного рабочего');
      return;
    }
    if (!form.paidAt) {
      alert('Пожалуйста, выберите дату оплаты');
      return;
    }

    try {
      const passports = selectedWorkers.map(w => w.passport).filter(Boolean);
      if (passports.length === 0) {
        alert('У выбранных рабочих не заполнены данные паспорта');
        return;
      }

      const res = await api.post('/api/v1/check/bulk', {
        passports,
        paidAt: new Date(form.paidAt).toISOString(),
        numberOfMonths: Number(form.numberOfMonths)
      });

      if (res.data?.errors && res.data.errors.length > 0) {
        const errorList = res.data.errors.map(err => `${err.passport}: ${err.message}`).join('\n');
        alert(`Обработано чеков: ${res.data.results?.length || 0} успешно, ${res.data.errors.length} с ошибками.\n\nОшибки:\n${errorList}`);
      } else {
        alert('Все чеки успешно зарегистрированы');
      }

      getChecks();
      setIsDrawerOpen(false);
    } catch (e) {
      alert('Ошибка: ' + (e.response?.data?.message || 'Не удалось зарегистрировать чеки'));
    }
  }

  const triggerDelete = (id) => {
    setCheckToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!checkToDelete) return;
    try {
      await api.delete(`/api/v1/check/${checkToDelete}`);
      getChecks();
      setDeleteConfirmOpen(false);
      setCheckToDelete(null);
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
  const handleExportCSV = () => {
    setExportDialogOpen(true);
  };

  const doExportCSV = () => {
    const cols = ALL_COLUMNS.filter(c => selectedColumns.includes(c.key));
    const headers = cols.map(c => c.label);

    const getCellValue = (c, colKey) => {
      switch (colKey) {
        case 'workerName': return c.worker?.fullName || '';
        case 'passport': return c.worker?.passport || '';
        case 'paidAt': return c.paidAt ? new Date(c.paidAt).toLocaleDateString('ru-RU') : '';
        case 'validFrom': return c.validFrom ? new Date(c.validFrom).toLocaleDateString('ru-RU') : '';
        case 'validUntil': return c.validUntil ? new Date(c.validUntil).toLocaleDateString('ru-RU') : '';
        case 'numberOfMonths': return c.numberOfMonths || 1;
        case 'createdBy': return c.createdBy || '';
        default: return '';
      }
    };

    const rows = filteredChecks.map(c => cols.map(col => getCellValue(c, col.key)));

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
    link.setAttribute('download', `checks_export_${new Date().toISOString().split('T')[0]}.csv`);
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

      const idxPassport = headers.findIndex(h => h.toLowerCase().includes('паспорт') || h.toLowerCase().includes('passport') || h.toLowerCase().includes('серия'));
      if (idxPassport === -1) {
        alert('Ошибка: Файл CSV должен содержать колонку "Паспорт" или "Серия/номер паспорта"');
        return;
      }

      const idxPaidAt = headers.findIndex(h => h.toLowerCase().includes('оплаты') || h.toLowerCase().includes('paidat') || h.toLowerCase().includes('дата'));
      const idxMonths = headers.findIndex(h => h.toLowerCase().includes('месяц') || h.toLowerCase().includes('month') || h.toLowerCase().includes('оплачено'));

      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
        const r = dataRows[rowIndex];
        if (r.length === 0) continue;

        const passportVal = r[idxPassport]?.trim() || '';
        if (!passportVal) {
          errorCount++;
          errors.push(`Строка ${rowIndex + 2}: Отсутствует серия/номер паспорта.`);
          continue;
        }

        let paidAtVal = new Date().toISOString();
        if (idxPaidAt !== -1 && r[idxPaidAt]) {
          const parsedDate = new Date(r[idxPaidAt].trim());
          if (!isNaN(parsedDate.getTime())) {
            paidAtVal = parsedDate.toISOString();
          }
        }

        let monthsVal = 1;
        if (idxMonths !== -1 && r[idxMonths]) {
          const parsedMonths = parseInt(r[idxMonths].trim());
          if (!isNaN(parsedMonths) && parsedMonths > 0) {
            monthsVal = parsedMonths;
          }
        }

        try {
          await api.post('/api/v1/check', {
            passport: passportVal,
            paidAt: paidAtVal,
            numberOfMonths: monthsVal
          });
          successCount++;
        } catch (err) {
          errorCount++;
          const apiMsg = err.response?.data?.message;
          const detail = Array.isArray(apiMsg) ? apiMsg.join(', ') : apiMsg || 'Неизвестная ошибка';
          errors.push(`Строка ${rowIndex + 2} (${passportVal}): ${detail}`);
        }
      }

      alert(`Импорт завершен!\nУспешно добавлено: ${successCount}\nОшибок: ${errorCount}${errors.length > 0 ? '\n\nДетали ошибок:\n' + errors.slice(0, 10).join('\n') : ''}`);
      getChecks();
    };
    reader.readAsText(file);
    event.target.value = '';
  };
  const filteredChecks = checks.filter(check => {
    const term = searchQuery.toLowerCase();
    const workerName = check.worker?.fullName?.toLowerCase() || '';
    const passport = check.worker?.passport?.toLowerCase() || '';
    const creator = check.createdBy?.toLowerCase() || '';
    return workerName.includes(term) || passport.includes(term) || creator.includes(term);
  });

  const totalPages = Math.max(1, Math.ceil(filteredChecks.length / ITEMS_PER_PAGE));
  const paginated = filteredChecks.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <Box>
      <Paper elevation={0} sx={{ p: { xs: 2, sm: 4 }, borderRadius: '24px', border: '1px solid #e5e7eb', backgroundColor: '#fff' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827' }}>Чеки оплат</Typography>
            <IconButton size="small" onClick={getChecks}>
              <RefreshIcon sx={{ fontSize: 18, color: '#6b7280' }} />
            </IconButton>
          </Box>
          <Stack direction="row" spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' }, flexWrap: { xs: 'wrap', sm: 'nowrap' }, gap: { xs: 1, sm: 0 } }}>
            <TextField
              size="small"
              placeholder="Поиск по ФИО, паспорту..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              sx={{ width: { xs: '100%', sm: 200 }, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            />
            <Button
              variant="contained"
              component="label"
              sx={{
                backgroundColor: '#2563eb', color: '#ffffff', textTransform: 'none',
                borderRadius: '12px', px: 2, py: 1, fontWeight: 700, fontSize: '0.82rem',
                boxShadow: 'none',
                '&:hover': { backgroundColor: '#1d4ed8', boxShadow: 'none' },
                whiteSpace: 'nowrap'
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
                '&:hover': { backgroundColor: '#15803d', boxShadow: 'none' },
                whiteSpace: 'nowrap'
              }}
            >
              Экспорт
            </Button>
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
                whiteSpace: 'nowrap',
                '&:hover': { backgroundColor: '#6a50e8' }
              }}
            >
              Добавить чек
            </Button>
          </Stack>
        </Box>

        {/* Table view */}
        <TableContainer sx={{ border: '1px solid #e5e7eb', borderRadius: '16px', overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ backgroundColor: '#f9fafb' }}>
              <TableRow>
                {['Рабочий', 'Серия/номер паспорта', 'Дата оплаты', 'Период действия', 'Оплачено месяцев', 'Кем добавлен', 'Действия'].map(col => (
                  <TableCell key={col} sx={{ fontWeight: 600, color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: '#9ca3af' }}>Загрузка списка чеков...</TableCell>
                </TableRow>
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: '#9ca3af' }}>Чеки оплат не найдены</TableCell>
                </TableRow>
              ) : paginated.map((check) => (
                <TableRow key={check.id} hover>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{check.worker?.fullName || '—'}</TableCell>
                  <TableCell sx={{ fontSize: '0.85rem' }}>{check.worker?.passport || '—'}</TableCell>
                  <TableCell sx={{ fontSize: '0.85rem' }}>{formatDate(check.paidAt)}</TableCell>
                  <TableCell sx={{ fontSize: '0.85rem', fontWeight: 500, color: '#7b61ff' }}>
                    {formatDate(check.validFrom)} — {formatDate(check.validUntil)}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.85rem', fontWeight: 700 }} align="center">{check.numberOfMonths} мес.</TableCell>
                  <TableCell sx={{ fontSize: '0.85rem', color: '#64748b' }}>{check.createdBy || 'Система'}</TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => triggerDelete(check.id)} sx={{ color: '#9ca3af', '&:hover': { color: '#ef4444' } }}>
                      <DeleteIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e5e7eb', mt: 2 }}>
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
            <Typography variant="h5" sx={{ fontWeight: 800 }}>Регистрация чеков</Typography>
            <IconButton onClick={() => setIsDrawerOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Выберите рабочих и введите данные платежного чека патентного налога.
          </Typography>

          <Stack spacing={3} sx={{ flex: 1 }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                Выберите рабочих (одного или нескольких) *
              </Typography>
              <Autocomplete
                multiple
                size="small"
                options={allWorkers}
                getOptionLabel={(w) => `${w.fullName} (${w.passport || 'Без паспорта'})`}
                value={selectedWorkers}
                onChange={(e, v) => setSelectedWorkers(v)}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Поиск по имени или паспорту..."
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#fff' } }}
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      key={option.id}
                      variant="outlined"
                      label={option.fullName}
                      size="small"
                      {...getTagProps({ index })}
                      sx={{ borderRadius: '6px' }}
                    />
                  ))
                }
              />
            </Box>

            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                Дата совершения оплаты *
              </Typography>
              <TextField
                fullWidth
                type="date"
                value={form.paidAt}
                onChange={e => setForm(p => ({ ...p, paidAt: e.target.value }))}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />
            </Box>

            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#374151' }}>
                Количество месяцев покрытия
              </Typography>
              <FormControl fullWidth>
                <Select
                  value={form.numberOfMonths}
                  onChange={e => setForm(p => ({ ...p, numberOfMonths: Number(e.target.value) }))}
                  sx={{ borderRadius: '12px' }}
                  MenuProps={{ sx: { zIndex: 2001 } }}
                >
                  <MenuItem value={1}>1 месяц</MenuItem>
                  <MenuItem value={2}>2 месяца</MenuItem>
                  <MenuItem value={3}>3 месяца</MenuItem>
                  <MenuItem value={4}>4 месяца</MenuItem>
                  <MenuItem value={5}>5 месяцев</MenuItem>
                  <MenuItem value={6}>6 месяцев</MenuItem>
                  <MenuItem value={12}>12 месяцев (1 год)</MenuItem>
                </Select>
              </FormControl>
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
              Зарегистрировать
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
              Удалить чек оплаты
            </Typography>

            <Typography sx={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.5, mb: 4 }}>
              Вы действительно хотите удалить этот чек оплаты? Это действие невозможно отменить, и период действия патента рабочего сократится соответственно.
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
