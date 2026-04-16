import { useState, useMemo } from 'react';
import { Search, ChevronRight, Mail, ExternalLink, Copy, Check, X, Send, Loader, ArrowLeft } from 'lucide-react';
import StatusBadge from '../components/UI/StatusBadge';
import ScoreRing from '../components/UI/ScoreRing';
import EmptyState from '../components/UI/EmptyState';
import { sendEmail } from '../services/api';
import useIsMobile from '../hooks/useIsMobile';

const STATUSES = ['All', 'Not Contacted', 'Contacted', 'Replied', 'Converted'];

export default function LeadsPage({ leads, onUpdateLead, setActivePage }) {
  const isMobile = useIsMobile();
  const [search,         setSearch]         = useState('');
  const [statusFilter,   setStatusFilter]   = useState('All');
  const [sortBy,         setSortBy]         = useState('score');
  const [selectedLead,   setSelectedLead]   = useState(null);
  const [copied,         setCopied]         = useState(false);
  const [editEmail,      setEditEmail]      = useState('');
  const [sendingEmailId, setSendingEmailId] = useState(null);
  const [sentEmailId,    setSentEmailId]    = useState(null);

  const filtered = useMemo(() => {
    let arr = [...leads];
    if (search)                     arr = arr.filter(l => l.company.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter !== 'All')     arr = arr.filter(l => l.status === statusFilter);
    if (sortBy === 'score')         arr.sort((a, b) => b.score - a.score);
    if (sortBy === 'date')          arr.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
    if (sortBy === 'company')       arr.sort((a, b) => a.company.localeCompare(b.company));
    return arr;
  }, [leads, search, statusFilter, sortBy]);

  const handleStatusChange = (lead, newStatus) => {
    onUpdateLead({ ...lead, status: newStatus });
    if (selectedLead?.id === lead.id) setSelectedLead({ ...lead, status: newStatus });
  };

  const handleSelectLead = (lead) => {
    setSelectedLead(lead);
    setEditEmail(lead.contactEmail || '');
    setSentEmailId(null);
  };

  const handleEmailBlur = () => {
    if (editEmail !== (selectedLead.contactEmail || '')) {
      const updated = { ...selectedLead, contactEmail: editEmail };
      onUpdateLead(updated);
      setSelectedLead(updated);
    }
  };

  const handleSendFromCRM = async (email) => {
    const to = selectedLead.contactEmail;
    if (!to) return;
    setSendingEmailId(email.id);
    try {
      await sendEmail(to, email.subject, email.body, selectedLead.id);
      setSentEmailId(email.id);
      const updated = { ...selectedLead, status: 'Contacted' };
      onUpdateLead(updated);
      setSelectedLead(updated);
    } catch (err) {
      alert(`Send failed: ${err.message}`);
    } finally {
      setSendingEmailId(null);
    }
  };

  const handleCopyEmail = (email) => {
    navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${email.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // On mobile: show only list pane OR only detail pane
  const showList   = !isMobile || !selectedLead;
  const showDetail = !isMobile || !!selectedLead;

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* List pane */}
      {showList && <div style={{ width: (!isMobile && selectedLead) ? 380 : '100%', borderRight: (!isMobile && selectedLead) ? '1px solid #27272a' : 'none', display: 'flex', flexDirection: 'column', flexShrink: 0, transition: 'width 0.2s' }}>
        {/* Toolbar */}
        <div style={{ padding: isMobile ? '14px 14px 10px' : '20px 20px 12px', borderBottom: '1px solid #27272a', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fafafa', margin: 0 }}>Leads <span style={{ fontSize: 14, fontWeight: 400, color: '#52525b' }}>({filtered.length})</span></h2>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Search */}
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={13} color="#52525b" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search companies..."
                style={{ width: '100%', background: '#27272a', border: '1px solid #3f3f46', borderRadius: 7, padding: '7px 10px 7px 30px', color: '#f4f4f5', fontSize: 12, outline: 'none' }} />
            </div>
            {/* Sort */}
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              style={{ background: '#27272a', border: '1px solid #3f3f46', borderRadius: 7, padding: '7px 10px', color: '#d4d4d8', fontSize: 12, outline: 'none', cursor: 'pointer' }}>
              <option value="score">Sort: Score</option>
              <option value="date">Sort: Date</option>
              <option value="company">Sort: Company</option>
            </select>
          </div>
          {/* Status filters */}
          <div style={{ display: 'flex', gap: 4, marginTop: 10, flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: 2 }}>
            {STATUSES.map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} style={{
                fontSize: 11, padding: '3px 10px', borderRadius: 20,
                background: statusFilter === s ? '#f59e0b' : '#27272a',
                color:      statusFilter === s ? '#09090b'  : '#71717a',
                border: `1px solid ${statusFilter === s ? '#f59e0b' : '#3f3f46'}`,
                cursor: 'pointer', fontWeight: statusFilter === s ? 600 : 400,
              }}>{s}</button>
            ))}
          </div>
        </div>

        {/* Leads list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <EmptyState icon={Search} title="No leads found" description="Try adjusting your search or filters." />
          ) : (
            filtered.map((lead, i) => (
              <div
                key={lead.id}
                onClick={() => handleSelectLead(lead)}
                style={{
                  padding: '14px 20px', borderBottom: '1px solid #1c1c1e', cursor: 'pointer',
                  background: selectedLead?.id === lead.id ? 'rgba(245,158,11,0.05)' : 'transparent',
                  borderLeft: selectedLead?.id === lead.id ? '2px solid #f59e0b' : '2px solid transparent',
                  transition: 'all 0.1s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <ScoreRing score={lead.score} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#f4f4f5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.company}</span>
                      <StatusBadge status={lead.status} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <span style={{ fontSize: 11, color: '#52525b' }}>{lead.industry}</span>
                      <span style={{ fontSize: 11, color: '#3f3f46' }}>·</span>
                      <span style={{ fontSize: 11, color: '#52525b' }}>{lead.dateAdded}</span>
                    </div>
                  </div>
                  <ChevronRight size={14} color="#3f3f46" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>}

      {/* Detail pane */}
      {showDetail && selectedLead && (
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px' : '20px 24px', animation: 'fadeInUp 0.2s ease' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                {isMobile && (
                  <button onClick={() => setSelectedLead(null)} style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', display: 'flex', padding: 0, flexShrink: 0 }}>
                    <ArrowLeft size={18} />
                  </button>
                )}
                <h2 style={{ fontSize: isMobile ? 17 : 20, fontWeight: 700, color: '#fafafa', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedLead.company}</h2>
                {selectedLead.website && (
                  <a href={selectedLead.website.startsWith('http') ? selectedLead.website : `https://${selectedLead.website}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ color: '#52525b', display: 'flex', flexShrink: 0 }}>
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[selectedLead.industry, selectedLead.size, selectedLead.location, selectedLead.fundingStage]
                  .filter(Boolean).filter(v => v !== 'Unknown').map(v => (
                    <span key={v} style={{ fontSize: 11, color: '#71717a', background: '#27272a', border: '1px solid #3f3f46', borderRadius: 5, padding: '2px 8px' }}>{v}</span>
                  ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, marginLeft: 8 }}>
              <select
                value={selectedLead.status}
                onChange={e => handleStatusChange(selectedLead, e.target.value)}
                style={{ background: '#27272a', border: '1px solid #3f3f46', borderRadius: 7, padding: '6px 10px', color: '#d4d4d8', fontSize: 12, outline: 'none', cursor: 'pointer' }}
              >
                {STATUSES.slice(1).map(s => <option key={s}>{s}</option>)}
              </select>
              {!isMobile && (
                <button onClick={() => setSelectedLead(null)} style={{ background: '#27272a', border: '1px solid #3f3f46', borderRadius: 7, padding: '6px 8px', cursor: 'pointer', color: '#71717a', display: 'flex' }}>
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Score row */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Overall',  val: selectedLead.score,           color: '#f59e0b' },
              { label: 'Tech Fit', val: selectedLead.techFit,         color: '#a78bfa' },
              { label: 'Timing',   val: selectedLead.timing,          color: '#34d399' },
              { label: 'Growth',   val: selectedLead.growthIndicators, color: '#60a5fa' },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                <p style={{ fontSize: 20, fontWeight: 700, color, margin: '0 0 2px' }}>{val || 0}</p>
                <p style={{ fontSize: 10, color: '#52525b', margin: 0 }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Contact */}
          <Section title="Contact">
            <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, padding: '10px 14px' }}>
              {selectedLead.contactName && selectedLead.contactName !== 'Unknown' && (
                <>
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#f4f4f5', margin: '0 0 2px' }}>{selectedLead.contactName}</p>
                  <p style={{ fontSize: 12, color: '#71717a', margin: '0 0 10px' }}>{selectedLead.contactTitle}</p>
                </>
              )}
              <label style={{ fontSize: 10, fontWeight: 600, color: '#52525b', letterSpacing: '0.4px', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Email address</label>
              <input
                value={editEmail}
                onChange={e => setEditEmail(e.target.value)}
                onBlur={handleEmailBlur}
                placeholder="contact@company.com"
                style={{ width: '100%', background: '#09090b', border: '1px solid #3f3f46', borderRadius: 6, padding: '7px 10px', color: '#f4f4f5', fontSize: 12, outline: 'none' }}
                onFocus={e => e.target.style.borderColor = '#f59e0b'}
              />
            </div>
          </Section>

          {/* Summary */}
          {selectedLead.summary && (
            <Section title="Research Summary">
              <p style={{ fontSize: 13, color: '#a1a1aa', lineHeight: 1.65, margin: 0 }}>{selectedLead.summary}</p>
            </Section>
          )}

          {/* Pain points */}
          {selectedLead.painPoints?.length > 0 && (
            <Section title="Pain Points">
              {selectedLead.painPoints.map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
                  <span style={{ color: '#ef4444', fontSize: 10, marginTop: 3 }}>•</span>
                  <span style={{ fontSize: 12, color: '#a1a1aa', lineHeight: 1.5 }}>{p}</span>
                </div>
              ))}
            </Section>
          )}

          {/* Tech stack */}
          {selectedLead.techStack?.length > 0 && (
            <Section title="Tech Stack">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {selectedLead.techStack.map(t => (
                  <span key={t} style={{ fontSize: 11, color: '#c4b5fd', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.18)', borderRadius: 5, padding: '2px 8px' }}>{t}</span>
                ))}
              </div>
            </Section>
          )}

          {/* Competitor flag */}
          {selectedLead.usesCompetitor && selectedLead.competitorName && (
            <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 20 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#fca5a5', margin: '0 0 3px' }}>Competitor: {selectedLead.competitorName}</p>
              <p style={{ fontSize: 11, color: '#991b1b', margin: 0 }}>Included as context in the email.</p>
            </div>
          )}

          {/* Email history */}
          {selectedLead.emails?.length > 0 && (
            <Section title="Email History">
              {selectedLead.emails.map((email, i) => (
                <div key={i} style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, padding: '12px 14px', marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#f4f4f5', margin: 0, flex: 1, marginRight: 8 }}>{email.subject}</p>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => handleCopyEmail(email)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#52525b', display: 'flex', padding: 2 }}>
                        {copied ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
                      </button>
                      {selectedLead.contactEmail && (
                        <button
                          onClick={() => handleSendFromCRM(email)}
                          disabled={sendingEmailId === email.id || sentEmailId === email.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 5,
                            border: 'none', cursor: 'pointer',
                            background: sentEmailId === email.id
                              ? 'rgba(52,211,153,0.15)' : 'linear-gradient(135deg,#f59e0b,#b45309)',
                            color: sentEmailId === email.id ? '#34d399' : '#09090b',
                          }}
                        >
                          {sendingEmailId === email.id ? <Loader size={10} className="animate-spin-icon" />
                           : sentEmailId === email.id   ? <><Check size={10} /> Sent</>
                           : <><Send size={10} /> Send</>}
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <EngagementPill label="Opened"  active={email.opened}  color="#60a5fa" />
                    <EngagementPill label="Clicked" active={email.clicked} color="#a78bfa" />
                    <EngagementPill label="Replied" active={email.replied} color="#34d399" />
                  </div>
                  {email.body && (
                    <pre style={{ fontSize: 11, color: '#71717a', margin: '10px 0 0', whiteSpace: 'pre-wrap', lineHeight: 1.6, fontFamily: 'inherit' }}>
                      {email.body.slice(0, 300)}{email.body.length > 300 ? '...' : ''}
                    </pre>
                  )}
                </div>
              ))}
            </Section>
          )}

          {selectedLead.icp_fit && (
            <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 8, padding: '10px 14px' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#f59e0b', margin: '0 0 4px' }}>ICP Analysis</p>
              <p style={{ fontSize: 12, color: '#d97706', margin: 0, lineHeight: 1.5 }}>{selectedLead.icp_fit}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: '#52525b', letterSpacing: '0.5px', textTransform: 'uppercase', margin: '0 0 8px' }}>{title}</p>
      {children}
    </div>
  );
}

function EngagementPill({ label, active, color }) {
  return (
    <span style={{
      fontSize: 10, padding: '2px 8px', borderRadius: 10,
      background: active ? `${color}15` : '#27272a',
      color:      active ? color : '#3f3f46',
      border: `1px solid ${active ? `${color}30` : '#27272a'}`,
    }}>{label}</span>
  );
}
