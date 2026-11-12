// 1. Koneksi Supabase
// Gunakan publishable key atau anon key. Jangan pernah gunakan service_role key di browser.
const SUPABASE_URL = 'https://xohtbhnohaufcksmbomf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_-6bR7iv7BSJ9rHC-Or6-Hg_TH9gdl_S';

// Cek sederhana: URL sudah diisi, key sudah diisi, dan library Supabase sudah dimuat.
export const isConfigured =
    SUPABASE_URL.startsWith('https://') &&
    SUPABASE_ANON_KEY.length > 20 &&
    Boolean(window.supabase);

// Koneksi yang dipakai oleh auth.js dan inventory.js.
export let supabaseClient = null;

if (isConfigured) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Ambil pesan error dari Supabase. Jika pesannya kosong, pakai pesan cadangan.
export function readableError(error, pesanCadangan) {
    if (error && error.message) {
        return error.message;
    }
    return pesanCadangan;
}
