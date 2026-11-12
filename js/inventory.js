// 3. Data inventaris, pencarian, ringkasan, dan operasi CRUD
import { readableError } from '../config/supabase.js';

export function createInventoryModule({ client, isAdmin }) {
    const { ref, computed } = Vue;

    // Data utama dari database
    const items = ref([]);
    const itemsLoading = ref(false);
    const itemsError = ref('');
    const pageError = ref('');

    // Isi kotak cari dan filter kategori
    const searchQuery = ref('');
    const selectedCategory = ref('');

    // Form tambah / ubah barang
    const showItemModal = ref(false);
    const editingItem = ref(null);
    const itemForm = ref({ name: '', category: '', stock: 0, unit: '' });
    const formError = ref('');
    const savingItem = ref(false);
    const deletingId = ref('');

    // Daftar kategori tanpa duplikat, untuk pilihan filter.
    const categories = computed(() => {
        const hasil = [];

        for (const item of items.value) {
            if (item.category && !hasil.includes(item.category)) {
                hasil.push(item.category);
            }
        }

        hasil.sort();
        return hasil;
    });

    // Daftar barang yang tampil di tabel, sesuai pencarian dan kategori.
    const filteredItems = computed(() => {
        const kataCari = searchQuery.value.toLowerCase();
        const hasil = [];

        for (const item of items.value) {
            const cocokNama = item.name.toLowerCase().includes(kataCari);
            const cocokKategori = selectedCategory.value === '' || item.category === selectedCategory.value;

            if (cocokNama && cocokKategori) {
                hasil.push(item);
            }
        }

        return hasil;
    });

    // Angka ringkasan untuk kartu dashboard.
    const totalItems = computed(() => items.value.length);
    const totalCategories = computed(() => categories.value.length);

    const totalStock = computed(() => {
        let total = 0;

        for (const item of items.value) {
            total = total + Number(item.stock || 0);
        }

        return total;
    });

    const lowStockItems = computed(() => {
        let jumlah = 0;

        for (const item of items.value) {
            if (Number(item.stock || 0) <= 5) {
                jumlah = jumlah + 1;
            }
        }

        return jumlah;
    });

    // READ: ambil semua barang dari tabel items.
    async function loadItems() {
        if (!client) return;

        itemsLoading.value = true;
        itemsError.value = '';

        const { data, error } = await client
            .from('items')
            .select('id, name, category, stock, unit, created_at')
            .order('created_at', { ascending: false });

        if (error) {
            itemsError.value = readableError(error, 'Data inventaris tidak dapat dimuat.');
            items.value = [];
        } else {
            items.value = data || [];
        }

        itemsLoading.value = false;
    }

    // Buka form kosong untuk menambah barang baru.
    function openCreateModal() {
        editingItem.value = null;
        itemForm.value = { name: '', category: '', stock: 0, unit: '' };
        formError.value = '';
        showItemModal.value = true;
    }

    // Buka form yang sudah terisi data barang yang dipilih.
    function openEditModal(item) {
        editingItem.value = item;
        itemForm.value = {
            name: item.name,
            category: item.category,
            stock: Number(item.stock),
            unit: item.unit
        };
        formError.value = '';
        showItemModal.value = true;
    }

    function closeItemModal() {
        if (savingItem.value) return;

        showItemModal.value = false;
        formError.value = '';
    }

    // CREATE dan UPDATE: satu tombol simpan untuk dua keperluan.
    async function saveItem() {
        if (!client || !isAdmin.value) return;

        const stock = Number(itemForm.value.stock);

        if (!Number.isInteger(stock) || stock < 0) {
            formError.value = 'Stok harus berupa bilangan bulat nol atau lebih.';
            return;
        }

        savingItem.value = true;
        formError.value = '';

        const dataBarang = {
            name: itemForm.value.name,
            category: itemForm.value.category,
            stock: stock,
            unit: itemForm.value.unit
        };

        let hasil = null;

        if (editingItem.value) {
            // UPDATE: ubah barang yang id-nya sama.
            hasil = await client.from('items').update(dataBarang).eq('id', editingItem.value.id);
        } else {
            // CREATE: tambah barang baru.
            hasil = await client.from('items').insert(dataBarang);
        }

        if (hasil.error) {
            formError.value = readableError(hasil.error, 'Data barang gagal disimpan.');
        } else {
            showItemModal.value = false;
            await loadItems();
        }

        savingItem.value = false;
    }

    // DELETE: hapus satu barang berdasarkan id.
    async function deleteItem(item) {
        if (!client || !isAdmin.value) return;

        const setuju = window.confirm('Hapus barang "' + item.name + '"? Tindakan ini tidak dapat dibatalkan.');
        if (!setuju) return;

        deletingId.value = item.id;
        pageError.value = '';

        const { error } = await client.from('items').delete().eq('id', item.id);

        if (error) {
            pageError.value = readableError(error, 'Barang gagal dihapus.');
        } else {
            await loadItems();
        }

        deletingId.value = '';
    }

    // Ubah tanggal dari database menjadi format Indonesia, contoh: 12 Nov 2026.
    function formatDate(dateString) {
        if (!dateString) return '-';

        const tanggal = new Date(dateString);

        return tanggal.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }

    return {
        categories, closeItemModal, deleteItem, deletingId, editingItem, filteredItems,
        formError, formatDate, itemForm, items, itemsError, itemsLoading, loadItems,
        lowStockItems, openCreateModal, openEditModal, pageError, saveItem, savingItem,
        searchQuery, selectedCategory, showItemModal, totalCategories, totalItems, totalStock
    };
}
