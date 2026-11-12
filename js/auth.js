// 2. Autentikasi, sesi, dan profil pengguna
import { readableError } from '../config/supabase.js';

export function createAuthModule({ client, onAuthenticated, onSignedOut, pageError }) {
    const { ref, onMounted, onUnmounted } = Vue;

    const authLoading = ref(true);
    const authSubmitting = ref(false);
    const authMode = ref('login'); // 'login' atau 'register'
    const authError = ref('');
    const authNotice = ref('');
    const authForm = ref({ fullName: '', email: '', password: '' });

    const currentUser = ref(null);
    const profile = ref(null);
    const profileError = ref('');

    let authSubscription = null;

    // Ambil nama dan role dari tabel profiles untuk user yang sedang login.
    async function loadUserData(user) {
        currentUser.value = user;
        profile.value = null;
        profileError.value = '';

        // Belum login atau Supabase belum terhubung.
        if (!user || !client) {
            authLoading.value = false;
            onSignedOut();
            return;
        }

        authLoading.value = true;

        const { data, error } = await client
            .from('profiles')
            .select('full_name, role')
            .eq('id', user.id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                profileError.value = 'Akun ini belum memiliki profil. Periksa trigger profiles di Supabase.';
            } else {
                profileError.value = readableError(error, 'Profil tidak dapat dimuat.');
            }
        } else {
            profile.value = data;
            await onAuthenticated();
        }

        authLoading.value = false;
    }

    // Proses masuk dengan email dan password.
    async function login() {
        const { error } = await client.auth.signInWithPassword({
            email: authForm.value.email,
            password: authForm.value.password
        });

        if (error) {
            authError.value = readableError(error, 'Gagal masuk. Periksa email dan password.');
            return;
        }

        authNotice.value = 'Berhasil masuk. Dashboard sedang disiapkan...';
    }

    // Proses pendaftaran akun baru.
    async function register() {
        const { data, error } = await client.auth.signUp({
            email: authForm.value.email,
            password: authForm.value.password,
            options: {
                data: { full_name: authForm.value.fullName }
            }
        });

        if (error) {
            authError.value = readableError(error, 'Pendaftaran gagal. Silakan coba lagi.');
            return;
        }

        if (data.session) {
            authNotice.value = 'Akun berhasil dibuat.';
        } else {
            // Jika konfirmasi email aktif, user harus konfirmasi dulu sebelum masuk.
            authNotice.value = 'Pendaftaran berhasil. Periksa email untuk konfirmasi, lalu masuk.';
            authMode.value = 'login';
        }

        authForm.value.password = '';
    }

    // Dipanggil ketika form login/daftar dikirim.
    async function submitAuth() {
        if (!client) return;

        authSubmitting.value = true;
        authError.value = '';
        authNotice.value = '';

        if (authMode.value === 'login') {
            await login();
        } else {
            await register();
        }

        authSubmitting.value = false;
    }

    // Pindah antara form login dan form daftar.
    function toggleAuthMode() {
        if (authMode.value === 'login') {
            authMode.value = 'register';
        } else {
            authMode.value = 'login';
        }

        authError.value = '';
        authNotice.value = '';
    }

    async function logout() {
        pageError.value = '';

        const { error } = await client.auth.signOut();

        if (error) {
            pageError.value = readableError(error, 'Gagal keluar. Silakan coba lagi.');
        }
    }

    onMounted(async () => {
        if (!client) {
            authLoading.value = false;
            return;
        }

        // Periksa apakah masih ada sesi login yang tersimpan di browser.
        const { data, error } = await client.auth.getSession();

        if (error) {
            authError.value = readableError(error, 'Sesi tidak dapat diperiksa.');
            authLoading.value = false;
            return;
        }

        if (data.session) {
            await loadUserData(data.session.user);
        } else {
            await loadUserData(null);
        }

        // Pantau perubahan status login, misalnya setelah masuk atau keluar.
        const hasil = client.auth.onAuthStateChange((_event, session) => {
            let userBaru = null;
            if (session) {
                userBaru = session.user;
            }

            // Data profil sudah ada untuk user yang sama, tidak perlu dimuat ulang.
            if (userBaru && profile.value && currentUser.value && userBaru.id === currentUser.value.id) {
                return;
            }

            // Dijalankan setelah callback selesai agar tidak bentrok dengan Supabase.
            window.setTimeout(() => loadUserData(userBaru), 0);
        });

        authSubscription = hasil.data.subscription;
    });

    onUnmounted(() => {
        if (authSubscription) {
            authSubscription.unsubscribe();
        }
    });

    return {
        authError, authForm, authLoading, authMode, authNotice, authSubmitting,
        currentUser, loadUserData, logout, profile, profileError, submitAuth, toggleAuthMode
    };
}
