import React, { useState, useEffect } from 'react';
import {
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
} from 'firebase/auth';
import { auth } from './firebase';
import { SHEETS_API_URL, OTP_API_URL, RADIUS_MIN_KM, RADIUS_MAX_KM, RADIUS_DEFAULT_KM } from './imoveis-config';

// ─── Fórmula de Haversine — distância real em km ────────────
function distKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const SCREENS = { LANDING: 'landing', AUTH: 'auth', VERIFY: 'verify', DASHBOARD: 'dashboard' };

// ── Cores dos bairros/categorias ─────────────────────────────
const CATEGORY_COLORS = {
  'Turu, Eldorado':                '#f59e0b',
  'Calhau/P. Areia/Peninsula':     '#3b82f6',
  'Renascença':                    '#8b5cf6',
  'Cohama, Vinhais':               '#10b981',
  "Olho D'agua, Caolho, Cohajap":  '#ef4444',
  'Araçagy':                       '#f97316',
  'Calhau 2':                      '#06b6d4',
};
const categoryColor = (cat) => CATEGORY_COLORS[cat] || '#6b7280';

// ─── ESTILOS ─────────────────────────────────────────────────
const S = {
  root: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0d1b2a 0%, #1b2838 60%, #0f3460 100%)',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  },
  card: {
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(24px)',
    borderRadius: '28px',
    padding: '40px 36px',
    width: '100%',
    maxWidth: '500px',
    border: '1px solid rgba(255,255,255,0.12)',
    boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
  },
  cardWide: {
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(24px)',
    borderRadius: '28px',
    padding: '32px',
    width: '100%',
    maxWidth: '860px',
    border: '1px solid rgba(255,255,255,0.12)',
    boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
  },
  logo:     { fontSize: '44px', textAlign: 'center', marginBottom: '8px' },
  title: {
    fontSize: '26px', fontWeight: '700', textAlign: 'center', marginBottom: '8px',
    background: 'linear-gradient(90deg,#e0f0ff,#a8d8ff)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  subtitle: { fontSize: '14px', color: 'rgba(255,255,255,0.55)', textAlign: 'center', marginBottom: '32px' },
  btnGoogle: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
    width: '100%', padding: '14px', borderRadius: '14px',
    border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)',
    color: '#fff', fontSize: '15px', fontWeight: '600', cursor: 'pointer', marginBottom: '12px',
  },
  btnApple: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
    width: '100%', padding: '14px', borderRadius: '14px',
    border: 'none', background: '#fff', color: '#000',
    fontSize: '15px', fontWeight: '600', cursor: 'pointer', marginBottom: '24px',
  },
  btnPrimary: {
    width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
    background: 'linear-gradient(135deg,#25d366,#128c7e)',
    color: '#fff', fontSize: '15px', fontWeight: '700', cursor: 'pointer', marginTop: '8px',
  },
  btnView: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
    width: '100%', padding: '16px', borderRadius: '14px', border: 'none',
    background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
    color: '#fff', fontSize: '16px', fontWeight: '700', cursor: 'pointer',
    textDecoration: 'none', marginBottom: '12px',
  },
  btnWhatsApp: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
    width: '100%', padding: '16px', borderRadius: '14px', border: 'none',
    background: 'linear-gradient(135deg,#25d366,#128c7e)',
    color: '#fff', fontSize: '16px', fontWeight: '700', cursor: 'pointer',
  },
  input: {
    width: '100%', padding: '14px 16px', borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)',
    color: '#fff', fontSize: '15px', outline: 'none', marginBottom: '12px', boxSizing: 'border-box',
  },
  inputOtp: {
    width: '100%', padding: '18px', borderRadius: '12px',
    border: '2px solid rgba(37,211,102,0.4)', background: 'rgba(37,211,102,0.08)',
    color: '#fff', fontSize: '28px', fontWeight: '700', textAlign: 'center',
    letterSpacing: '10px', outline: 'none', marginBottom: '12px', boxSizing: 'border-box',
  },
  label:  { fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '6px', display: 'block' },
  dividerLine: { flex: 1, height: '1px', background: 'rgba(255,255,255,0.15)' },
  propertyGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: '16px', marginTop: '20px' },
  propertyCard: {
    background: 'rgba(255,255,255,0.07)', borderRadius: '18px', overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'all 0.2s',
  },
  propertyCardSel: {
    background: 'rgba(59,130,246,0.12)', borderRadius: '18px', overflow: 'hidden',
    border: '2px solid rgba(59,130,246,0.6)', cursor: 'pointer', transition: 'all 0.2s',
  },
  propertyThumb: { width: '100%', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px' },
  propertyBody: { padding: '14px' },
  propertyName: { fontSize: '14px', fontWeight: '700', marginBottom: '4px' },
  propertyAddr: { fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', lineHeight: '1.4' },
  detailPanel: {
    marginTop: '24px', background: 'rgba(255,255,255,0.06)',
    borderRadius: '20px', padding: '28px', border: '1px solid rgba(59,130,246,0.3)',
  },
  sliderWrap: { marginBottom: '24px' },
  countBadge: {
    display: 'inline-block', background: 'linear-gradient(135deg,#25d366,#128c7e)',
    borderRadius: '20px', padding: '6px 16px', fontSize: '13px', fontWeight: '700', marginBottom: '16px',
  },
  locationBox: {
    display: 'flex', alignItems: 'center', gap: '10px',
    background: 'rgba(255,255,255,0.06)', borderRadius: '12px',
    padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: 'rgba(255,255,255,0.7)',
  },
  errorBox: {
    background: 'rgba(255,100,100,0.1)', border: '1px solid rgba(255,100,100,0.3)',
    borderRadius: '12px', padding: '16px', marginBottom: '16px',
    fontSize: '13px', color: '#ff9999', textAlign: 'center',
  },
  step: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flex: 1 },
  stepDot: {
    width: '32px', height: '32px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700',
  },
  stepLine: { height: '2px', flex: 1, marginTop: '-24px' },
};

// ── Barra de progresso ────────────────────────────────────────
function StepBar({ current }) {
  const steps = [{ icon: '👤', label: 'Login' }, { icon: '📱', label: 'Verificar' }, { icon: '🏠', label: 'Buscar' }];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '32px' }}>
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          <div style={S.step}>
            <div style={{ ...S.stepDot, background: i <= current ? 'linear-gradient(135deg,#25d366,#128c7e)' : 'rgba(255,255,255,0.1)' }}>
              {i < current ? '✓' : s.icon}
            </div>
            <span style={{ fontSize: '11px', color: i <= current ? '#25d366' : 'rgba(255,255,255,0.4)' }}>{s.label}</span>
          </div>
          {i < 2 && <div style={{ ...S.stepLine, background: i < current ? 'linear-gradient(90deg,#25d366,#128c7e)' : 'rgba(255,255,255,0.15)' }} />}
        </React.Fragment>
      ))}
    </div>
  );
}

function Spinner({ text }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '4px solid rgba(255,255,255,0.1)', borderTop: '4px solid #25d366', animation: 'spin 0.9s linear infinite', margin: '0 auto 16px' }} />
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>{text}</p>
    </div>
  );
}

// ── Thumbnail colorido por categoria ─────────────────────────
function PropertyThumb({ category }) {
  const color = categoryColor(category);
  return (
    <div style={{ ...S.propertyThumb, background: `linear-gradient(135deg, ${color}22, ${color}44)` }}>
      <span style={{ fontSize: '32px' }}>🏢</span>
      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '0 10px' }}>{category}</span>
    </div>
  );
}

// ─── TELA: LANDING ───────────────────────────────────────────
function LandingScreen({ onContinue }) {
  return (
    <div style={S.card}>
      <div style={S.logo}>🏘️</div>
      <h1 style={S.title}>Metro Imóveis</h1>
      <p style={S.subtitle}>Encontre o imóvel ideal perto de você em São Luís</p>
      <div style={{ background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)', borderRadius: '16px', padding: '20px', textAlign: 'center', marginBottom: '28px' }}>
        <div style={{ fontSize: '48px', marginBottom: '8px' }}>📱</div>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
          QR Code lido com sucesso!<br />
          <span style={{ color: '#25d366', fontWeight: '600' }}>Vamos começar sua busca</span>
        </p>
      </div>
      {['🔍 Condomínios até 3km de você', '📍 Usando sua localização GPS', '💬 Contato direto pelo WhatsApp'].map((f, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'rgba(255,255,255,0.75)', marginBottom: '10px' }}>{f}</div>
      ))}
      <button style={{ ...S.btnPrimary, marginTop: '20px' }} onClick={onContinue}>Começar agora →</button>
    </div>
  );
}

// ─── TELA: AUTH (Google + Apple ID via Firebase) ─────────────
function AuthScreen({ onLogin }) {
  const [loading, setLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState('');
  const [error, setError] = useState('');

  const errorMsg = (code) => {
    const map = {
      'auth/popup-closed-by-user':    'Login cancelado. Tente novamente.',
      'auth/popup-blocked':           'Pop-up bloqueado pelo navegador. Permita pop-ups para este site.',
      'auth/network-request-failed':  'Sem conexão. Verifique sua internet.',
      'auth/cancelled-popup-request': 'Login cancelado.',
      'auth/account-exists-with-different-credential': 'Este e-mail já está cadastrado com outro método de login.',
    };
    return map[code] || 'Ocorreu um erro. Tente novamente.';
  };

  const handleGoogle = async () => {
    setLoadingProvider('google'); setLoading(true); setError('');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(auth, provider);
      onLogin({
        name:  cred.user.displayName || cred.user.email.split('@')[0],
        email: cred.user.email,
        photo: cred.user.photoURL,
      });
    } catch (e) {
      setError(errorMsg(e.code)); setLoading(false);
    }
  };

  const handleApple = async () => {
    setLoadingProvider('apple'); setLoading(true); setError('');
    try {
      const provider = new OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');
      const cred = await signInWithPopup(auth, provider);
      const name = cred.user.displayName || cred.user.email?.split('@')[0] || 'Usuário Apple';
      onLogin({
        name,
        email: cred.user.email,
        photo: cred.user.photoURL,
      });
    } catch (e) {
      setError(errorMsg(e.code)); setLoading(false);
    }
  };

  return (
    <div style={S.card}>
      <StepBar current={0} />
      <div style={S.logo}>🔐</div>
      <h1 style={S.title}>Identificação</h1>
      <p style={S.subtitle}>Escolha como deseja entrar para buscar imóveis</p>

      {loading ? (
        <Spinner text={`Autenticando com ${loadingProvider === 'google' ? 'Google' : 'Apple'}...`} />
      ) : (
        <>
          {/* Google */}
          <button style={S.btnGoogle} onClick={handleGoogle}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar com Google
          </button>

          {/* Apple */}
          <button style={S.btnApple} onClick={handleApple}
            onMouseOver={e => e.currentTarget.style.background = '#e8e8e8'}
            onMouseOut={e => e.currentTarget.style.background = '#fff'}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="black">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            Continuar com Apple ID
          </button>

          {error && (
            <div style={{ background: 'rgba(255,100,100,0.1)', border: '1px solid rgba(255,100,100,0.3)', borderRadius: '10px', padding: '12px', fontSize: '13px', color: '#ff9999', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '20px', color: 'rgba(255,255,255,0.2)', fontSize: '11px' }}>
            <div style={S.dividerLine} />🔒 Seus dados são protegidos pelo Firebase<div style={S.dividerLine} />
          </div>
        </>
      )}
    </div>
  );
}

// ─── TELA: VERIFICAÇÃO SMS/WhatsApp via Twilio ───────────────
function VerifyScreen({ onVerified }) {
  const [step, setStep]   = useState('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode]   = useState('');
  const [error, setError] = useState('');

  // Formata exibição: (98) 99999-9999
  const fmt = v => {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`;
    return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  };

  // Converte (98) 99999-9999 → +5598999999999
  const toE164 = v => '+55' + v.replace(/\D/g, '');

  const send = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) { setError('Digite um número válido com DDD.'); return; }
    setError(''); setStep('sending');
    try {
      const res  = await fetch(`${OTP_API_URL}/send-otp`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ phone: toE164(phone) }),
      });
      const data = await res.json();
      if (data.success) { setStep('code'); return; }
      throw new Error(data.error || 'Erro ao enviar código.');
    } catch (e) {
      setError(e.message); setStep('phone');
    }
  };

  const verify = async () => {
    if (code.length < 6) { setError('O código deve ter 6 dígitos.'); return; }
    setError(''); setStep('sending');
    try {
      const res  = await fetch(`${OTP_API_URL}/verify-otp`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ phone: toE164(phone), code }),
      });
      const data = await res.json();
      if (data.valid) { onVerified(phone); return; }
      throw new Error('Código incorreto. Tente novamente.');
    } catch (e) {
      setError(e.message); setStep('code');
    }
  };

  return (
    <div style={S.card}>
      <StepBar current={1} />
      <div style={S.logo}>📱</div>
      <h1 style={S.title}>Verificar número</h1>
      <p style={S.subtitle}>Confirme seu celular para continuar</p>
      {step === 'sending' && <Spinner text={step === 'sending' && !code ? 'Enviando código SMS...' : 'Verificando código...'} />}
      {step === 'phone' && (
        <>
          <label style={S.label}>Seu número com DDD</label>
          <input style={S.input} type="tel" placeholder="(98) 99999-9999"
            value={phone} onChange={e => { setPhone(fmt(e.target.value)); setError(''); }} />
          {error && <p style={{ color: '#ff6b6b', fontSize: '13px', lineHeight: '1.5' }}>{error}</p>}
          <button style={S.btnPrimary} onClick={send}>Enviar código SMS 📲</button>
        </>
      )}
      {step === 'code' && (
        <>
          <div style={{ background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)', borderRadius: '12px', padding: '14px', marginBottom: '20px', fontSize: '13px', textAlign: 'center' }}>
            ✅ Código enviado para <strong>{phone}</strong>
          </div>
          <label style={S.label}>Código de 6 dígitos</label>
          <input style={S.inputOtp} type="number" placeholder="000000"
            value={code} onChange={e => { setCode(e.target.value.slice(0, 6)); setError(''); }} />
          {error && <p style={{ color: '#ff6b6b', fontSize: '13px' }}>{error}</p>}
          <button style={S.btnPrimary} onClick={verify}>Confirmar código ✓</button>
          <button onClick={() => { setStep('phone'); setCode(''); setError(''); }}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '13px', cursor: 'pointer', marginTop: '12px', width: '100%' }}>
            ← Alterar número
          </button>
        </>
      )}
    </div>
  );
}

// ─── TELA: DASHBOARD ─────────────────────────────────────────
function DashboardScreen({ user }) {
  const [radius, setRadius]             = useState(RADIUS_DEFAULT_KM);
  const [location, setLocation]         = useState(null);
  const [locLoading, setLocLoading]     = useState(true);
  const [allProps, setAllProps]         = useState([]);
  const [propsLoading, setPropsLoading] = useState(true);
  const [propsError, setPropsError]     = useState('');
  const [selected, setSelected]         = useState(null);
  const [search, setSearch]             = useState('');

  // Geolocalização
  useEffect(() => {
    navigator.geolocation
      ? navigator.geolocation.getCurrentPosition(
          pos => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocLoading(false); },
          ()  => { setLocation({ lat: -2.5297, lng: -44.3028, mock: true }); setLocLoading(false); },
          { timeout: 8000 }
        )
      : (setLocation({ lat: -2.5297, lng: -44.3028, mock: true }), setLocLoading(false));
  }, []);

  // Busca imóveis após obter localização
  useEffect(() => {
    if (!location) return;
    setPropsLoading(true);
    setPropsError('');
    fetch(SHEETS_API_URL)
      .then(r => { if (!r.ok) throw new Error('Erro HTTP ' + r.status); return r.json(); })
      .then(data => {
        if (data.error) throw new Error(data.error);
        const list = (data.properties || []).map(p => ({
          ...p,
          distanceKm: parseFloat(distKm(location.lat, location.lng, p.lat, p.lng).toFixed(2)),
        })).sort((a, b) => a.distanceKm - b.distanceKm);
        setAllProps(list);
      })
      .catch(e => setPropsError(e.message))
      .finally(() => setPropsLoading(false));
  }, [location]);

  const filtered = allProps
    .filter(p => p.distanceKm <= radius)
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.bairro.toLowerCase().includes(search.toLowerCase()));

  const openWhatsApp = (prop) => {
    const num = (prop.whatsapp || prop.phone).replace(/\D/g, '');
    if (!num) return;
    const msg = encodeURIComponent(`Olá! Vi o condomínio *${prop.name}* no site da Metro Imóveis e gostaria de mais informações.`);
    window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
  };

  return (
    <div style={S.cardWide}>
      <StepBar current={2} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: '700' }}>🏘️ Condomínios em São Luís</div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>Olá, {user?.name || 'usuário'} 👋</div>
        </div>
        <div style={{ background: 'rgba(37,211,102,0.15)', border: '1px solid rgba(37,211,102,0.3)', borderRadius: '12px', padding: '8px 14px', fontSize: '13px', color: '#25d366', fontWeight: '600' }}>✓ Verificado</div>
      </div>

      {locLoading ? <Spinner text="Obtendo sua localização..." /> : (
        <>
          {/* Localização */}
          <div style={S.locationBox}>
            <span style={{ fontSize: '20px' }}>📍</span>
            {location?.mock
              ? <span>Localização aproximada: São Luís, MA (modo demo)</span>
              : <span>Localização GPS obtida com sucesso</span>
            }
          </div>

          {/* Slider de raio */}
          <div style={S.sliderWrap}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px' }}>
              <span style={{ fontWeight: '600' }}>Raio de busca</span>
              <span style={{ background: 'linear-gradient(135deg,#25d366,#128c7e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: '800', fontSize: '16px' }}>
                {radius.toFixed(1)} km
              </span>
            </div>
            <input type="range" style={{ width: '100%', accentColor: '#25d366', cursor: 'pointer' }}
              min={RADIUS_MIN_KM} max={RADIUS_MAX_KM} step="0.1" value={radius}
              onChange={e => { setRadius(parseFloat(e.target.value)); setSelected(null); }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '4px' }}>
              <span>{RADIUS_MIN_KM} km</span><span>{RADIUS_MAX_KM} km</span>
            </div>
          </div>

          {/* Busca por nome */}
          <input style={{ ...S.input, marginBottom: '16px' }} placeholder="🔍  Buscar por nome ou bairro..."
            value={search} onChange={e => { setSearch(e.target.value); setSelected(null); }} />

          {propsLoading ? <Spinner text="Buscando condomínios disponíveis..." /> : propsError ? (
            <div style={S.errorBox}>
              ⚠️ Não foi possível carregar os dados.<br />
              <small style={{ opacity: 0.7 }}>{propsError}</small><br />
              <small>Verifique a URL do Apps Script em <code>imoveis-config.js</code></small>
            </div>
          ) : (
            <>
              <div style={S.countBadge}>
                🏢 {filtered.length} condomínio{filtered.length !== 1 ? 's' : ''} em {radius.toFixed(1)}km
                {allProps.length > filtered.length && <span style={{ opacity: 0.7, fontWeight: '400' }}> · {allProps.length} total</span>}
              </div>

              {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.4)' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
                  <p>{search ? 'Nenhum resultado para essa busca.' : 'Nenhum condomínio nesse raio. Aumente o alcance.'}</p>
                </div>
              ) : (
                <div style={S.propertyGrid}>
                  {filtered.map(prop => {
                    const color = categoryColor(prop.category);
                    const isSel = selected?.id === prop.id;
                    return (
                      <div key={prop.id}
                        style={isSel ? S.propertyCardSel : S.propertyCard}
                        onClick={() => setSelected(isSel ? null : prop)}
                        onMouseOver={e => { if (!isSel) e.currentTarget.style.transform = 'translateY(-3px)'; }}
                        onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                      >
                        <PropertyThumb category={prop.category} />
                        <div style={S.propertyBody}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                            <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', background: color + '33', color, border: `1px solid ${color}66` }}>
                              {prop.category}
                            </span>
                            <span style={{ fontSize: '11px', fontWeight: '600', color: '#25d366' }}>📍 {prop.distanceKm}km</span>
                          </div>
                          <div style={S.propertyName}>{prop.name}</div>
                          <div style={S.propertyAddr}>{prop.address}</div>
                          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginTop: '4px' }}>
                            {isSel ? '▲ Fechar detalhes' : 'Toque para ver opções →'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Painel de ações */}
              {selected && (
                <div style={S.detailPanel}>
                  {/* Info do imóvel selecionado */}
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '24px' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '14px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${categoryColor(selected.category)}22`, fontSize: '28px' }}>
                      🏢
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>{selected.name}</div>
                      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>📍 {selected.address}</div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: categoryColor(selected.category) + '33', color: categoryColor(selected.category) }}>
                          {selected.category}
                        </span>
                        <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: 'rgba(37,211,102,0.15)', color: '#25d366' }}>
                          📍 {selected.distanceKm}km de você
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Botão: Ver no site */}
                  {selected.url ? (
                    <a href={selected.url} target="_blank" rel="noopener noreferrer" style={S.btnView}
                      onMouseOver={e => e.currentTarget.style.opacity = '0.85'}
                      onMouseOut={e => e.currentTarget.style.opacity = '1'}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                      </svg>
                      Ver fotos, preços e detalhes completos
                    </a>
                  ) : (
                    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '14px', textAlign: 'center', marginBottom: '12px', fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>
                      Link do imóvel ainda não cadastrado
                    </div>
                  )}

                  {/* Botão: WhatsApp */}
                  {(selected.whatsapp || selected.phone) ? (
                    <button style={S.btnWhatsApp} onClick={() => openWhatsApp(selected)}
                      onMouseOver={e => e.currentTarget.style.opacity = '0.85'}
                      onMouseOut={e => e.currentTarget.style.opacity = '1'}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      Falar com corretor pelo WhatsApp
                    </button>
                  ) : (
                    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '14px', textAlign: 'center', marginTop: '0', fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>
                      WhatsApp não cadastrado para este imóvel
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── APP PRINCIPAL ───────────────────────────────────────────
export default function ImoveisDashboard() {
  const [screen, setScreen] = useState(SCREENS.LANDING);
  const [user, setUser]     = useState(null);

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(255,255,255,0.3); }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        body { background: #0d1b2a; }
      `}</style>
      <div style={S.root}>
        {screen === SCREENS.LANDING   && <LandingScreen onContinue={() => setScreen(SCREENS.AUTH)} />}
        {screen === SCREENS.AUTH      && <AuthScreen onLogin={u => { setUser(u); setScreen(SCREENS.VERIFY); }} />}
        {screen === SCREENS.VERIFY    && <VerifyScreen onVerified={phone => { setUser(u => ({ ...u, phone })); setScreen(SCREENS.DASHBOARD); }} />}
        {screen === SCREENS.DASHBOARD && <DashboardScreen user={user} />}
      </div>
    </>
  );
}
