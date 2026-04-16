import { getToken, clearToken } from './authApi';

const BASE = import.meta.env.VITE_API_URL || '';

async function post(path, body) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (res.status === 401) { clearToken(); window.location.reload(); return null; }
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Request failed');
  return data;
}

async function streamPost(path, body, onChunk) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (res.status === 401) { clearToken(); window.location.reload(); return null; }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let   buffer  = '';
  let   result  = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const { event, data } = JSON.parse(line.slice(6));
        onChunk(event, data);
        if (event === 'error') throw new Error(data.message || 'Agent error');
        if (event === 'result') result = data;
      } catch (e) {
        if (e.message?.startsWith('Agent error') || e.message?.startsWith('API ')) throw e;
      }
    }
  }

  return result;
}

export const researchLead      = (input, onChunk)                  => streamPost('/api/research',     { input },                    onChunk);
export const profileLead       = (research, onChunk)               => streamPost('/api/profile',      { research },                 onChunk);
export const writeEmail        = (profile, tone, variant, sender, onChunk) => streamPost('/api/email',        { profile, tone, variant, sender: sender || {} },   onChunk);
export const generateSequence  = (profile, primary_email, onChunk) => streamPost('/api/sequence',     { profile, primary_email },   onChunk);
export const generateABVariants= (profile, tone, sender, onChunk)  => streamPost('/api/ab-variants',  { profile, tone, sender: sender || {} }, onChunk);
export const checkHealth       = ()                                 => fetch('/api/health').then(r => r.json());
export const sendEmail         = (to_email, subject, body, lead_id) => post('/api/send-email', { to_email, subject, body, lead_id });
