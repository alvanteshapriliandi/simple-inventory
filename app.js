// 4. Aplikasi Vue: menghubungkan modul Supabase, autentikasi, dan inventaris ke tampilan.
import { createAuthModule } from './auth.js';
import { createInventoryModule } from './inventory.js';
import { isConfigured, supabaseClient } from './supabase.js';

const { createApp, ref, computed } = Vue;

createApp({
    setup() {
        const activeSection = ref('dashboard');
        const sidebarOpen = ref(false);
        const isAdmin = ref(false);

        const inventory = createInventoryModule({
            client: supabaseClient,
            isAdmin
        });
        const auth = createAuthModule({
            client: supabaseClient,
            pageError: inventory.pageError,
            onAuthenticated: async () => {
                isAdmin.value = auth.profile.value?.role === 'admin';
                await inventory.loadItems();
            },
            onSignedOut: () => {
                isAdmin.value = false;
                inventory.items.value = [];
            }
        });

        const userInitials = computed(() => {
            const name = auth.profile.value?.full_name || auth.currentUser.value?.email || 'SI';
            return name.split(/[\s@._-]+/).filter(Boolean).slice(0, 2)
                .map((part) => part.charAt(0).toUpperCase()).join('');
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
