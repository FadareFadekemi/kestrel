import { useMemo } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Mail, Users, Zap, ArrowUpRight } from 'lucide-react';
import StatusBadge from '../components/UI/StatusBadge';
import ScoreRing from '../components/UI/ScoreRing';
import EmptyState from '../components/UI/EmptyState';
import useIsMobile from '../hooks/useIsMobile';

// Build activity data from saved leads or use seeded data when none exist
function buildActivityData(leads) {
  const days = 30;
  const base = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    base.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      emails: 0,
      replies: 0,
    });
  }
  // Distribute emails/replies based on leads' dateAdded
  leads.forEach(lead => {
    const idx = base.findIndex(b => b.date === new Date(lead.dateAdded + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    if (idx >= 0) {
      base[idx].emails  += lead.emails?.length || 1;
      base[idx].replies += lead.emails?.filter(e => e.replied).length || 0;
    }
  });
  return base;
}

const TONE_COLORS = { Consultative: '#f59e0b', Casual: '#60a5fa', Formal: '#a78bfa', Aggressive: '#f87171' };

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <p style={{ color: '#71717a', margin: '0 0 4px' }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color, margin: '2px 0' }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
};

export default function Dashboard({ leads, setActivePage }) {
  const isMobile = useIsMobile();
  const stats = useMemo(() => {
    const total    = leads.length;
    const sent     = leads.reduce((a, l) => a + (l.emails?.length || 0), 0);
    const replied  = leads.reduce((a, l) => a + (l.emails?.filter(e => e.replied).length || 0), 0);
    const converted = leads.filter(l => l.status === 'Converted').length;
    return {
      total,
      sent,
      replyRate:   sent > 0 ? ((replied / sent) * 100).toFixed(1) : '0.0',
      convRate:    total > 0 ? ((converted / total) * 100).toFixed(1) : '0.0',
    };
  }, [leads]);

  const activityData = useMemo(() => buildActivityData(leads), [leads]);

  const toneBreakdown = useMemo(() => {
    const counts = {};
    leads.forEach(l => l.emails?.forEach(e => {
      const tone = e.tone || 'Consultative';
      counts[tone] = (counts[tone] || 0) + 1;
    }));
    return Object.entries(counts).map(([tone, count]) => ({ tone, count }));
  }, [leads]);

  const recentLeads = [...leads].sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded)).slice(0, 5);

  return (
    <div style={{ padding: isMobile ? '20px 16px' : '28px 32px', overflowY: 'auto', height: '100%' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fafafa', margin: 0 }}>Dashboard</h1>
        <p style={{ fontSize: 13, color: '#52525b', marginTop: 4 }}>Your outreach overview</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 10 : 16, marginBottom: 28 }}>
        <StatCard icon={<Users size={16} color="#f59e0b" />} label="Total Leads"   value={stats.total}    delta="+12%" />
        <StatCard icon={<Mail  size={16} color="#60a5fa" />} label="Emails Sent"   value={stats.sent}     delta="+8%" />
        <StatCard icon={<TrendingUp size={16} color="#34d399" />} label="Reply Rate"  value={`${stats.replyRate}%`} delta="+2.1%" />
        <StatCard icon={<Zap   size={16} color="#a78bfa" />} label="Conversion"    value={`${stats.convRate}%`} delta="+0.4%" />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: 16, marginBottom: 28 }}>
        {/* Activity chart */}
        <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 12, padding: '20px 20px 16px' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#f4f4f5', margin: '0 0 20px' }}>Outreach Activity, Last 30 Days</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={activityData}>
              <defs>
                <linearGradient id="emailGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}    />
                </linearGradient>
                <linearGradient id="replyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#34d399" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" tick={{ fill: '#52525b', fontSize: 10 }} tickLine={false} axisLine={false}
                interval={Math.floor(activityData.length / 6)} />
              <YAxis tick={{ fill: '#52525b', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="emails"  name="Emails"  stroke="#f59e0b" strokeWidth={2} fill="url(#emailGrad)" />
              <Area type="monotone" dataKey="replies" name="Replies" stroke="#34d399" strokeWidth={2} fill="url(#replyGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Tone breakdown */}
        <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 12, padding: '20px 20px 16px' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#f4f4f5', margin: '0 0 20px' }}>Top Email Tones</p>
          {toneBreakdown.length === 0 ? (
            <p style={{ fontSize: 12, color: '#3f3f46', textAlign: 'center', padding: '40px 0' }}>No emails yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={toneBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#52525b', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="tone" tick={{ fill: '#a1a1aa', fontSize: 11 }} tickLine={false} axisLine={false} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Emails" radius={[0, 4, 4, 0]}>
                  {toneBreakdown.map((entry, i) => (
                    <rect key={i} fill={TONE_COLORS[entry.tone] || '#f59e0b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent leads */}
      <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #27272a' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#f4f4f5', margin: 0 }}>Recent Leads</p>
          <button onClick={() => setActivePage('Leads')} style={{ fontSize: 12, color: '#f59e0b', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            View all <ArrowUpRight size={12} />
          </button>
        </div>
        {recentLeads.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No leads yet"
            description="Research your first company to get started."
            action={{ label: 'Research a Lead', onClick: () => setActivePage('Agent') }}
          />
        ) : isMobile ? (
          <div>
            {recentLeads.map((lead, i) => (
              <div key={lead.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px',
                borderBottom: i < recentLeads.length - 1 ? '1px solid #1c1c1e' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <ScoreRing score={lead.score} size={32} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#f4f4f5', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.company}</p>
                    <StatusBadge status={lead.status} />
                  </div>
                </div>
                <button onClick={() => setActivePage('Leads')} style={{ fontSize: 11, color: '#f59e0b', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                  View →
                </button>
              </div>
            ))}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #27272a' }}>
                {['Company', 'Score', 'Status', 'Date Added', 'Actions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 20px', fontSize: 11, fontWeight: 600, color: '#52525b', letterSpacing: '0.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentLeads.map((lead, i) => (
                <tr key={lead.id} style={{ borderBottom: i < recentLeads.length - 1 ? '1px solid #1c1c1e' : 'none' }}>
                  <td style={{ padding: '12px 20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#f4f4f5' }}>{lead.company}</span>
                      <span style={{ fontSize: 11, color: '#52525b' }}>{lead.industry}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 20px' }}>
                    <ScoreRing score={lead.score} size={36} />
                  </td>
                  <td style={{ padding: '12px 20px' }}><StatusBadge status={lead.status} /></td>
                  <td style={{ padding: '12px 20px', fontSize: 12, color: '#71717a' }}>{lead.dateAdded}</td>
                  <td style={{ padding: '12px 20px' }}>
                    <button onClick={() => setActivePage('Leads')} style={{ fontSize: 11, color: '#f59e0b', background: 'none', border: 'none', cursor: 'pointer' }}>
                      View →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, delta }) {
  return (
    <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 12, padding: '16px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, background: '#27272a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
        <span style={{ fontSize: 11, color: '#34d399', background: 'rgba(52,211,153,0.1)', borderRadius: 4, padding: '2px 6px' }}>{delta}</span>
      </div>
      <p style={{ fontSize: 24, fontWeight: 700, color: '#fafafa', margin: '0 0 2px' }}>{value}</p>
      <p style={{ fontSize: 12, color: '#52525b', margin: 0 }}>{label}</p>
    </div>
  );
}
