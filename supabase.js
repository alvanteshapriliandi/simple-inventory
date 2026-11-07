// 1. Koneksi Supabase
// Gunakan publishable key atau anon key. Jangan pernah gunakan service_role key di browser.
const SUPABASE_URL = 'https://xohtbhnohaufcksmbomf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_-6bR7iv7BSJ9rHC-Or6-Hg_TH9gdl_S';

export const isConfigured = Boolean(
    SUPABASE_URL.startsWith('https://') &&
    !SUPABASE_URL.includes('YOUR_') &&
    SUPABASE_ANON_KEY.length > 20 &&
    !SUPABASE_ANON_KEY.includes('YOUR_') &&
    window.supabase?.createClient
);

export const supabaseClient = isConfigured
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

export function readableError(error, fallback) {
    return error?.message || fallback;
}
