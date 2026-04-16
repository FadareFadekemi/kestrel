import { useState, useCallback } from 'react';
import AgentSidebar from '../components/Agent/AgentSidebar';
import AgentInputForm from '../components/Agent/AgentInputForm';
import ResearchOutput from '../components/Agent/ResearchOutput';
import ProfileOutput from '../components/Agent/ProfileOutput';
import RightPanel from '../components/Agent/RightPanel';
import EmailEditor from '../components/Email/EmailEditor';
import ABVariants from '../components/Email/ABVariants';
import FollowUpSequence from '../components/Email/FollowUpSequence';
import { researchLead, profileLead, writeEmail, generateSequence, generateABVariants, sendEmail } from '../services/api';
import { runTrackerAgent } from '../services/tracker';
import { AlertCircle } from 'lucide-react';
import useIsMobile from '../hooks/useIsMobile';

const TABS = ['Research', 'Profile', 'Email', 'A/B Variants', 'Sequence'];

const IDLE_STATES = { research: 'idle', profiling: 'idle', email: 'idle', tracker: 'idle' };

export default function AgentPage({ onLeadSaved, user, onGoToSettings }) {
  const isMobile = useIsMobile();
  const [agentStates, setAgentStates]   = useState(IDLE_STATES);
  const [agentStatus,  setAgentStatus]  = useState({});  // per-agent status text
  const [streamText,   setStreamText]   = useState({});  // per-agent streaming text
  const [research,     setResearch]     = useState(null);
  const [profile,      setProfile]      = useState(null);
  const [email,        setEmail]        = useState(null);
  const [abVariants,   setAbVariants]   = useState(null);
  const [sequence,     setSequence]     = useState(null);
  const [activeTab,    setActiveTab]    = useState('Research');
  const [isRunning,    setIsRunning]    = useState(false);
  const [error,        setError]        = useState('');
  const [abLoading,    setAbLoading]    = useState(false);
  const [seqLoading,   setSeqLoading]   = useState(false);
  const [retoneLoading, setRetoneLoading] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  const [savedLeadId,  setSavedLeadId]  = useState(null);

  const setState = (agent, state) =>
    setAgentStates(prev => ({ ...prev, [agent]: state }));

  const setStatus = (agent, text) =>
    setAgentStatus(prev => ({ ...prev, [agent]: text }));

  const appendStream = (agent, text) =>
    setStreamText(prev => ({ ...prev, [agent]: (prev[agent] || '') + text }));

  const senderProfile = user ? {
    name:               user.name,
    senderTitle:        user.senderTitle,
    companyName:        user.companyName,
    productDescription: user.productDescription,
    valueProposition:   user.valueProposition,
    website:            user.website,
  } : {};

  const profileIncomplete = !user?.companyName || !user?.productDescription;

  const runPipeline = useCallback(async (input) => {
    setIsRunning(true);
    setError('');
    setAgentStates(IDLE_STATES);
    setStreamText({});
    setResearch(null); setProfile(null); setEmail(null);
    setAbVariants(null); setSequence(null);
    setContactEmail(''); setSavedLeadId(null);
    setActiveTab('Research');

    try {
      // ── Research ──────────────────────────────────────────
      setState('research', 'running');
      const researchData = await researchLead(input, (event, data) => {
        if (event === 'status') { setStatus('research', data.text); setActiveTab('Research'); }
        if (event === 'stream') appendStream('research', data.text);
      });
      setResearch(researchData);
      setContactEmail(researchData.contactEmail || '');
      setState('research', 'done');
      setActiveTab('Research');

      // ── Profiling ─────────────────────────────────────────
      setState('profiling', 'running');
      setActiveTab('Profile');
      const profileData = await profileLead(researchData, (event, data) => {
        if (event === 'status') setStatus('profiling', data.text);
        if (event === 'stream') appendStream('profiling', data.text);
      });
      setProfile(profileData);
      setState('profiling', 'done');

      // ── Email Writer ──────────────────────────────────────
      setState('email', 'running');
      setActiveTab('Email');
      const emailData = await writeEmail(profileData, 'Consultative', 'A', senderProfile, (event, data) => {
        if (event === 'status') setStatus('email', data.text);
        if (event === 'stream') appendStream('email', data.text);
      });
      setEmail(emailData);
      setState('email', 'done');

      // ── Tracker ───────────────────────────────────────────
      setState('tracker', 'running');
      const lead = runTrackerAgent(researchData, profileData, emailData);
      const saved = await onLeadSaved?.(lead);
      if (saved?.id) setSavedLeadId(saved.id);
      setState('tracker', 'done');

    } catch (err) {
      setError(err.message || 'Pipeline failed');
      setAgentStates(prev => {
        const updated = { ...prev };
        for (const k of Object.keys(updated)) {
          if (updated[k] === 'running') updated[k] = 'idle';
        }
        return updated;
      });
    } finally {
      setIsRunning(false);
    }
  }, [onLeadSaved, user]);

  const handleRetone = async (tone) => {
    if (!profile || retoneLoading) return;
    setRetoneLoading(true);
    setStreamText(prev => ({ ...prev, email: '' }));
    try {
      const emailData = await writeEmail(profile, tone, 'A', senderProfile, (event, data) => {
        if (event === 'stream') appendStream('email', data.text);
      });
      setEmail(emailData);
    } finally {
      setRetoneLoading(false);
    }
  };

  const handleGenerateAB = async (tone) => {
    if (!profile || abLoading) return;
    setAbLoading(true);
    setAbVariants(null);
    try {
      const variants = await generateABVariants(profile, tone, senderProfile, () => {});
      setAbVariants(variants);
      setActiveTab('A/B Variants');
    } finally {
      setAbLoading(false);
    }
  };

  const handleSendEmail = async (subject, body) => {
    await sendEmail(contactEmail, subject, body, savedLeadId || undefined);
  };

  const handleGenerateSequence = async () => {
    if (!profile || !email || seqLoading) return;
    setSeqLoading(true);
    setSequence(null);
    try {
      const seq = await generateSequence(profile, email, () => {});
      setSequence(seq);
      setActiveTab('Sequence');
    } finally {
      setSeqLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left sidebar — hidden on mobile */}
      {!isMobile && <AgentSidebar agentStates={agentStates} />}

      {/* Center panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Incomplete profile banner */}
        {profileIncomplete && (
          <div style={{
            margin: '12px 20px 0', display: 'flex', gap: 10, alignItems: 'flex-start',
            background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: 8, padding: '10px 14px',
          }}>
            <AlertCircle size={13} color="#f59e0b" style={{ marginTop: 1, flexShrink: 0 }} />
            <p style={{ fontSize: 12, color: '#a16207', margin: 0, lineHeight: 1.5 }}>
              Your sender profile is incomplete — emails will use generic placeholders.{' '}
              <button
                onClick={() => onGoToSettings?.()}
                style={{ color: '#f59e0b', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 0 }}
              >
                Complete it in Settings →
              </button>
            </p>
          </div>
        )}

        {/* Input + error */}
        <div style={{ padding: isMobile ? '12px 12px 0' : '20px 20px 0', flexShrink: 0 }}>
          <AgentInputForm onSubmit={runPipeline} isRunning={isRunning} />
          {error && (
            <div style={{ marginBottom: 12, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8 }}>
              <p style={{ fontSize: 12, color: '#fca5a5', margin: 0 }}>{error}</p>
            </div>
          )}
        </div>

        {/* Output tabs */}
        <div style={{ borderBottom: '1px solid #27272a', paddingLeft: isMobile ? 8 : 20, flexShrink: 0, display: 'flex', gap: 2, overflowX: 'auto' }}>
          {TABS.map(tab => {
            const hasContent = (
              (tab === 'Research'    && (research || agentStates.research === 'running')) ||
              (tab === 'Profile'     && (profile  || agentStates.profiling === 'running')) ||
              (tab === 'Email'       && (email    || agentStates.email === 'running' || retoneLoading)) ||
              (tab === 'A/B Variants' && (abVariants || abLoading)) ||
              (tab === 'Sequence'    && (sequence  || seqLoading))
            );
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  fontSize: 12, fontWeight: activeTab === tab ? 600 : 400,
                  color: activeTab === tab ? '#f4f4f5' : hasContent ? '#71717a' : '#3f3f46',
                  borderBottom: activeTab === tab ? '2px solid #f59e0b' : '2px solid transparent',
                  background: 'transparent', border: 'none', borderRadius: 0,
                  padding: isMobile ? '10px 10px' : '10px 14px',
                  cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                }}
              >
                {tab}
                {hasContent && activeTab !== tab && (
                  <span style={{ marginLeft: 5, width: 5, height: 5, background: '#f59e0b', borderRadius: '50%', display: 'inline-block', verticalAlign: 'middle' }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {activeTab === 'Research' && (
            <ResearchOutput
              research={research}
              isLoading={agentStates.research === 'running'}
              statusText={agentStatus.research}
            />
          )}
          {activeTab === 'Profile' && (
            <ProfileOutput
              profile={profile}
              isLoading={agentStates.profiling === 'running'}
              statusText={agentStatus.profiling}
              streamText={streamText.profiling}
            />
          )}
          {activeTab === 'Email' && (
            <EmailEditor
              email={email}
              profile={profile}
              isLoading={agentStates.email === 'running' || retoneLoading}
              statusText={agentStatus.email}
              streamText={streamText.email}
              onRetone={handleRetone}
              onGenerateAB={handleGenerateAB}
              contactEmail={contactEmail}
              onSendEmail={handleSendEmail}
            />
          )}
          {activeTab === 'A/B Variants' && (
            <ABVariants
              variants={abVariants}
              isLoading={abLoading}
            />
          )}
          {activeTab === 'Sequence' && (
            <FollowUpSequence
              sequence={sequence}
              isLoading={seqLoading}
              onGenerate={handleGenerateSequence}
            />
          )}
        </div>
      </div>

      {/* Right panel — hidden on mobile */}
      {!isMobile && (
        <div style={{ width: 240, borderLeft: '1px solid #27272a', overflowY: 'auto', flexShrink: 0 }}>
          <RightPanel profile={profile} />
        </div>
      )}
    </div>
  );
}
