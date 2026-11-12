// 4. Aplikasi Vue: menghubungkan modul Supabase, autentikasi, dan inventaris ke tampilan.
import { createAuthModule } from './auth.js';
import { createInventoryModule } from './inventory.js';
import { isConfigured, supabaseClient } from '../config/supabase.js';

const { createApp, ref, computed } = Vue;

createApp({
    setup() {
        const activeSection = ref('dashboard'); // 'dashboard' atau 'inventory'
        const sidebarOpen = ref(false);
        const isAdmin = ref(false);

        const inventory = createInventoryModule({
            client: supabaseClient,
            isAdmin
        });

        const auth = createAuthModule({
            client: supabaseClient,
            pageError: inventory.pageError,

            // Dijalankan setelah login berhasil dan profil selesai dimuat.
            onAuthenticated: async () => {
                isAdmin.value = false;

                if (auth.profile.value && auth.profile.value.role === 'admin') {
                    isAdmin.value = true;
                }

                await inventory.loadItems();
            },

            // Dijalankan setelah user keluar.
            onSignedOut: () => {
                isAdmin.value = false;
                inventory.items.value = [];
            }
        });

        // Dua huruf awal untuk avatar di kanan atas, contoh: "Budi Santoso" -> "BS".
        const userInitials = computed(() => {
            let nama = '';

            if (auth.profile.value && auth.profile.value.full_name) {
                nama = auth.profile.value.full_name;
            } else if (auth.currentUser.value) {
                nama = auth.currentUser.value.email;
            }

            if (!nama) return 'SI';

            // Ubah pemisah seperti @ . _ - menjadi spasi, lalu ambil huruf awal tiap kata.
            const kataKata = nama.replace(/[@._-]/g, ' ').split(' ');
            let inisial = '';

            for (const kata of kataKata) {
                if (kata && inisial.length < 2) {
                    inisial = inisial + kata.charAt(0).toUpperCase();
                }
            }

            return inisial || 'SI';
        });

        const currentYear = new Date().getFullYear();

        return {
            ...auth,
            ...inventory,
            activeSection,
            currentYear,
            isAdmin,
            isConfigured,
            sidebarOpen,
            userInitials
        };
    }
}).mount('#app');
