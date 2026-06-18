import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

/* ─── Animated counter hook ───────────────────────────────────────── */
function useCountUp(target, duration = 900) {
  const [count, setCount] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    const start = performance.now();
    const animate = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      // ease-out quad
      const eased = 1 - (1 - progress) ** 2;
      setCount(Math.round(eased * target));
      if (progress < 1) raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return count;
}

/* ─── Inline styles / CSS ─────────────────────────────────────────── */
const CSS = `
  @keyframes dashFadeIn { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  @keyframes dashSlideRight { from { opacity:0; transform:translateX(-16px); } to { opacity:1; transform:translateX(0); } }
  @keyframes dashPulse { 0%,100%{transform:scale(1);} 50%{transform:scale(1.06);} }
  @keyframes barFill { from { width: 0%; } to { width: var(--bar-w); } }
  @keyframes spin { to { transform:rotate(360deg); } }

  .dash-root { font-family: 'Inter', sans-serif; }
  .dash-greeting { animation: dashFadeIn .6s ease both; }
  .dash-cards { display:flex; flex-wrap:wrap; gap:16px; margin-bottom:24px; }
  .dash-card {
    flex: 1 1 160px;
    min-width: 150px;
    background: #fff;
    border-radius: 20px;
    padding: 22px 20px;
    border: 1.5px solid #f1f5f9;
    box-shadow: 0 2px 12px rgba(0,0,0,.04);
    cursor: default;
    transition: transform .2s, box-shadow .2s, border-color .2s;
    animation: dashFadeIn .55s ease both;
    position: relative;
    overflow: hidden;
  }
  .dash-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 32px rgba(0,0,0,.08);
  }
  .dash-card-glow {
    position: absolute;
    width: 90px; height: 90px;
    border-radius: 50%;
    filter: blur(40px);
    opacity: .25;
    top: -20px; right: -20px;
    pointer-events: none;
  }
  .dash-card-icon {
    width: 48px; height: 48px;
    border-radius: 14px;
    display: flex; align-items: center; justify-content: center;
    font-size: 22px;
    margin-bottom: 14px;
  }
  .dash-card-label {
    font-size: .72rem; font-weight: 600;
    text-transform: uppercase; letter-spacing: .5px;
    color: #94a3b8; margin-bottom: 4px;
  }
  .dash-card-value {
    font-size: 2rem; font-weight: 800;
    color: #0f172a; line-height: 1;
  }
  .dash-card-trend {
    margin-top: 8px;
    font-size: .75rem; font-weight: 600;
    display: flex; align-items: center; gap: 4px;
  }

  /* Bottom two-column layout */
  .dash-bottom { display:flex; gap:20px; flex-wrap:wrap; }
  .dash-panel {
    flex: 1 1 320px;
    background: #fff;
    border-radius: 20px;
    border: 1.5px solid #f1f5f9;
    box-shadow: 0 2px 12px rgba(0,0,0,.04);
    overflow: hidden;
    animation: dashFadeIn .7s ease both;
  }
  .dash-panel-header {
    padding: 18px 20px 14px;
    border-bottom: 1px solid #f1f5f9;
    display: flex; align-items: center; justify-content: space-between;
  }
  .dash-panel-title { font-size: .92rem; font-weight: 700; color: #0f172a; }
  .dash-panel-body { padding: 12px 16px; }

  /* Quick actions */
  .dash-actions { display:flex; flex-wrap:wrap; gap:10px; padding:16px; }
  .dash-action-btn {
    flex: 1 1 120px;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 8px;
    padding: 16px 12px;
    border-radius: 14px;
    border: 1.5px solid #f1f5f9;
    background: #f8fafc;
    cursor: pointer;
    transition: all .2s;
    font-size: .78rem; font-weight: 600; color: #374151;
    font-family: 'Inter', sans-serif;
    text-align: center;
  }
  .dash-action-btn:hover {
    border-color: #7b61ff;
    background: #f5f3ff;
    color: #7b61ff;
    transform: translateY(-2px);
  }
  .dash-action-icon {
    width: 38px; height: 38px;
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px;
  }

  /* Activity list */
  .activity-item {
    display: flex; align-items: flex-start; gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid #f8fafc;
    animation: dashSlideRight .5s ease both;
  }
  .activity-item:last-child { border-bottom: none; }
  .activity-dot {
    width: 8px; height: 8px; border-radius: 50%;
    margin-top: 5px; flex-shrink: 0;
  }
  .activity-text { font-size: .82rem; color: #374151; font-weight: 500; line-height: 1.4; }
  .activity-time { font-size: .72rem; color: #94a3b8; margin-top: 2px; }

  /* Completion bars */
  .bar-row { margin-bottom: 14px; }
  .bar-label-row { display:flex; justify-content:space-between; margin-bottom:6px; }
  .bar-label { font-size: .78rem; font-weight: 600; color: #374151; }
  .bar-pct { font-size: .78rem; font-weight: 700; color: #7b61ff; }
  .bar-track { height: 7px; border-radius: 99px; background: #f1f5f9; overflow:hidden; }
  .bar-fill {
    height: 100%; border-radius: 99px;
    width: var(--bar-w);
    animation: barFill .9s ease both;
  }

  /* Loader */
  .dash-spinner {
    width:24px; height:24px;
    border:3px solid #e5e7eb; border-top-color:#7b61ff;
    border-radius:50%;
    animation: spin .7s linear infinite;
  }

  /* Badge */
  .dash-badge {
    display: inline-flex; align-items:center; justify-content:center;
    height: 22px; padding: 0 9px;
    border-radius: 99px;
    font-size: .68rem; font-weight: 700; letter-spacing: .3px;
  }
`;

/* ─── Helpers ─────────────────────────────────────────────────────── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 6) return { text: 'Доброй ночи', emoji: '🌙' };
  if (h < 12) return { text: 'Доброе утро', emoji: '☀️' };
  if (h < 17) return { text: 'Добрый день', emoji: '👋' };
  return { text: 'Добрый вечер', emoji: '🌇' };
}

function getUserName() {
  try {
    const raw = localStorage.getItem('user');
    if (raw) {
      const u = JSON.parse(raw);
      return u.firstName || u.first_name || u.name || 'Администратор';
    }
  } catch { /* ignore */ }
  return 'Администратор';
}

function fmtNum(n) {
  if (n === undefined || n === null) return '—';
  return Number(n).toLocaleString('ru-RU');
}

/* ─── Stat card ───────────────────────────────────────────────────── */
function StatCard({ icon, label, value, glowColor, iconBg, delay = 0, trend, trendColor, badge }) {
  const animated = useCountUp(Number(value) || 0);
  return (
    <div className="dash-card" style={{ animationDelay: `${delay}ms` }}>
      <div className="dash-card-glow" style={{ background: glowColor }} />
      <div className="dash-card-icon" style={{ background: iconBg }}>
        {icon}
      </div>
      <div className="dash-card-label">{label}</div>
      <div className="dash-card-value">{fmtNum(animated)}</div>
      {trend && (
        <div className="dash-card-trend" style={{ color: trendColor }}>
          <span>{trend}</span>
        </div>
      )}
      {badge && (
        <span className="dash-badge" style={{ background: badge.bg, color: badge.color, marginTop: 8, display: 'inline-flex' }}>
          {badge.text}
        </span>
      )}
    </div>
  );
}

/* ─── Quick action button ─────────────────────────────────────────── */
function ActionBtn({ icon, label, color, bg, onClick }) {
  return (
    <button className="dash-action-btn" onClick={onClick}>
      <div className="dash-action-icon" style={{ background: bg, color }}>
        {icon}
      </div>
      {label}
    </button>
  );
}

/* ─── Main component ──────────────────────────────────────────────── */
export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { text: greeting, emoji } = getGreeting();
  const userName = getUserName();

  const tokenVal = localStorage.getItem('token');
  let userRole = null;
  if (tokenVal) {
    try {
      const payload = JSON.parse(atob(tokenVal.split('.')[1]));
      userRole = payload.role;
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    // Inject CSS
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/v1/dashboard/stats');
        setStats(res.data?.data || res.data);
      } catch (e) {
        console.error('Dashboard stats error:', e);
        // Use zeros so counters still render
        setStats({ groups: 0, courses: 0, students: 0, teachers: 0, rooms: 0, payments: 0 });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* Derived */
  const cards = stats
    ? [
      {
        icon: '👷',
        label: 'Рабочие',
        value: stats.students ?? 0,
        glowColor: '#10b981',
        iconBg: '#f0fdf4',
        trend: '↑ Активные',
        trendColor: '#10b981',
        delay: 0,
      },
      {
        icon: '👨‍✈️',
        label: 'Бригадиры',
        value: stats.teachers ?? 0,
        glowColor: '#f59e0b',
        iconBg: '#fffbeb',
        trend: '↑ В работе',
        trendColor: '#f59e0b',
        delay: 60,
      },
      {
        icon: '👥',
        label: 'Бригады',
        value: stats.groups ?? 0,
        glowColor: '#7b61ff',
        iconBg: '#f5f3ff',
        trend: '→ Активные',
        trendColor: '#7b61ff',
        delay: 120,
      },
      {
        icon: '🛠️',
        label: 'Специализации',
        value: stats.courses ?? 0,
        glowColor: '#0ea5e9',
        iconBg: '#f0f9ff',
        trend: '↑ Новые',
        trendColor: '#0ea5e9',
        delay: 180,
      },
      {
        icon: '🧾',
        label: 'Чеки оплат',
        value: stats.rooms ?? 0,
        glowColor: '#6366f1',
        iconBg: '#eef2ff',
        trend: '→ Зарегистрировано',
        trendColor: '#6366f1',
        delay: 240,
      },
    ]
    : [];

  /* Completion bars (dynamic data from backend) */
  const bars = [
    { label: "Доля активных рабочих", pct: stats?.activeStudentsRate ?? 0, color: 'linear-gradient(90deg,#10b981,#059669)' },
    { label: 'Посещаемость смен', pct: stats?.attendanceRate ?? 0, color: 'linear-gradient(90deg,#7b61ff,#6d28d9)' },
  ];

  /* Recent activity (dynamic data from backend) */
  const getFmtAgo = (dateStr) => {
    if (!dateStr) return '—';
    const diffMs = new Date() - new Date(dateStr);
    const minAgo = Math.max(1, Math.round(diffMs / 60000));
    if (minAgo < 60) return `${minAgo} мин. назад`;
    const hoursAgo = Math.round(minAgo / 60);
    if (hoursAgo < 24) return `${hoursAgo} ч. назад`;
    return `${Math.round(hoursAgo / 24)} дн. назад`;
  };

  const activities = stats?.recentActivity && stats.recentActivity.length > 0
    ? stats.recentActivity.map((act) => ({
        dot: act.dot,
        text: act.text,
        time: getFmtAgo(act.date)
      }))
    : [
        { dot: '#94a3b8', text: 'Последние действия отсутствуют', time: '—' }
      ];

  /* Quick actions */
  const actions = [
    { icon: '➕', label: 'Добавить рабочего', color: '#10b981', bg: '#f0fdf4', path: '/students' },
    { icon: '👥', label: 'Создать бригаду', color: '#7b61ff', bg: '#f5f3ff', path: '/groups' },
    { icon: '👨‍✈️', label: 'Добавить бригадира', color: '#0ea5e9', bg: '#f0f9ff', path: '/users' },
    { icon: '🛠️', label: 'Добавить спец.', color: '#f59e0b', bg: '#fffbeb', path: '/management' },
  ];

  return (
    <div className="dash-root">
      {/* ─── Greeting ─────────────────────────────────────────────── */}
      <div className="dash-greeting" style={{ marginBottom: 28 }}>
        <div style={{ fontSize: '1.55rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>
          {greeting}, {userName}! {emoji}
        </div>
        <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: 4 }}>
          {new Date().toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          &nbsp;·&nbsp; Сегодня система обновлена
        </div>
      </div>

      {/* ─── Stat cards ───────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, color: '#64748b', fontSize: '0.875rem' }}>
          <div className="dash-spinner" /> Загрузка статистики…
        </div>
      ) : (
        <div className="dash-cards">
          {cards.map((c) => <StatCard key={c.label} {...c} />)}
        </div>
      )}

      {/* ─── Bottom panels ─────────────────────────────────────────── */}
      <div className="dash-bottom">

        {/* Quick actions */}
        <div className="dash-panel" style={{ flex: '0 1 320px', animationDelay: '100ms' }}>
          <div className="dash-panel-header">
            <span className="dash-panel-title">⚡ Быстрые действия</span>
          </div>
          <div className="dash-actions">
            {actions.map((a) => (
              <ActionBtn
                key={a.label}
                icon={a.icon}
                label={a.label}
                color={a.color}
                bg={a.bg}
                onClick={() => navigate(a.path)}
              />
            ))}
          </div>
        </div>

        {/* Completion bars */}
        <div className="dash-panel" style={{ flex: '1 1 280px', animationDelay: '160ms' }}>
          <div className="dash-panel-header">
            <span className="dash-panel-title">📊 Общие показатели</span>
            <span
              className="dash-badge"
              style={{ background: '#f0fdf4', color: '#10b981', cursor: 'default' }}
            >
              {new Date().toLocaleString('ru-RU', { month: 'short', year: 'numeric' })}
            </span>
          </div>
          <div className="dash-panel-body">
            {bars.map((b) => (
              <div className="bar-row" key={b.label}>
                <div className="bar-label-row">
                  <span className="bar-label">{b.label}</span>
                  <span className="bar-pct">{b.pct}%</span>
                </div>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{
                      '--bar-w': `${b.pct}%`,
                      background: b.color,
                      animationDelay: '300ms',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        {userRole === 'SUPER_ADMIN' && (
          <div className="dash-panel" style={{ flex: '1 1 280px', animationDelay: '220ms' }}>
            <div className="dash-panel-header">
              <span className="dash-panel-title">🕐 Последние действия</span>
              <span
                className="dash-badge"
                style={{ background: '#f5f3ff', color: '#7b61ff', cursor: 'default' }}
              >
                Сегодня
              </span>
            </div>
            <div className="dash-panel-body">
              {activities.map((a, i) => (
                <div className="activity-item" key={i} style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="activity-dot" style={{ background: a.dot }} />
                  <div>
                    <div className="activity-text">{a.text}</div>
                    <div className="activity-time">{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
