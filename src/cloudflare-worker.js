// ── Cloudflare Worker: proxy seguro para Twilio Verify OTP ──
// Deploy em: workers.cloudflare.com
// Adicione os secrets no painel do Worker (Settings → Variables e Secrets):
//   TWILIO_ACCOUNT_SID  → Account SID do painel Twilio
//   TWILIO_AUTH_TOKEN   → Auth Token do painel Twilio
//   TWILIO_VERIFY_SID   → Service SID do Verify (começa com VA...)

export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type':                 'application/json',
    };

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST')    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: cors });

    const url  = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const auth = btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);

    // ── POST /send-otp  { phone: "+5598999998888" } ──────────
    if (url.pathname === '/send-otp') {
      const { phone } = body;
      if (!phone) return new Response(JSON.stringify({ error: 'phone obrigatório' }), { status: 400, headers: cors });

      const res = await fetch(
        `https://verify.twilio.com/v2/Services/${env.TWILIO_VERIFY_SID}/Verifications`,
        {
          method:  'POST',
          headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body:    `To=${encodeURIComponent(phone)}&Channel=whatsapp`,
        }
      );
      const data = await res.json();
      if (data.status === 'pending') return new Response(JSON.stringify({ success: true }), { headers: cors });
      return new Response(JSON.stringify({ error: data.message || 'Erro ao enviar código' }), { status: 400, headers: cors });
    }

    // ── POST /verify-otp  { phone: "+5598999998888", code: "123456" } ──
    if (url.pathname === '/verify-otp') {
      const { phone, code } = body;
      if (!phone || !code) return new Response(JSON.stringify({ error: 'phone e code obrigatórios' }), { status: 400, headers: cors });

      const res = await fetch(
        `https://verify.twilio.com/v2/Services/${env.TWILIO_VERIFY_SID}/VerificationCheck`,
        {
          method:  'POST',
          headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body:    `To=${encodeURIComponent(phone)}&Code=${encodeURIComponent(code)}`,
        }
      );
      const data = await res.json();
      return new Response(JSON.stringify({ valid: data.status === 'approved' }), { headers: cors });
    }

    return new Response(JSON.stringify({ error: 'Rota não encontrada' }), { status: 404, headers: cors });
  },
};
