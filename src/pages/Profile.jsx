import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
  Box, Typography, Paper, Avatar, Divider, CircularProgress,
  Stack, Card, CardContent, Grid, Chip
} from '@mui/material';
import ContactPhoneIcon from '@mui/icons-material/ContactPhone';
import EmailIcon from '@mui/icons-material/Email';
import HomeIcon from '@mui/icons-material/Home';
import BadgeIcon from '@mui/icons-material/Badge';
import GroupsIcon from '@mui/icons-material/Groups';
import PeopleIcon from '@mui/icons-material/People';

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const profileRes = await api.get('/api/v1/auth/me');
        if (profileRes.data?.success) {
          setProfile(profileRes.data.data);
        } else if (profileRes.data) {
          setProfile(profileRes.data);
        }

        // Fetch groups to show statistics
        const groupsRes = await api.get('/api/v1/teachers/group/students');
        setGroups(Array.isArray(groupsRes.data) ? groupsRes.data : (groupsRes.data?.data || []));

      } catch (e) {
        console.error('Error loading profile:', e);
        if (e.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [navigate]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: '#7b61ff' }} />
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">Не удалось загрузить данные профиля.</Typography>
      </Box>
    );
  }

  const initials = (name = '') => {
    const p = name.trim().split(' ');
    return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : (p[0]?.[0] || '?').toUpperCase();
  };

  const resolvePhoto = (photo) => {
    if (!photo) return undefined;
    if (photo.startsWith('http') || photo.startsWith('/')) return photo;
    const backendUrl = (import.meta.env.VITE_API_URL || '').replace(/\/api\/v1\/?$/, '') || '';
    return `${backendUrl}/file/${photo}`;
  };

  const totalStudents = groups.reduce((acc, g) => acc + (g.studentCount || 0), 0);

  const DAY_RU = {
    Monday: 'Пн', Tuesday: 'Вт', Wednesday: 'Ср',
    Thursday: 'Чт', Friday: 'Пт', Saturday: 'Сб', Sunday: 'Вс'
  };

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto', p: { xs: 2, sm: 4 }, animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* Page Title */}
      <Typography variant="h5" sx={{ fontWeight: 800, color: '#111827', mb: 4 }}>
        Личный профиль
      </Typography>

      {/* Main Grid */}
      <Grid container spacing={4}>
        
        {/* Left Side: Avatar and Card Info */}
        <Grid item xs={12} md={5}>
          <Paper
            elevation={0}
            sx={{
              p: 4,
              borderRadius: '24px',
              border: '1px solid #e5e7eb',
              textAlign: 'center',
              background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 10px 30px rgba(0,0,0,0.02)'
            }}
          >
            {/* Top decorative gradient bar */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '8px',
                background: 'linear-gradient(90deg, #7b61ff 0%, #10b981 100%)'
              }}
            />

            <Avatar
              src={resolvePhoto(profile.photo)}
              sx={{
                width: 110,
                height: 110,
                mx: 'auto',
                mb: 3,
                fontSize: '2.5rem',
                fontWeight: 800,
                bgcolor: '#7b61ff',
                color: '#fff',
                boxShadow: '0 8px 20px rgba(123, 97, 255, 0.25)',
                border: '4px solid #fff'
              }}
            >
              {initials(profile.full_name)}
            </Avatar>

            <Typography variant="h6" sx={{ fontWeight: 800, color: '#111827', mb: 1 }}>
              {profile.full_name}
            </Typography>

            <Chip
              label={
                {
                  PLATFORM_SUPER_ADMIN: 'Супер-админ платформы',
                  SUPER_ADMIN: 'Супер-администратор',
                  ADMIN: 'Администратор',
                  SUPERVISOR: 'Супервайзер',
                  TEACHER: 'Бригадир',
                  STUDENT: 'Рабочий'
                }[profile.role] || profile.role
              }
              color="primary"
              size="small"
              sx={{
                backgroundColor: '#7b61ff15',
                color: '#7b61ff',
                fontWeight: 700,
                fontSize: '0.75rem',
                mb: 3,
                px: 1
              }}
            />

            <Divider sx={{ my: 3 }} />

            {/* Info details */}
            <Stack spacing={2.5} align="left" sx={{ textAlign: 'left', px: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: '#eff6ff', color: '#3b82f6', width: 36, height: 36 }}>
                  <ContactPhoneIcon sx={{ fontSize: 18 }} />
                </Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Телефон</Typography>
                  <Typography sx={{ fontWeight: 600, color: '#374151', fontSize: '0.9rem' }}>{profile.phone || '—'}</Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: '#ecfdf5', color: '#10b981', width: 36, height: 36 }}>
                  <EmailIcon sx={{ fontSize: 18 }} />
                </Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>E-mail</Typography>
                  <Typography sx={{ fontWeight: 600, color: '#374151', fontSize: '0.9rem' }}>{profile.email || '—'}</Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: '#fff7ed', color: '#f59e0b', width: 36, height: 36 }}>
                  <HomeIcon sx={{ fontSize: 18 }} />
                </Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Адрес</Typography>
                  <Typography sx={{ fontWeight: 600, color: '#374151', fontSize: '0.9rem' }}>{profile.address || '—'}</Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: '#f5f3ff', color: '#8b5cf6', width: 36, height: 36 }}>
                  <BadgeIcon sx={{ fontSize: 18 }} />
                </Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Статус</Typography>
                  <Chip
                    label={profile.status === 'active' ? "Активен" : profile.status}
                    size="small"
                    sx={{
                      backgroundColor: profile.status === 'active' ? '#ecfdf5' : '#f3f4f6',
                      color: profile.status === 'active' ? '#10b981' : '#9ca3af',
                      fontWeight: 700,
                      height: 20,
                      fontSize: '0.7rem'
                    }}
                  />
                </Box>
              </Box>
            </Stack>
          </Paper>
        </Grid>

        {/* Right Side: Stats & Assigned Groups */}
        <Grid item xs={12} md={7}>
          <Stack spacing={3}>
            
            {/* Quick Stats Grid */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
              
              {/* Groups Count Card */}
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  border: '1px solid #e5e7eb',
                  borderRadius: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <Box>
                  <Typography variant="caption" color="text.secondary">Мои бригады</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#111827', mt: 0.5 }}>{groups.length}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#f0eeff', color: '#7b61ff', width: 48, height: 48 }}>
                  <GroupsIcon sx={{ fontSize: 24 }} />
                </Avatar>
              </Paper>

              {/* Students Count Card */}
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  border: '1px solid #e5e7eb',
                  borderRadius: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <Box>
                  <Typography variant="caption" color="text.secondary">Всего рабочих</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#111827', mt: 0.5 }}>{totalStudents}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#ecfdf5', color: '#10b981', width: 48, height: 48 }}>
                  <PeopleIcon sx={{ fontSize: 24 }} />
                </Avatar>
              </Paper>
            </Box>

            {/* Assigned Groups Card List */}
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#111827', mt: 2 }}>
              Список бригад
            </Typography>

            {groups.length === 0 ? (
              <Paper elevation={0} sx={{ p: 4, border: '1px solid #e5e7eb', borderRadius: '20px', textAlign: 'center' }}>
                <Typography color="text.secondary">За вами не закреплена ни одна бригада.</Typography>
              </Paper>
            ) : (
              <Stack spacing={2}>
                {groups.map(group => (
                  <Card
                    key={group.id}
                    elevation={0}
                    onClick={() => navigate(`/group/${group.id}`)}
                    sx={{
                      cursor: 'pointer',
                      border: '1px solid #e5e7eb',
                      borderRadius: '16px',
                      transition: 'all 0.2s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 12px 24px rgba(0,0,0,0.04)',
                        borderColor: '#7b61ff'
                      }
                    }}
                  >
                    <CardContent sx={{ p: '20px !important' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#7b61ff' }}>
                          {group.name}
                        </Typography>
                        <Chip
                          label={`${group.studentCount || 0} рабочих`}
                          size="small"
                          sx={{ backgroundColor: '#f3f4f6', fontWeight: 600, fontSize: '0.75rem' }}
                        />
                      </Box>
                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Дата начала</Typography>
                          <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#4b5563' }}>
                            {group.start_date ? new Date(group.start_date).toLocaleDateString('ru-RU') : '—'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Время смены и Дни</Typography>
                          <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#4b5563' }}>
                            {group.start_time || '—'} ({(group.week_day || []).map(d => DAY_RU[d] || d).join(', ')})
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}

          </Stack>
        </Grid>

      </Grid>
    </Box>
  );
}
