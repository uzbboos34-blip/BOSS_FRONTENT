import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import api from '../api/axios';
import {
  Box, Typography, Button, IconButton, Paper, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Avatar, InputAdornment, Stack, Divider, Drawer, Chip,
  Dialog, DialogContent, DialogTitle, DialogActions, Select, MenuItem,
  FormControl, Checkbox, FormControlLabel, LinearProgress, CircularProgress
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
import BadgeIcon from '@mui/icons-material/Badge';
import WorkIcon from '@mui/icons-material/Work';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';

const ITEMS_PER_PAGE = 10;

const avatarColors = ['#7b61ff', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#ec4899'];
const getColor = (id) => avatarColors[(id || 0) % avatarColors.length];

const getInitials = (name = '') => {
  const parts = (name || '').trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : (parts[0]?.[0] || '?').toUpperCase();
};

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

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

const getRowStyle = (remainingDays) => {
  if (remainingDays === null || remainingDays === undefined) return {};
  if (remainingDays <= 0) {
    return { bgcolor: '#cbd5e1', color: '#000000' };
  }
  if (remainingDays <= 3) {
    return { bgcolor: '#fee2e2', color: '#991b1b' };
  }
  if (remainingDays <= 10) {
    return { bgcolor: '#fef9c3', color: '#854d0e' };
  }
  return {};
};

const CITIZENSHIP_OPTIONS = [
  { value: 'UZ', label: 'Узбекистан (UZ)' },
  { value: 'RU', label: 'Россия (RU)' },
  { value: 'KZ', label: 'Казахстан (KZ)' },
  { value: 'KG', label: 'Кыргызстан (KG)' },
  { value: 'TJ', label: 'Таджикистан (TJ)' },
  { value: 'OTHER', label: 'Другое' },
];

const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Мужской' },
  { value: 'FEMALE', label: 'Женский' },
];

const emptyForm = () => ({
  fullName: '',
  passport: '',
  qrCode: '',
  phone: '',
  position: '',
  citizenship: 'UZ',
  gender: 'MALE',
  startDate: '',
  birthDate: '',
  patentNo: '',
  patentStartDate: '',
  inn: '',
  campAddress: '',
  constructionSite: '',
  department: '',
  teamDivision: '',
  hourlyRate: '',
  sicilNo: '',
  centerNo: '',
  description: '',
  groupId: '',
  specializationId: '',
});

const Field = ({ label, required, children }) => (
  <Box>
    <Typography sx={{ mb: 0.5, fontWeight: 600, fontSize: '0.82rem', color: '#374151' }}>
      {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
    </Typography>
    {children}
  </Box>
);

export default function Students() {
  const [workers, setWorkers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [searchName, setSearchName] = useState('');
  const [searchPassport, setSearchPassport] = useState('');
  const [searchQrCode, setSearchQrCode] = useState('');
  const [searchJob, setSearchJob] = useState('');
  const [searchBrigade, setSearchBrigade] = useState('');
  const [searchColor, setSearchColor] = useState('');
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState('workers');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [selectedIds, setSelectedIds] = useState([]);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const ALL_COLUMNS = [
    { key: 'centerNo',        label: 'Merkez No' },
    { key: 'passport',        label: 'Pasaport No' },
    { key: 'constructionSite',label: 'Şantiye' },
    { key: 'sicilNo',         label: 'Sicil No' },
    { key: 'fullName',        label: 'Ad Soyad' },
    { key: 'fullNameRu',      label: 'Ф.И.О.' },
    { key: 'position',        label: 'Görev Adı' },
    { key: 'citizenship',     label: 'Гражданство' },
    { key: 'startDate',       label: 'Giriş Tarihi' },
    { key: 'hourlyRate',      label: 'Saatlik Ücret' },
    { key: 'teamDivision',    label: 'Ekip Dagilimi' },
    { key: 'department',      label: 'Departman' },
    { key: 'phone',           label: 'TEL №' },
    { key: 'birthDate',       label: 'Дата рождения' },
    { key: 'remainingPatentDays', label: 'KUN' },
    { key: 'patentNo',        label: 'Патент №' },
    { key: 'patentStartDate', label: 'Дата выдачи патента' },
    { key: 'patentEndDate',   label: 'Patent Bitis Tarihi' },
    { key: 'inn',             label: 'INN' },
    { key: 'qrCode',          label: 'Киг' },
    { key: 'campAddress',     label: 'Camp VE Oturum yeri' },
    { key: 'gender',          label: 'Пол' },
  ];
  const [selectedColumns, setSelectedColumns] = useState(ALL_COLUMNS.map(c => c.key));

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [workerToDelete, setWorkerToDelete] = useState(null);
  const [importProgress, setImportProgress] = useState(null);

  const token = () => localStorage.getItem('token');

  async function fetchWorkers() {
    try {
      const params = {};
      if (searchName.trim()) params.name = searchName.trim();
      if (searchPassport.trim()) params.passport = searchPassport.trim();
      if (searchQrCode.trim()) params.qr = searchQrCode.trim();
      if (searchJob.trim()) params.job = searchJob.trim();
      if (searchBrigade.trim()) params.brigade = searchBrigade.trim();
      if (searchColor) params.color = searchColor;

      const res = await api.get('/api/v1/worker', { params });
      setWorkers(Array.isArray(res.data) ? res.data : (res.data?.data || []));
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
  }

  async function fetchGroups() {
    try {
      const res = await api.get('/api/v1/group/group/all');
      setGroups(Array.isArray(res.data) ? res.data : (res.data?.data || []));
    } catch { }
  }

  async function fetchSpecializations() {
    try {
      const res = await api.get('/api/v1/specialization');
      setSpecializations(Array.isArray(res.data) ? res.data : (res.data?.data || []));
    } catch { }
  }

  useEffect(() => {
    if (!token() || token() === 'undefined') { window.location.href = '/login'; return; }
    fetchWorkers();
  }, [searchName, searchPassport, searchQrCode, searchJob, searchBrigade, searchColor]);

  useEffect(() => {
    fetchGroups();
    fetchSpecializations();
  }, []);

  function openCreateDrawer() {
    setEditingId(null);
    setForm(emptyForm());
    setDrawerOpen(true);
  }

  function openEditDrawer(worker) {
    setEditingId(worker.id);
    setForm({
      fullName: worker.fullName || '',
      passport: worker.passport || '',
      qrCode: worker.qrCode || '',
      phone: worker.phone || '',
      position: worker.position || '',
      citizenship: worker.citizenship || 'UZ',
      gender: worker.gender || 'MALE',
      startDate: worker.startDate ? worker.startDate.split('T')[0] : '',
      birthDate: worker.birthDate ? worker.birthDate.split('T')[0] : '',
      patentNo: worker.patentNo || '',
      patentStartDate: worker.patentStartDate ? worker.patentStartDate.split('T')[0] : '',
      inn: worker.inn || '',
      campAddress: worker.campAddress || '',
      constructionSite: worker.constructionSite || '',
      department: worker.department || '',
      teamDivision: worker.teamDivision || '',
      hourlyRate: worker.hourlyRate != null ? String(worker.hourlyRate) : '',
      sicilNo: worker.sicilNo || '',
      centerNo: worker.centerNo || '',
      description: worker.description || '',
      groupId: worker.groupId ? String(worker.groupId) : '',
      specializationId: worker.specializationId ? String(worker.specializationId) : '',
    });
    setDrawerOpen(true);
  }

  function buildPayload() {
    const p = {
      fullName: form.fullName.trim(),
      passport: form.passport.trim(),
      qrCode: form.qrCode.trim(),
    };
    if (form.phone) p.phone = form.phone.trim();
    if (form.position) p.position = form.position.trim();
    if (form.citizenship) p.citizenship = form.citizenship;
    if (form.gender) p.gender = form.gender;
    if (form.startDate) p.startDate = form.startDate;
    if (form.birthDate) p.birthDate = form.birthDate;
    if (form.patentNo) p.patentNo = form.patentNo.trim();
    if (form.patentStartDate) p.patentStartDate = form.patentStartDate;
    if (form.inn) p.inn = form.inn.trim();
    if (form.campAddress) p.campAddress = form.campAddress.trim();
    if (form.constructionSite) p.constructionSite = form.constructionSite.trim();
    if (form.department) p.department = form.department.trim();
    if (form.teamDivision) p.teamDivision = form.teamDivision.trim();
    if (form.hourlyRate) p.hourlyRate = parseFloat(form.hourlyRate);
    if (form.sicilNo) p.sicilNo = form.sicilNo.trim();
    if (form.centerNo) p.centerNo = form.centerNo.trim();
    if (form.description) p.description = form.description.trim();
    if (form.groupId) p.groupId = parseInt(form.groupId);
    if (form.specializationId) p.specializationId = parseInt(form.specializationId);
    return p;
  }

  async function handleSubmit() {
    if (!form.fullName.trim() || !form.passport.trim() || !form.qrCode.trim()) {
      return alert('Заполните обязательные поля: Ф.И.О., Паспорт, QR-код!');
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      if (editingId) {
        await api.put(`/api/v1/worker/${editingId}`, payload);
      } else {
        await api.post('/api/v1/worker', payload);
      }
      fetchWorkers();
      setDrawerOpen(false);
      setEditingId(null);
    } catch (err) {
      const msg = err.response?.data?.message;
      alert('Ошибка: ' + (Array.isArray(msg) ? msg.join(', ') : msg || 'Не удалось сохранить'));
    } finally { setSaving(false); }
  }

  const triggerDelete = (id) => {
    setWorkerToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!workerToDelete) return;
    try {
      await api.delete(`/api/v1/worker/${workerToDelete}`);
      fetchWorkers();
      setDeleteConfirmOpen(false);
      setWorkerToDelete(null);
    } catch (err) {
      alert('Ошибка: ' + (err.response?.data?.message || 'Не удалось удалить'));
    }
  };

  // Filter: active vs archive
  const filtered = workers.filter(w => {
    return activeTab === 'archive' ? w.isActive === false : w.isActive !== false;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const getCellValue = (w, key) => {
    switch (key) {
      case 'startDate':      return w.startDate ? fmtDate(w.startDate) : '';
      case 'birthDate':      return w.birthDate ? fmtDate(w.birthDate) : '';
      case 'patentStartDate':return w.patentStartDate ? fmtDate(w.patentStartDate) : '';
      case 'patentEndDate':  return w.patentEndDate ? fmtDate(w.patentEndDate) : '';
      case 'remainingPatentDays':
        return w.remainingPatentDays != null ? `${w.remainingPatentDays} д.` : '';
      case 'gender':
        return w.gender === 'MALE' ? 'Мужской' : w.gender === 'FEMALE' ? 'Женский' : '';
      default:               return w[key] ?? '';
    }
  };

  const doExportCSV = () => {
    const cols = ALL_COLUMNS.filter(c => selectedColumns.includes(c.key));
    const toExport = selectedIds.length > 0
      ? workers.filter(w => selectedIds.includes(w.id))
      : workers;

    const headers = cols.map(c => c.label);
    const rows = toExport.map(w => cols.map(c => getCellValue(w, c.key)));

    // Build worksheet data
    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws['!cols'] = cols.map(c => ({
      wch: Math.max(
        c.label.length + 2,
        ...rows.map(r => String(r[cols.indexOf(c)] ?? '').length)
      )
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Workers');
    XLSX.writeFile(wb, `workers_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    setExportDialogOpen(false);
  };

  const handleImportCSV = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    
    // Apple Numbers file detection
    if (fileName.endsWith('.numbers')) {
      alert('Apple Numbers (.numbers) fayllari to\'g\'ridan-to\'g\'ri qo\'llab-quvvatlanmaydi.\n\nIltimos, ushbu faylni Numbers dasturida ochib, "Fayl -> Eksport -> Excel..." (File -> Export To -> Excel...) orqali .xlsx formatida saqlang va keyin yuklang.');
      event.target.value = '';
      return;
    }

    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isCsv = fileName.endsWith('.csv') || fileName.endsWith('.tsv') || fileName.endsWith('.txt');

    if (!isExcel && !isCsv) {
      alert('Faqat Excel (.xlsx, .xls) va CSV (.csv) fayllari qo\'llab-quvvatlanadi. Iltimos, fayl formatini tekshiring.');
      event.target.value = '';
      return;
    }

    const processRows = async (headers, dataRows) => {
      // Column name matcher
      const find = (...keywords) =>
        headers.findIndex(h => keywords.some(kw => String(h).toLowerCase().includes(kw.toLowerCase())));

      const idx = {
        fullName:         find('Ad Soyad', 'Ф.И.О', 'fullname', 'имя', 'adi soyadi', 'adı soyadı', 'soyadi', 'soyad'),
        fullNameRu:       find('Ф.И.О', 'fullnameru'),
        passport:         find('Pasaport', 'Паспорт', 'passport', 'passaport'),
        qrCode:           find('Киг', 'qr', 'kod', 'код'),
        phone:            find('TEL', 'телефон', 'phone'),
        position:         find('Görev', 'должность', 'position'),
        citizenship:      find('Гражданство', 'citizenship'),
        gender:           find('Пол', 'gender'),
        startDate:        find('Giriş', 'Giris', 'начал', 'startdate'),
        birthDate:        find('рождения', 'birthdate'),
        patentNo:         find('Патент №', 'patent №', 'patentno', 'patent no', 'патент'),
        patentStartDate:  find('выдачи', 'patentstart'),
        patentEndDate:    find('Bitis', 'Bitiş', 'patentend'),
        inn:              find('INN', 'ИНН'),
        campAddress:      find('Camp', 'адрес', 'campaddress', 'Камп', 'Kamp'),
        constructionSite: find('Şantiye', 'Santiye', 'площадка', 'site'),
        department:       find('Departman', 'департамент', 'department'),
        teamDivision:     find('Ekip', 'бригада', 'team'),
        hourlyRate:       find('Saatlik', 'ставка', 'rate'),
        sicilNo:          find('Sicil'),
        centerNo:         find('Merkez', 'Center'),
      };

      if (idx.fullName === -1 || idx.passport === -1) {
        alert(`Xato: Fayl "Ad Soyad" (yoki "Adi Soyadi") va "Pasaport No" ustunlarini o'z ichiga olishi kerak.\nTopilgan ustunlar: ${headers.join(', ')}`);
        return;
      }

      const parseDate = (val) => {
        if (!val) return undefined;
        const s = String(val).trim();
        const dmy = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
        if (dmy) {
          const d = new Date(`${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`);
          return isNaN(d) ? undefined : d.toISOString();
        }
        if (/^\d+$/.test(s)) {
          const d = new Date(Math.round((Number(s) - 25569) * 86400 * 1000));
          return isNaN(d) ? undefined : d.toISOString();
        }
        const d = new Date(s);
        return isNaN(d) ? undefined : d.toISOString();
      };

      const cleanVal = (val) => {
        if (!val) return '';
        const s = String(val).trim();
        const lower = s.toLowerCase();
        if (
          s === '' ||
          s === '-' ||
          s === '—' ||
          s === '.' ||
          lower === 'нет' ||
          lower === 'no' ||
          lower === 'null' ||
          lower === 'none' ||
          lower === 'n/a' ||
          lower === 'na' ||
          lower === 'undefined'
        ) {
          return '';
        }
        return s;
      };

      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      // Filter valid rows first to calculate progress accurately
      const validRows = [];
      for (let ri = 0; ri < dataRows.length; ri++) {
        const r = dataRows[ri];
        const get = (i) => (i !== -1 && r[i] != null) ? String(r[i]).trim() : '';
        const fullNameVal = cleanVal(get(idx.fullName));
        const passportVal = cleanVal(get(idx.passport));
        if (fullNameVal && passportVal) {
          validRows.push({ ri, r, fullNameVal, passportVal });
        }
      }

      if (validRows.length === 0) {
        alert('Faylda import qilinadigan to\'g\'ri ma\'lumotlar topilmadi (Ism va Pasport bo\'sh bo\'lmasligi lozim).');
        return;
      }

      setImportProgress({ current: 0, total: validRows.length });

      // ─── Guruhlarni avvaldan yaratib olish (findOrCreate) ──────────────────
      // department ustunidan noyob guruh nomlarini yig'amiz
      const groupCache = {}; // { 'Departman A': 5, 'Departman B': 12, ... }
      const uniqueGroupNames = new Set();
      for (const { r } of validRows) {
        const get = (i) => (i !== -1 && r[i] != null) ? String(r[i]).trim() : '';
        const groupName = cleanVal(get(idx.department));
        if (groupName) uniqueGroupNames.add(groupName);
      }

      for (const groupName of uniqueGroupNames) {
        try {
          const res = await api.post('/api/v1/group/find-or-create', { name: groupName });
          groupCache[groupName] = res.data.id;
        } catch (e) {
          console.warn('Guruh yaratib bo\'lmadi:', groupName, e);
        }
      }
      // ───────────────────────────────────────────────────────────────────────

      // ─── Ixtisosliklarni avvaldan yaratib olish (findOrCreate) ─────────────
      // teamDivision (Ekip Dagilimi) ustunidan noyob ixtisoslik nomlarini yig'amiz
      const specCache = {}; // { 'Ekip A': 3, 'Ekip B': 7, ... }
      const uniqueSpecNames = new Set();
      for (const { r } of validRows) {
        const get = (i) => (i !== -1 && r[i] != null) ? String(r[i]).trim() : '';
        const teamVal = cleanVal(get(idx.teamDivision));
        if (teamVal) uniqueSpecNames.add(teamVal);
      }

      for (const specName of uniqueSpecNames) {
        try {
          const res = await api.post('/api/v1/specialization/find-or-create', { name: specName });
          specCache[specName] = res.data.id;
        } catch (e) {
          console.warn('Ixtisoslik yaratib bo\'lmadi:', specName, e);
        }
      }
      // ───────────────────────────────────────────────────────────────────────

      const concurrency = 5;
      for (let i = 0; i < validRows.length; i += concurrency) {
        const chunk = validRows.slice(i, i + concurrency);

        await Promise.all(chunk.map(async ({ ri, r, fullNameVal, passportVal }) => {
          const get = (idxVal) => (idxVal !== -1 && r[idxVal] != null) ? String(r[idxVal]).trim() : '';
          const payload = { fullName: fullNameVal, passport: passportVal };

          const qr    = cleanVal(get(idx.qrCode));
          payload.qrCode = qr || passportVal;
          const ph    = cleanVal(get(idx.phone));            if (ph)    payload.phone = ph;
          const pos   = cleanVal(get(idx.position));         if (pos)   payload.position = pos;
          const fnRu  = cleanVal(get(idx.fullNameRu));       if (fnRu)  payload.fullNameRu = fnRu;
          const inn   = cleanVal(get(idx.inn));              if (inn)   payload.inn = inn;
          const camp  = cleanVal(get(idx.campAddress));      if (camp)  payload.campAddress = camp;
          const site  = cleanVal(get(idx.constructionSite)); if (site)  payload.constructionSite = site;
          const dept  = cleanVal(get(idx.department));       if (dept)  payload.department = dept;
          const team  = cleanVal(get(idx.teamDivision));     if (team)  payload.teamDivision = team;
          const sicil = cleanVal(get(idx.sicilNo));          if (sicil) payload.sicilNo = sicil;
          const center= cleanVal(get(idx.centerNo));         if (center)payload.centerNo = center;
          const patNo = cleanVal(get(idx.patentNo));         if (patNo) payload.patentNo = patNo;

          // Guruhga biriktirish — department nomidan groupId topamiz
          const brigadeKey = cleanVal(get(idx.department));
          if (brigadeKey && groupCache[brigadeKey]) {
            payload.groupId = groupCache[brigadeKey];
          }

          // Ixtisoslikka biriktirish — teamDivision (Ekip Dagilimi) nomidan specializationId topamiz
          const teamKey = cleanVal(get(idx.teamDivision));
          if (teamKey && specCache[teamKey]) {
            payload.specializationId = specCache[teamKey];
          }

          const rawRate = cleanVal(get(idx.hourlyRate));
          if (rawRate) { const rv = parseFloat(rawRate); if (!isNaN(rv)) payload.hourlyRate = rv; }

          const rawCit = cleanVal(get(idx.citizenship)).toUpperCase().replace(/[^A-Z]/g,'');
          if (rawCit) payload.citizenship = ['UZ','RU','KZ','KG','TJ','OTHER'].includes(rawCit) ? rawCit : 'UZ';

          const rawGen = cleanVal(get(idx.gender)).toUpperCase();
          if (rawGen) payload.gender = (rawGen.includes('ЖЕН') || rawGen.includes('FEMALE') || rawGen === 'F') ? 'FEMALE' : 'MALE';

          const sd = parseDate(cleanVal(get(idx.startDate)));       if (sd) payload.startDate = sd;
          const bd = parseDate(cleanVal(get(idx.birthDate)));       if (bd) payload.birthDate = bd;
          const ps = parseDate(cleanVal(get(idx.patentStartDate))); if (ps) payload.patentStartDate = ps;
          const pe = parseDate(cleanVal(get(idx.patentEndDate)));   if (pe) payload.patentEndDate = pe;

          try {
            await api.post('/api/v1/worker', payload);
            successCount++;
          } catch (err) {
            errorCount++;
            const msg = err.response?.data?.message;
            errors.push(`Qator ${ri + 2} (${fullNameVal}): ${Array.isArray(msg) ? msg.join(', ') : msg || 'Xato'}`);
          }
        }));

        setImportProgress({ current: Math.min(i + concurrency, validRows.length), total: validRows.length });
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setImportProgress(null);

      const groupCount = Object.keys(groupCache).length;
      const groupNames = Object.keys(groupCache).join(', ');
      const groupInfo = groupCount > 0
        ? `\n\n📁 Guruhlar (${groupCount} ta): ${groupNames}`
        : '';

      alert(`Import tugadi!\n✅ Qo'shildi: ${successCount}\n❌ Xato: ${errorCount}${groupInfo}${errors.length > 0 ? '\n\nXatolar:\n' + errors.slice(0, 10).join('\n') + (errors.length > 10 ? `\n...va yana ${errors.length - 10} ta xato` : '') : ''}`);
      fetchWorkers();
    };

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: false });
        let ws = null;
        let rows = [];
        let headerRowIndex = -1;

        for (const sheetName of wb.SheetNames) {
          const sheet = wb.Sheets[sheetName];
          const sheetRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
          
          for (let i = 0; i < Math.min(sheetRows.length, 25); i++) {
            const r = sheetRows[i];
            if (!r || !Array.isArray(r)) continue;
            const hasRequired = r.some(cell => {
              const s = String(cell).toLowerCase();
              return s.includes('pasaport') || s.includes('soyad') || s.includes('soyadi') || 
                     s.includes('sicil') || s.includes('паспорт') || s.includes('ф.и.о') || 
                     s.includes('фио') || s.includes('имя') || s.includes('fullname');
            });
            if (hasRequired) {
              ws = sheet;
              rows = sheetRows;
              headerRowIndex = i;
              break;
            }
          }
          if (headerRowIndex !== -1) break;
        }

        if (headerRowIndex === -1) {
          ws = wb.Sheets[wb.SheetNames[0]];
          rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          headerRowIndex = 0;
        }

        if (rows.length < 2) { alert('Fayl bo\'sh'); return; }

        const headers = rows[headerRowIndex].map(h => String(h).replace(/^\uFEFF/, '').trim());
        processRows(headers, rows.slice(headerRowIndex + 1));
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const rawLines = text.split(/\r?\n/).filter(l => l.trim() !== '');
        if (rawLines.length < 2) { alert('Fayl bo\'sh'); return; }
        const sep = rawLines[0].includes('\t') ? '\t' : ',';
        const parseRow = (line) => {
          const cells = []; let cur = ''; let inQ = false;
          for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
            else if (ch === sep && !inQ) { cells.push(cur); cur = ''; }
            else cur += ch;
          }
          cells.push(cur);
          return cells.map(c => c.trim());
        };

        const parsedRows = rawLines.map(parseRow);
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(parsedRows.length, 25); i++) {
          const r = parsedRows[i];
          if (!r || !Array.isArray(r)) continue;
          const hasRequired = r.some(cell => {
            const s = String(cell).toLowerCase();
            return s.includes('pasaport') || s.includes('soyad') || s.includes('soyadi') || 
                   s.includes('sicil') || s.includes('паспорт') || s.includes('ф.и.о') || 
                   s.includes('фио') || s.includes('имя') || s.includes('fullname');
          });
          if (hasRequired) {
            headerRowIndex = i;
            break;
          }
        }

        const headers = parsedRows[headerRowIndex].map(h => h.replace(/^\uFEFF/, '').trim());
        processRows(headers, parsedRows.slice(headerRowIndex + 1));
      };
      reader.readAsText(file, 'UTF-8');
    }
    event.target.value = '';
  };

  const handleToggleAll = (e) => setSelectedIds(e.target.checked ? paginated.map(w => w.id) : []);
  const handleToggleOne = (id) => setSelectedIds(prev =>
    prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
  );

  return (
    <Box sx={{ p: 0 }}>
      {/* ─── Header ─── */}
      <Box sx={{ mb: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#111827', mb: 0.5 }}>Рабочие</Typography>
          <Typography variant="body2" sx={{ color: '#6b7280' }}>
            Список рабочих — паспорт, патент, бригада и специализация.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignSelf: { xs: 'stretch', sm: 'auto' }, width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
          <Button
            variant="contained" size="small"
            component="label"
            sx={{
              backgroundColor: '#2563eb', color: '#ffffff', textTransform: 'none',
              borderRadius: '6px', px: 1.5, height: '32px', fontWeight: 600, fontSize: '0.78rem', whiteSpace: 'nowrap',
              boxShadow: 'none',
              '&:hover': { backgroundColor: '#1d4ed8', boxShadow: 'none' }
            }}
          >
            Импорт
            <input type="file" hidden onChange={handleImportCSV} />
          </Button>
          <Button
            variant="contained" size="small"
            onClick={() => setExportDialogOpen(true)}
            sx={{
              backgroundColor: '#16a34a', color: '#ffffff', textTransform: 'none',
              borderRadius: '6px', px: 1.5, height: '32px', fontWeight: 600, fontSize: '0.78rem', whiteSpace: 'nowrap',
              boxShadow: 'none',
              '&:hover': { backgroundColor: '#15803d', boxShadow: 'none' }
            }}
          >
            Экспорт
          </Button>
          <Button
            variant="contained" size="small" startIcon={<AddIcon sx={{ fontSize: '16px' }} />}
            onClick={openCreateDrawer}
            sx={{
              backgroundColor: '#2563eb', textTransform: 'none',
              borderRadius: '6px', px: 1.5, height: '32px', fontWeight: 600, fontSize: '0.78rem', whiteSpace: 'nowrap',
              boxShadow: 'none',
              '&:hover': { backgroundColor: '#1d4ed8', boxShadow: 'none' }
            }}
          >
            Рабочий
          </Button>
        </Stack>
      </Box>

      {/* ─── Export Column Picker Dialog ─── */}
      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', pb: 1 }}>
          Qaysi ustunlarni export qilish?
          <IconButton onClick={() => setExportDialogOpen(false)} sx={{ position: 'absolute', right: 12, top: 12, color: '#9ca3af' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ py: 1 }}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
            <Button size="small" sx={{ textTransform: 'none', fontSize: '0.75rem', color: '#7b61ff' }}
              onClick={() => setSelectedColumns(ALL_COLUMNS.map(c => c.key))}>
              Hammasini tanlash
            </Button>
            <Button size="small" sx={{ textTransform: 'none', fontSize: '0.75rem', color: '#ef4444' }}
              onClick={() => setSelectedColumns([])}>
              Bekor qilish
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
            Bekor
          </Button>
          <Button
            variant="contained"
            disabled={selectedColumns.length === 0}
            onClick={doExportCSV}
            sx={{ textTransform: 'none', backgroundColor: '#16a34a', fontWeight: 600,
              boxShadow: 'none', '&:hover': { backgroundColor: '#15803d', boxShadow: 'none' } }}
          >
            Export ({selectedIds.length > 0 ? `${selectedIds.length} ta qator` : 'Hammasi'})
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Stat Cards ─── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2.5, mb: 3 }}>
        {[
          { label: 'Всего рабочих', value: workers.length, icon: <PeopleAltIcon sx={{ fontSize: 28, color: '#7b61ff' }} />, bg: '#f0eeff' },
          { label: 'Активных', value: workers.filter(w => w.isActive !== false).length, icon: <WorkIcon sx={{ fontSize: 28, color: '#10b981' }} />, bg: '#ecfdf5' },
          { label: 'В архиве', value: workers.filter(w => w.isActive === false).length, icon: <AssignmentIndIcon sx={{ fontSize: 28, color: '#f59e0b' }} />, bg: '#fffbeb' },
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
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 0.5 }}>
            {[
              { key: 'workers', label: 'Рабочие' },
              { key: 'archive', label: 'Архив', icon: <CalendarMonthIcon sx={{ fontSize: 16 }} /> },
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
        </Box>
        <Paper elevation={0} sx={{ p: 2.5, border: '1px solid #e5e7eb', borderRadius: '16px', backgroundColor: '#fff' }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#374151', mb: 2 }}>Фильтры поиска (из базы данных)</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' }, gap: 2, alignItems: 'center' }}>
            <TextField
              size="small" label="Ф.И.О. рабочего" placeholder="Поиск по имени" value={searchName}
              onChange={(e) => { setSearchName(e.target.value); setPage(1); }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            />
            <TextField
              size="small" label="Паспорт" placeholder="Поиск по паспорту" value={searchPassport}
              onChange={(e) => { setSearchPassport(e.target.value); setPage(1); }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            />
            <TextField
              size="small" label="QR-код / Киг" placeholder="Поиск по QR-коду" value={searchQrCode}
              onChange={(e) => { setSearchQrCode(e.target.value); setPage(1); }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            />
            <TextField
              size="small" label="Должность / Специализация" placeholder="Например: Электрик" value={searchJob}
              onChange={(e) => { setSearchJob(e.target.value); setPage(1); }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            />
            <TextField
              size="small" label="Бригада" placeholder="Поиск по бригаде" value={searchBrigade}
              onChange={(e) => { setSearchBrigade(e.target.value); setPage(1); }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            />
            <FormControl fullWidth size="small">
              <Select
                value={searchColor}
                onChange={(e) => { setSearchColor(e.target.value); setPage(1); }}
                displayEmpty
                sx={{
                  borderRadius: '10px',
                  backgroundColor: '#fff',
                  '& .MuiSelect-select': { py: '8.5px' }
                }}
              >
                <MenuItem value=""><em>Все патенты</em></MenuItem>
                <MenuItem value="black">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#94a3b8' }} />
                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>Истекшие</Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="red">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ef4444' }} />
                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#dc2626' }}>1-3 дня</Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="yellow">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#eab308' }} />
                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#ca8a04' }}>4-10 дней</Typography>
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Paper>
      </Box>

      {/* ─── Table ─── */}
      <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: '16px', overflow: 'hidden' }}>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 2600, borderCollapse: 'separate', borderSpacing: '0 8px', px: 1 }}>
            <TableHead sx={{ backgroundColor: '#f9fafb' }}>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox size="small"
                    onChange={handleToggleAll}
                    checked={paginated.length > 0 && selectedIds.length === paginated.length}
                    indeterminate={selectedIds.length > 0 && selectedIds.length < paginated.length}
                    sx={{ '&.Mui-checked, &.MuiCheckbox-indeterminate': { color: '#7b61ff' } }}
                  />
                </TableCell>
                {[
                  'Merkez no', 'Pasaport No', 'Şantiye', 'Sicil No', 'Ad Soyad', 'Ф.И.О.',
                  'Görev Adı', 'Гражданство',
                  'Giriş Tarihi', 'Saatlik Ücret', 'Ekip Dagilimi', 'Departman', 'TEL №',
                  'Дата рождения', 'KUN', 'Патент №', 'Дата выдачи патента', 'Patent Bitis Tarihi',
                  'INN', 'Киг', 'Camp VE Oturum yeri', 'Пол', 'Действия'
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
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={24} align="center" sx={{ py: 6, color: '#9ca3af' }}>
                    Данные не найдены
                  </TableCell>
                </TableRow>
              ) : paginated.map((worker) => {
                const rowStyle = getRowStyle(worker.remainingPatentDays);
                const cellBg = rowStyle.bgcolor || '#ffffff';
                const cellColor = rowStyle.color;

                const getCellSx = (position) => ({
                  backgroundColor: cellBg,
                  color: cellColor || '#374151',
                  borderTop: '1px solid #e5e7eb',
                  borderBottom: '1px solid #e5e7eb',
                  py: 0.25,
                  transition: 'background-color 0.2s',
                  ...(position === 'first' ? {
                    borderLeft: '1px solid #e5e7eb',
                    borderTopLeftRadius: '10px',
                    borderBottomLeftRadius: '10px',
                  } : {}),
                  ...(position === 'last' ? {
                    borderRight: '1px solid #e5e7eb',
                    borderTopRightRadius: '10px',
                    borderBottomRightRadius: '10px',
                  } : {}),
                });

                return (
                  <TableRow key={worker.id} hover sx={{ backgroundColor: 'transparent', '&:hover': { backgroundColor: 'transparent' } }}>
                    <TableCell sx={getCellSx('first')} padding="checkbox">
                      <Checkbox size="small" checked={selectedIds.includes(worker.id)} onChange={() => handleToggleOne(worker.id)} sx={{ '&.Mui-checked': { color: '#7b61ff' } }} />
                    </TableCell>
                    <TableCell sx={getCellSx('middle')}><Typography sx={{ fontSize: '0.78rem', color: cellColor || '#374151' }}>{worker.centerNo || '—'}</Typography></TableCell>
                    <TableCell sx={getCellSx('middle')}><Typography sx={{ fontSize: '0.78rem', fontFamily: 'monospace', fontWeight: 600, color: cellColor || '#1a56db' }}>{worker.passport || '—'}</Typography></TableCell>
                    <TableCell sx={getCellSx('middle')}><Typography sx={{ fontSize: '0.78rem', color: cellColor || '#374151' }}>{worker.constructionSite || '—'}</Typography></TableCell>
                    <TableCell sx={getCellSx('middle')}><Typography sx={{ fontSize: '0.78rem', color: cellColor || '#374151', fontFamily: 'monospace' }}>{worker.sicilNo || '—'}</Typography></TableCell>
                    <TableCell sx={getCellSx('middle')}><Typography sx={{ fontWeight: 600, fontSize: '0.82rem', color: cellColor || '#111827' }}>{worker.fullName}</Typography></TableCell>
                    <TableCell sx={getCellSx('middle')}><Typography sx={{ fontSize: '0.78rem', color: cellColor || '#374151' }}>{worker.fullNameRu || '—'}</Typography></TableCell>
                    <TableCell sx={getCellSx('middle')}><Typography sx={{ fontSize: '0.78rem', color: cellColor || '#374151' }}>{worker.position || '—'}</Typography></TableCell>
                    <TableCell sx={getCellSx('middle')}><Typography sx={{ fontSize: '0.78rem', color: cellColor || '#374151' }}>{worker.citizenship || '—'}</Typography></TableCell>
                    <TableCell sx={getCellSx('middle')}><Typography sx={{ fontSize: '0.78rem', color: cellColor || '#374151' }}>{worker.startDate ? fmtDate(worker.startDate) : '—'}</Typography></TableCell>
                    <TableCell sx={getCellSx('middle')}><Typography sx={{ fontSize: '0.78rem', color: cellColor || '#374151' }}>{worker.hourlyRate ?? '—'}</Typography></TableCell>
                    <TableCell sx={getCellSx('middle')}><Typography sx={{ fontSize: '0.78rem', color: cellColor || '#374151' }}>{worker.teamDivision || '—'}</Typography></TableCell>
                    <TableCell sx={getCellSx('middle')}><Typography sx={{ fontSize: '0.78rem', color: cellColor || '#374151' }}>{worker.department || '—'}</Typography></TableCell>
                    <TableCell sx={getCellSx('middle')}><Typography sx={{ fontSize: '0.78rem', color: cellColor || '#374151' }}>{worker.phone || '—'}</Typography></TableCell>
                    <TableCell sx={getCellSx('middle')}><Typography sx={{ fontSize: '0.78rem', color: cellColor || '#374151' }}>{worker.birthDate ? fmtDate(worker.birthDate) : '—'}</Typography></TableCell>
                    <TableCell sx={getCellSx('middle')}>
                      <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: cellColor || (worker.remainingPatentDays !== null ? '#10b981' : '#4b5563') }}>
                        {worker.remainingPatentDays !== null ? `${worker.remainingPatentDays} д.` : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={getCellSx('middle')}><Typography sx={{ fontSize: '0.78rem', color: cellColor || '#374151' }}>{worker.patentNo || '—'}</Typography></TableCell>
                    <TableCell sx={getCellSx('middle')}><Typography sx={{ fontSize: '0.78rem', color: cellColor || '#374151' }}>{worker.patentStartDate ? fmtDate(worker.patentStartDate) : '—'}</Typography></TableCell>
                    <TableCell sx={getCellSx('middle')}><Typography sx={{ fontSize: '0.78rem', color: cellColor || '#374151' }}>{worker.patentEndDate ? fmtDate(worker.patentEndDate) : '—'}</Typography></TableCell>
                    <TableCell sx={getCellSx('middle')}><Typography sx={{ fontSize: '0.78rem', color: cellColor || '#0f766e', fontFamily: 'monospace', fontWeight: 600 }}>{worker.inn || '—'}</Typography></TableCell>
                    <TableCell sx={getCellSx('middle')}><Typography sx={{ fontSize: '0.75rem', fontFamily: 'monospace', color: cellColor || '#374151' }}>{worker.qrCode || '—'}</Typography></TableCell>
                    <TableCell sx={getCellSx('middle')}><Typography sx={{ fontSize: '0.78rem', color: worker.campAddress ? (cellColor || '#dc2626') : (cellColor || '#374151'), fontWeight: worker.campAddress ? 600 : 400 }}>{worker.campAddress || '—'}</Typography></TableCell>
                    <TableCell sx={getCellSx('middle')}>
                      <Typography sx={{ fontSize: '0.78rem', color: cellColor || '#374151' }}>
                        {worker.gender === 'MALE' ? 'Мужской' : worker.gender === 'FEMALE' ? 'Женский' : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={getCellSx('last')}>
                      <Stack direction="row" spacing={0.5}>
                        <IconButton size="small" onClick={() => triggerDelete(worker.id)} sx={{ p: 0.5, color: cellColor || '#9ca3af', '&:hover': { color: '#ef4444' } }}>
                          <DeleteIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                        <IconButton size="small" onClick={() => openEditDrawer(worker)} sx={{ p: 0.5, color: cellColor || '#9ca3af', '&:hover': { color: '#10b981' } }}>
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

      {/* ─── Add/Edit Drawer ─── */}
      <Drawer
        anchor="right" open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{ zIndex: 2000 }}
        slotProps={{ backdrop: { sx: { backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' } } }}
        PaperProps={{ sx: { width: { xs: '100%', sm: '700px' }, display: 'flex', flexDirection: 'column', bgcolor: '#f9fafb' } }}
      >
        {/* Drawer Header */}
        <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#fff', borderBottom: '1px solid #e5e7eb' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: '#f0eeff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BadgeIcon sx={{ color: '#7b61ff', fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>
                {editingId ? 'Редактировать рабочего' : 'Новый рабочий'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#6b7280' }}>
                {editingId ? 'Обновите данные рабочего' : 'Заполните все необходимые данные'}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={() => setDrawerOpen(false)} sx={{ color: '#6b7280' }}><CloseIcon /></IconButton>
        </Box>

        {/* Drawer Body */}
        <Box sx={{ p: 3, overflowY: 'auto', flex: 1 }}>

          {/* Section: Shaxsiy ma'lumotlar */}
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#7b61ff', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <BadgeIcon sx={{ fontSize: 15 }} /> Shaxsiy ma'lumotlar
            </Typography>
            <Paper elevation={0} sx={{ p: 2.5, border: '1px solid #e5e7eb', borderRadius: '12px', bgcolor: '#fff' }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Field label="Ad Soyad / Ф.И.О." required>
                    <TextField fullWidth size="small" placeholder="Иванов Иван Иванович"
                      value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }} />
                  </Field>
                </Box>
                <Field label="Pasaport No" required>
                  <TextField fullWidth size="small" placeholder="AA1234567"
                    value={form.passport} onChange={e => setForm({ ...form, passport: e.target.value })}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', fontFamily: 'monospace' } }} />
                </Field>
                <Field label="Telefon / TEL №">
                  <TextField fullWidth size="small" placeholder="+7 900 000 00 00"
                    value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }} />
                </Field>
                <Field label="Дата рождения">
                  <TextField fullWidth size="small" type="date"
                    value={form.birthDate} onChange={e => setForm({ ...form, birthDate: e.target.value })}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }} />
                </Field>
                <Field label="Гражданство">
                  <FormControl fullWidth size="small">
                    <Select value={form.citizenship} onChange={e => setForm({ ...form, citizenship: e.target.value })}
                      sx={{ borderRadius: '8px' }} MenuProps={{ sx: { zIndex: 2001 } }}>
                      {CITIZENSHIP_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Field>
                <Field label="Пол">
                  <FormControl fullWidth size="small">
                    <Select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}
                      sx={{ borderRadius: '8px' }} MenuProps={{ sx: { zIndex: 2001 } }}>
                      {GENDER_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Field>
              </Box>
            </Paper>
          </Box>

          {/* Section: Ish ma'lumotlari */}
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <WorkIcon sx={{ fontSize: 15 }} /> Ish ma'lumotlari
            </Typography>
            <Paper elevation={0} sx={{ p: 2.5, border: '1px solid #e5e7eb', borderRadius: '12px', bgcolor: '#fff' }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Field label="Görev Adı / Должность">
                  <TextField fullWidth size="small" placeholder="Сварщик"
                    value={form.position} onChange={e => setForm({ ...form, position: e.target.value })}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }} />
                </Field>
                <Field label="Şantiye / Объект">
                  <TextField fullWidth size="small" placeholder="Объект 1"
                    value={form.constructionSite} onChange={e => setForm({ ...form, constructionSite: e.target.value })}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }} />
                </Field>
                <Field label="Departman / Отдел">
                  <TextField fullWidth size="small" placeholder="Строительный"
                    value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }} />
                </Field>
                <Field label="Ekip Dağılımı / Бригада">
                  <TextField fullWidth size="small" placeholder="Бригада А"
                    value={form.teamDivision} onChange={e => setForm({ ...form, teamDivision: e.target.value })}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }} />
                </Field>
                <Field label="Giriş Tarihi / Дата начала">
                  <TextField fullWidth size="small" type="date"
                    value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }} />
                </Field>
                <Field label="Saatlik Ücret / Часовая ставка">
                  <TextField fullWidth size="small" type="number" placeholder="0.00"
                    value={form.hourlyRate} onChange={e => setForm({ ...form, hourlyRate: e.target.value })}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }} />
                </Field>
                <Field label="Sicil No">
                  <TextField fullWidth size="small" placeholder="SN-001"
                    value={form.sicilNo} onChange={e => setForm({ ...form, sicilNo: e.target.value })}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', fontFamily: 'monospace' } }} />
                </Field>
                <Field label="Merkez No">
                  <TextField fullWidth size="small" placeholder="MR-001"
                    value={form.centerNo} onChange={e => setForm({ ...form, centerNo: e.target.value })}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', fontFamily: 'monospace' } }} />
                </Field>
              </Box>
            </Paper>
          </Box>

          {/* Section: Patent / INN */}
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <AssignmentIndIcon sx={{ fontSize: 15 }} /> Patent & Huquqiy ma'lumotlar
            </Typography>
            <Paper elevation={0} sx={{ p: 2.5, border: '1px solid #e5e7eb', borderRadius: '12px', bgcolor: '#fff' }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Field label="Патент №">
                  <TextField fullWidth size="small" placeholder="PAT-123456"
                    value={form.patentNo} onChange={e => setForm({ ...form, patentNo: e.target.value })}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', fontFamily: 'monospace' } }} />
                </Field>
                <Field label="INN">
                  <TextField fullWidth size="small" placeholder="123456789"
                    value={form.inn} onChange={e => setForm({ ...form, inn: e.target.value })}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', fontFamily: 'monospace' } }} />
                </Field>
                <Field label="Дата выдачи патента">
                  <TextField fullWidth size="small" type="date"
                    value={form.patentStartDate} onChange={e => setForm({ ...form, patentStartDate: e.target.value })}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }} />
                </Field>
                <Field label="Киг / QR-код" required>
                  <TextField fullWidth size="small" placeholder="QR-код"
                    value={form.qrCode} onChange={e => setForm({ ...form, qrCode: e.target.value })}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', fontFamily: 'monospace' } }} />
                </Field>
              </Box>
            </Paper>
          </Box>

          {/* Section: Camp & Boshqalar */}
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <PeopleAltIcon sx={{ fontSize: 15 }} /> Qo'shimcha ma'lumotlar
            </Typography>
            <Paper elevation={0} sx={{ p: 2.5, border: '1px solid #e5e7eb', borderRadius: '12px', bgcolor: '#fff' }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Field label="Camp VE Oturum yeri / Адрес лагеря">
                    <TextField fullWidth size="small" placeholder="г. Москва, ул. Строителей 1"
                      value={form.campAddress} onChange={e => setForm({ ...form, campAddress: e.target.value })}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }} />
                  </Field>
                </Box>
                <Field label="Бригада (groupId)">
                  <FormControl fullWidth size="small">
                    <Select value={form.groupId} onChange={e => setForm({ ...form, groupId: e.target.value })}
                      displayEmpty sx={{ borderRadius: '8px' }} MenuProps={{ sx: { zIndex: 2001 } }}>
                      <MenuItem value=""><em>— Выбрать бригаду —</em></MenuItem>
                      {groups.map(g => <MenuItem key={g.id} value={String(g.id)}>{g.name || g.title || `Группа ${g.id}`}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Field>
                <Field label="Специализация">
                  <FormControl fullWidth size="small">
                    <Select value={form.specializationId} onChange={e => setForm({ ...form, specializationId: e.target.value })}
                      displayEmpty sx={{ borderRadius: '8px' }} MenuProps={{ sx: { zIndex: 2001 } }}>
                      <MenuItem value=""><em>— Выбрать специализацию —</em></MenuItem>
                      {specializations.map(s => <MenuItem key={s.id} value={String(s.id)}>{s.name || s.title || `Spec ${s.id}`}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Field>
              </Box>
            </Paper>
          </Box>

        </Box>

        {/* Drawer Footer */}
        <Box sx={{ p: 2.5, display: 'flex', gap: 2, bgcolor: '#fff', borderTop: '1px solid #e5e7eb' }}>
          <Button fullWidth variant="outlined" onClick={() => setDrawerOpen(false)}
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600, borderColor: '#e5e7eb', color: '#374151', py: 1.2 }}>
            Bekor qilish
          </Button>
          <Button fullWidth variant="contained" onClick={handleSubmit} disabled={saving}
            sx={{ backgroundColor: '#7b61ff', borderRadius: '10px', textTransform: 'none', fontWeight: 700, py: 1.2, '&:hover': { backgroundColor: '#6a50e8' } }}>
            {saving ? 'Saqlanmoqda...' : editingId ? 'Yangilash' : 'Saqlash'}
          </Button>
        </Box>
      </Drawer>

      {/* ─── Import Progress ─── */}
      <Dialog open={Boolean(importProgress)} disableEscapeKeyDown
        PaperProps={{ sx: { borderRadius: '16px', width: '360px', p: 3, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' } }}>
        <Box sx={{ textAlign: 'center', py: 1 }}>
          <CircularProgress size={48} sx={{ color: '#7b61ff', mb: 3 }} />
          <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#111827', mb: 1 }}>
            Ma'lumotlar import qilinmoqda
          </Typography>
          <Typography sx={{ fontSize: '0.85rem', color: '#6b7280', mb: 2 }}>
            Iltimos, kutib turing...
          </Typography>
          {importProgress && (
            <Box>
              <LinearProgress variant="determinate" 
                value={(importProgress.current / importProgress.total) * 100}
                sx={{ height: 6, borderRadius: 3, bgcolor: '#f3f4f6', '& .MuiLinearProgress-bar': { bgcolor: '#7b61ff', borderRadius: 3 } }} 
              />
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', mt: 1.5 }}>
                {importProgress.current} / {importProgress.total} ta ishchi yuklandi
              </Typography>
            </Box>
          )}
        </Box>
      </Dialog>

      {/* ─── Delete Confirm ─── */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}
        PaperProps={{ sx: { borderRadius: '20px', width: '420px', maxWidth: '90vw', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)' } }}>
        <DialogContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Box sx={{ width: 64, height: 64, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 }}>
              <DeleteOutlineIcon sx={{ fontSize: 32, color: '#ef4444' }} />
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: '1.2rem', color: '#111827', mb: 1.5 }}>
              Удалить рабочего?
            </Typography>
            <Typography sx={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.5, mb: 4 }}>
              Вы уверены, что хотите удалить этого рабочего? Все связанные данные будут утеряны.
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
