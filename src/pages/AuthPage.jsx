import { useState } from 'react';
import { Zap, Mail, Lock, User, Loader, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { login, signup } from '../services/authApi';

export default function AuthPage({ onAuth }) {
  const [mode,     setMode]     = useState('login');   // 'login' | 'signup'
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [name,     setName]     = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const isNewUser = mode === 'signup';
      const user = isNewUser
        ? await signup(email, password, name)
        : await login(email, password);
      onAuth(user, isNewUser);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(''); };

  return (
    <div style={{
      minHeight: '100vh', background: '#09090b',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      {/* Background glow */}
      <div style={{
        position: 'fixed', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 600, height: 400, borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(245,158,11,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 52, height: 52, borderRadius: 14,
            background: 'linear-gradient(135deg, #f59e0b, #b45309)',
            boxShadow: '0 0 28px rgba(245,158,11,0.3)', marginBottom: 14,
          }}>
            <Zap size={24} color="#09090b" fill="#09090b" />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#fafafa', margin: '0 0 4px', letterSpacing: '-0.5px' }}>Kestrel</h1>
          <p style={{ fontSize: 13, color: '#52525b', margin: 0 }}>Sharp intelligence. Precise outreach.</p>
        </div>

        {/* Card */}
        <div style={{
          background: '#18181b', border: '1px solid #27272a',
          borderRadius: 16, padding: 32,
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fafafa', margin: '0 0 6px' }}>
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p style={{ fontSize: 13, color: '#52525b', margin: '0 0 24px' }}>
            {mode === 'login' ? 'Sign in to your Kestrel workspace' : 'Start researching leads in seconds'}
          </p>

          {error && (
            <div style={{
              display: 'flex', gap: 8, alignItems: 'flex-start',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 8, padding: '10px 12px', marginBottom: 16,
            }}>
              <AlertCircle size={14} color="#ef4444" style={{ marginTop: 1, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#fca5a5' }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {mode === 'signup' && (
              <Field
                icon={<User size={14} color="#52525b" />}
                type="text" placeholder="Your name"
                value={name} onChange={e => setName(e.target.value)}
                autoComplete="name"
              />
            )}
            <Field
              icon={<Mail size={14} color="#52525b" />}
              type="email" placeholder="Email address"
              value={email} onChange={e => setEmail(e.target.value)}
              autoComplete="email" required
            />
            <div style={{ position: 'relative' }}>
              <Field
                icon={<Lock size={14} color="#52525b" />}
                type={showPw ? 'text' : 'password'}
                placeholder={mode === 'signup' ? 'Password (min. 8 characters)' : 'Password'}
                value={password} onChange={e => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                paddingRight={40}
              />
              <button
                type="button" onClick={() => setShowPw(s => !s)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#52525b', padding: 4, display: 'flex' }}
              >
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            <button
              type="submit" disabled={loading}
              style={{
                background: loading ? '#27272a' : 'linear-gradient(135deg, #f59e0b, #b45309)',
                color: loading ? '#52525b' : '#09090b',
                border: 'none', borderRadius: 10, padding: '11px',
                fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.15s', marginTop: 4,
              }}
            >
              {loading
                ? <><Loader size={14} className="animate-spin-icon" /> {mode === 'login' ? 'Signing in...' : 'Creating account...'}</>
                : mode === 'login' ? 'Sign in' : 'Create account'
              }
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#52525b', marginTop: 20, marginBottom: 0 }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={switchMode} style={{ color: '#f59e0b', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0 }}>
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>


      </div>
    </div>
  );
}

function Field({ icon, paddingRight, ...props }) {
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
        {icon}
      </div>
      <input
        {...props}
        style={{
          width: '100%', background: '#09090b', border: '1px solid #3f3f46',
          borderRadius: 8, padding: `10px 12px 10px 36px`,
          paddingRight: paddingRight || 12,
          color: '#f4f4f5', fontSize: 13, outline: 'none',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => e.target.style.borderColor = '#f59e0b'}
        onBlur={e  => e.target.style.borderColor = '#3f3f46'}
      />
    </div>
  );
}
