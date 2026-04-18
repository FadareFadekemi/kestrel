import { useState } from 'react';
import { Zap, Target, ArrowRight, ChevronRight } from 'lucide-react';
import useIsMobile from '../hooks/useIsMobile';

const EXPERIENCE_OPTIONS = ['Less than 1 year', '1–3 years', '3–5 years', '5–10 years', '10+ years'];
const LOCATION_OPTIONS   = ['Remote only', 'Hybrid', 'On-site', 'Open to all'];

const JS_PROFILE_KEY = 'kestrel_jobseeker_profile';

export default function JobSeekerSetupPage({ user, onComplete }) {
  const isMobile = useIsMobile();
  const [form, setForm] = useState({
    fullName:      user?.name || '',
    currentRole:   '',
    targetRole:    '',
    location:      '',
    locationPref:  'Open to all',
    skills:        '',
    experience:    '1–3 years',
    linkedIn:      '',
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = () => {
    const profile = {
      ...form,
      skills: form.skills.split(',').map(s => s.trim()).filter(Boolean).slice(0, 20),
      savedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(JS_PROFILE_KEY, JSON.stringify(profile));
    } catch {
      // localStorage may be unavailable (private mode) — proceed anyway
    }
    onComplete();
  };

  const isValid = form.targetRole.trim() && form.experience;

  return (
    <div style={{
      minHeight: '100vh', background: '#09090b',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: isMobile ? '24px 16px' : 32,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'fixed', top: '20%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 600, height: 400, borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(ellipse, rgba(167,139,250,0.06) 0%, transparent 70%)',
      }} />

      <div style={{ width: '100%', maxWidth: 560, position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 52, height: 52, borderRadius: 14,
            background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
            boxShadow: '0 0 28px rgba(167,139,250,0.25)', marginBottom: 16,
          }}>
            <Target size={24} color="#fff" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fafafa', margin: '0 0 6px', letterSpacing: '-0.4px' }}>
            Set up your profile
          </h1>
          <p style={{ fontSize: 13, color: '#52525b', margin: 0 }}>
            Kestrel will use this to target the right companies and write emails as you.
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: '#18181b', border: '1px solid #27272a',
          borderRadius: 16, padding: isMobile ? 20 : 28,
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Name + current role */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
              <Field label="Full Name" placeholder="Your full name"
                value={form.fullName} onChange={v => set('fullName', v)} />
              <Field label="Current Role" placeholder="e.g. Software Engineer"
                value={form.currentRole} onChange={v => set('currentRole', v)} />
            </div>

            {/* Target role */}
            <Field label="Role You're Targeting *" placeholder="e.g. Senior Product Manager"
              value={form.targetRole} onChange={v => set('targetRole', v)} required />

            {/* Experience + location pref */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Years of Experience</label>
                <select
                  value={form.experience}
                  onChange={e => set('experience', e.target.value)}
                  style={selectStyle}
                >
                  {EXPERIENCE_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Work Preference</label>
                <select
                  value={form.locationPref}
                  onChange={e => set('locationPref', e.target.value)}
                  style={selectStyle}
                >
                  {LOCATION_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>

            {/* Location */}
            <Field label="City / Country" placeholder="e.g. Lagos, Nigeria"
              value={form.location} onChange={v => set('location', v)} />

            {/* Skills */}
            <div>
              <label style={labelStyle}>Key Skills <span style={{ color: '#3f3f46', fontWeight: 400, textTransform: 'none', fontSize: 10 }}>(comma-separated)</span></label>
              <input
                value={form.skills}
                onChange={e => set('skills', e.target.value)}
                placeholder="e.g. React, TypeScript, Node.js, AWS"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#a78bfa'}
                onBlur={e  => e.target.style.borderColor = '#27272a'}
              />
            </div>

            {/* LinkedIn */}
            <Field label="LinkedIn URL" placeholder="https://linkedin.com/in/yourname"
              value={form.linkedIn} onChange={v => set('linkedIn', v)}
              type="url" accentColor="#a78bfa" />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, marginTop: 28, flexDirection: isMobile ? 'column' : 'row' }}>
            <button
              onClick={handleSave}
              disabled={!isValid}
              style={{
                flex: 1, padding: '12px 0', borderRadius: 10,
                background: isValid ? 'linear-gradient(135deg, #a78bfa, #7c3aed)' : '#27272a',
                color: isValid ? '#fff' : '#52525b',
                border: 'none', fontSize: 14, fontWeight: 700,
                cursor: isValid ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.15s',
              }}
            >
              Save & Continue <ArrowRight size={15} />
            </button>
            <button
              onClick={onComplete}
              style={{
                padding: '12px 20px', borderRadius: 10,
                background: 'transparent', color: '#52525b',
                border: '1px solid #27272a', fontSize: 13, fontWeight: 500,
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              Skip for now
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#3f3f46', marginTop: 20 }}>
          Your data stays on this device — no profile information is sent to our servers yet.
        </p>
      </div>
    </div>
  );
}

const labelStyle = {
  fontSize: 11, fontWeight: 600, color: '#52525b',
  letterSpacing: '0.5px', textTransform: 'uppercase',
  display: 'block', marginBottom: 6,
};

const inputStyle = {
  width: '100%', background: '#09090b', border: '1px solid #27272a',
  borderRadius: 8, padding: '9px 12px', color: '#f4f4f5',
  fontSize: 13, outline: 'none', transition: 'border-color 0.15s',
  fontFamily: 'inherit',
};

const selectStyle = {
  width: '100%', background: '#09090b', border: '1px solid #27272a',
  borderRadius: 8, padding: '9px 12px', color: '#f4f4f5',
  fontSize: 13, outline: 'none', cursor: 'pointer', fontFamily: 'inherit',
};

function Field({ label, placeholder, value, onChange, required, type = 'text', accentColor = '#f59e0b' }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        style={inputStyle}
        onFocus={e => e.target.style.borderColor = accentColor}
        onBlur={e  => e.target.style.borderColor = '#27272a'}
      />
    </div>
  );
}
