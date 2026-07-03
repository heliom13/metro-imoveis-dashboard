// ── Cloudflare Worker: proxy seguro para Twilio Verify OTP ──
// Secrets (Settings → Variables e Secrets):
//   TWILIO_ACCOUNT_SID  → Account SID do painel Twilio
//   TWILIO_AUTH_TOKEN   → Auth Token do painel Twilio
//   TWILIO_VERIFY_SID   → Service SID do Verify (começa com VA...)
// KV Binding (Settings → Variables → KV Namespace Bindings):
//   RATE_KV  → namespace KV criado no painel Cloudflare

// Domínios autorizados — adicione o domínio personalizado aqui quando configurar
const ALLOWED_ORIGINS = [
  'https://metro-imoveis-dashboard.helioncorrea13.workers.dev',
];

const MAX_OTP_SENDS    = 3;    // máx 3 envios por número por hora
const MAX_OTP_ATTEMPTS = 5;    // máx 5 tentativas de verificação por número por hora
const WINDOW_SECONDS   = 3600; // janela de 1 hora

// Números brasileiros: +55 + DDD (2 dígitos) + número (8 ou 9 dígitos)
const PHONE_REGEX = /^\+55\d{10,11}$/;

export default {
  async fetch(request, env) {
    const origin  = request.headers.get('Origin') || '';
    const allowed = ALLOWED_ORIGINS.includes(origin);

    const corsHeaders = {
      'Access-Control-Allow-Origin':  allowed ? origin : 'null',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type':                 'application/json',
    };

    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    if (!allowed) {
      return new Response(
        JSON.stringify({ error: 'Origem não autorizada' }),
        { status: 403, headers: corsHeaders }
      );
    }

    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: corsHeaders }
      );
    }

    const url  = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const auth = btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);

    // Rate limiting via KV — conta tentativas por chave dentro da janela
    const checkRateLimit = async (key, max) => {
      if (!env.RATE_KV) return false;
      const current = parseInt(await env.RATE_KV.get(key) || '0');
      if (current >= max) return true;
      await env.RATE_KV.put(key, String(current + 1), { expirationTtl: WINDOW_SECONDS });
      return false;
    };

    // ── POST /send-otp  { phone: "+5598999998888" } ──────────────
    if (url.pathname === '/send-otp') {
      const { phone } = body;

      if (!phone || !PHONE_REGEX.test(phone)) {
        return new Response(
          JSON.stringify({ error: 'Número inválido. Use formato +55XXXXXXXXXXX.' }),
          { status: 400, headers: corsHeaders }
        );
      }

      if (await checkRateLimit(`send:${phone}`, MAX_OTP_SENDS)) {
        return new Response(
          JSON.stringify({ error: 'Muitas tentativas. Aguarde 1 hora para tentar novamente.' }),
          { status: 429, headers: corsHeaders }
        );
      }

      const res  = await fetch(
        `https://verify.twilio.com/v2/Services/${env.TWILIO_VERIFY_SID}/Verifications`,
        {
          method:  'POST',
          headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body:    `To=${encodeURIComponent(phone)}&Channel=whatsapp`,
        }
      );
      const data = await res.json();
      if (data.status === 'pending') return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      return new Response(
        JSON.stringify({ error: data.message || 'Erro ao enviar código' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // ── POST /verify-otp  { phone: "+5598999998888", code: "123456" } ──
    if (url.pathname === '/verify-otp') {
      const { phone, code } = body;

      if (!phone || !PHONE_REGEX.test(phone)) {
        return new Response(
          JSON.stringify({ error: 'Número inválido.' }),
          { status: 400, headers: corsHeaders }
        );
      }
      if (!code || !/^\d{6}$/.test(code)) {
        return new Response(
          JSON.stringify({ error: 'Código deve ter 6 dígitos numéricos.' }),
          { status: 400, headers: corsHeaders }
        );
      }

      if (await checkRateLimit(`verify:${phone}`, MAX_OTP_ATTEMPTS)) {
        return new Response(
          JSON.stringify({ error: 'Muitas tentativas. Aguarde 1 hora para tentar novamente.' }),
          { status: 429, headers: corsHeaders }
        );
      }

      const res  = await fetch(
        `https://verify.twilio.com/v2/Services/${env.TWILIO_VERIFY_SID}/VerificationCheck`,
        {
          method:  'POST',
          headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body:    `To=${encodeURIComponent(phone)}&Code=${encodeURIComponent(code)}`,
        }
      );
      const data = await res.json();
      return new Response(JSON.stringify({ valid: data.status === 'approved' }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: 'Rota não encontrada' }), { status: 404, headers: corsHeaders });
  },
};
