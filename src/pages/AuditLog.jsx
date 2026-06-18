import { useState, useEffect } from 'react';
import api from '../api/axios';
import {
  Box, Typography, Paper, IconButton, TextField, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Select, MenuItem, FormControl, InputLabel, Button
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';

const ITEMS_PER_PAGE = 15;

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

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterEntity, setFilterEntity] = useState('');

  async function getLogs() {
    setLoading(true);
    try {
      const params = {};
      if (filterAction) params.action = filterAction;
      if (filterEntity) params.entityType = filterEntity;
      if (searchQuery) params.search = searchQuery;

      const res = await api.get('/api/v1/audit-log', { params });
      setLogs(res.data || []);
    } catch (e) {
      console.error('Error fetching audit logs:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getLogs();
  }, [filterAction, filterEntity, searchQuery]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'CREATE': return '#10b981';
      case 'UPDATE': return '#3b82f6';
      case 'DELETE': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const totalPages = Math.max(1, Math.ceil(logs.length / ITEMS_PER_PAGE));
  const paginated = logs.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <Box>
      <Paper elevation={0} sx={{ p: { xs: 2, sm: 4 }, borderRadius: '24px', border: '1px solid #e5e7eb', backgroundColor: '#fff' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827' }}>Логи действий</Typography>
            <IconButton size="small" onClick={getLogs}>
              <RefreshIcon sx={{ fontSize: 18, color: '#6b7280' }} />
            </IconButton>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            <TextField
              size="small"
              placeholder="Поиск по ФИО, описанию..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              sx={{ width: { xs: '100%', sm: 200 }, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            />
            <FormControl size="small" sx={{ width: { xs: '100%', sm: 150 } }}>
              <InputLabel id="action-select-label">Действие</InputLabel>
              <Select
                labelId="action-select-label"
                value={filterAction}
                label="Действие"
                onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
                sx={{ borderRadius: '10px' }}
              >
                <MenuItem value="">Все</MenuItem>
                <MenuItem value="CREATE">CREATE</MenuItem>
                <MenuItem value="UPDATE">UPDATE</MenuItem>
                <MenuItem value="DELETE">DELETE</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ width: { xs: '100%', sm: 150 } }}>
              <InputLabel id="entity-select-label">Тип сущности</InputLabel>
              <Select
                labelId="entity-select-label"
                value={filterEntity}
                label="Тип сущности"
                onChange={(e) => { setFilterEntity(e.target.value); setPage(1); }}
                sx={{ borderRadius: '10px' }}
              >
                <MenuItem value="">Все</MenuItem>
                <MenuItem value="Worker">Worker</MenuItem>
                <MenuItem value="Group">Group</MenuItem>
                <MenuItem value="Specialization">Specialization</MenuItem>
                <MenuItem value="Check">Check</MenuItem>
                <MenuItem value="User">User</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Box>

        {/* Table view */}
        <TableContainer sx={{ border: '1px solid #e5e7eb', borderRadius: '16px', overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ backgroundColor: '#f9fafb' }}>
              <TableRow>
                {['Дата и время', 'Пользователь', 'Роль', 'Действие', 'Сущность', 'Описание'].map(col => (
                  <TableCell key={col} sx={{ fontWeight: 600, color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, color: '#9ca3af' }}>Загрузка логов...</TableCell>
                </TableRow>
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, color: '#9ca3af' }}>Логи не найдены</TableCell>
                </TableRow>
              ) : paginated.map((log) => (
                <TableRow key={log.id} hover>
                  <TableCell sx={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{formatDate(log.createdAt)}</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{log.userFullName || '—'}</TableCell>
                  <TableCell sx={{ fontSize: '0.85rem' }}>{log.role || '—'}</TableCell>
                  <TableCell sx={{ fontSize: '0.85rem', fontWeight: 700, color: getActionColor(log.action) }}>
                    {log.action}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>{log.entityType || '—'}</TableCell>
                  <TableCell sx={{ fontSize: '0.85rem', color: '#374151' }}>{log.description || '—'}</TableCell>
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
    </Box>
  );
}
