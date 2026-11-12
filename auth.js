// 2. Autentikasi, sesi, dan profil pengguna
import { readableError } from './supabase.js';

export function createAuthModule({ client, onAuthenticated, onSignedOut, pageError }) {
    const { ref, onMounted, onUnmounted } = Vue;

    const authLoading = ref(true);
    const authSubmitting = ref(false);
    const authMode = ref('login');
    const authError = ref('');
    const authNotice = ref('');
    const authForm = ref({ fullName: '', email: '', password: '' });
    const currentUser = ref(null);
    const profile = ref(null);
    const profileError = ref('');
    let authSubscription = null;
    let loadRequestId = 0;
    let unmounted = false;

    async function loadUserData(user) {
        const requestId = ++loadRequestId;
        currentUser.value = user;
        profile.value = null;
        profileError.value = '';

        if (!user || !client) {
            authLoading.value = false;
            onSignedOut();
            return;
        }

        authLoading.value = true;
        try {
            const { data, error } = await client
                .from('profiles')
                .select('full_name, role')
                .eq('id', user.id)
                .single();

            if (requestId !== loadRequestId) return;
            if (error) {
                profileError.value = error.code === 'PGRST116'
                    ? 'Akun ini belum memiliki profil. Periksa trigger profiles dan buat ulang akun bila diperlukan.'
                    : readableError(error, 'Profil tidak dapat dimuat.');
                onSignedOut();
                return;
            }

            profile.value = data;
            await onAuthenticated();
        } catch (error) {
            if (requestId === loadRequestId) {
                profileError.value = readableError(error, 'Profil tidak dapat dimuat. Periksa koneksi internet Anda.');
                onSignedOut();
            }
        } finally {
            if (requestId === loadRequestId) authLoading.value = false;
        }
    }

    async function submitAuth() {
        if (!client) return;
        authError.value = '';
        authNotice.value = '';

        const { fullName, email, password } = authForm.value;
        if (!email.trim() || !password) {
            authError.value = 'Email dan kata sandi wajib diisi.';
            return;
        }
        if (authMode.value === 'register') {
            if (!fullName.trim()) {
                authError.value = 'Nama lengkap wajib diisi.';
                return;
            }
            if (password.length < 6) {
                authError.value = 'Kata sandi minimal 6 karakter.';
                return;
            }
        }

        authSubmitting.value = true;
        try {
            if (authMode.value === 'login') {
                const { error } = await client.auth.signInWithPassword({
                    email: email.trim(),
                    password
                });
                if (error) throw error;
                authNotice.value = 'Berhasil masuk. Dashboard sedang disiapkan...';
            } else {
                const { data, error } = await client.auth.signUp({
                    email: email.trim(),
                    password,
                    options: { data: { full_name: fullName.trim() } }
                });
                if (error) throw error;
                if (!data.session) {
                    authNotice.value = 'Pendaftaran berhasil. Periksa email untuk konfirmasi, lalu masuk.';
                    authMode.value = 'login';
                } else {
                    authNotice.value = 'Akun berhasil dibuat.';
                }
                authForm.value.password = '';
            }
        } catch (error) {
            authError.value = readableError(error, 'Proses autentikasi gagal. Silakan coba lagi.');
        } finally {
            authSubmitting.value = false;
        }
    }

    function toggleAuthMode() {
        authMode.value = authMode.value === 'login' ? 'register' : 'login';
        authError.value = '';
        authNotice.value = '';
    }

    async function logout() {
        if (!client) return;
        pageError.value = '';
        try {
            const { error } = await client.auth.signOut();
            if (error) pageError.value = readableError(error, 'Gagal keluar. Silakan coba lagi.');
        } catch (error) {
            pageError.value = readableError(error, 'Gagal keluar. Silakan coba lagi.');
        }
    }

    onMounted(async () => {
        if (!client) {
            authLoading.value = false;
            return;
        }

        try {
            const { data, error } = await client.auth.getSession();
            if (error) throw error;
            if (unmounted) return;
            await loadUserData(data.session?.user || null);
        } catch (error) {
            authError.value = readableError(error, 'Sesi tidak dapat diperiksa.');
            authLoading.value = false;
        }

        if (unmounted) return;
        const { data: authData } = client.auth.onAuthStateChange((_event, session) => {
            const nextUser = session?.user || null;
            if (nextUser && profile.value && nextUser.id === currentUser.value?.id) return;
            // Menjalankan setelah callback auth selesai mencegah lock internal Supabase.
            window.setTimeout(() => loadUserData(nextUser), 0);
        });
        authSubscription = authData.subscription;
    });

    onUnmounted(() => {
        unmounted = true;
        authSubscription?.unsubscribe();
    });

    return {
        authError, authForm, authLoading, authMode, authNotice, authSubmitting,
        currentUser, loadUserData, logout, profile, profileError, submitAuth, toggleAuthMode
    };
}
