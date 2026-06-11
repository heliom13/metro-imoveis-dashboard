// ─── CONFIGURAÇÃO ──────────────────────────────────────────────────────────
// Após implantar o GoogleSheetsScript.gs como Web App, cole a URL abaixo.
// Exemplo: "https://script.google.com/macros/s/AKfycbxXXXXXXXXX/exec"

export const SHEETS_API_URL = 'COLE_AQUI_A_URL_DO_APPS_SCRIPT';

// URL do Cloudflare Worker para OTP — cole após o deploy
export const OTP_API_URL = 'https://metro-otp.helioncorrea13.workers.dev';

// Raio inicial de busca em km (mínimo 1, máximo 3)
export const RADIUS_MIN_KM = 1;
export const RADIUS_MAX_KM = 3;
export const RADIUS_DEFAULT_KM = 1;
