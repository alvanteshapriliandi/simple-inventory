// 3. Data inventaris, pencarian, ringkasan, dan operasi CRUD
import { readableError } from './supabase.js';

export function createInventoryModule({ client, isAdmin }) {
    const { ref, computed } = Vue;

    const pageError = ref('');
    const items = ref([]);
    const itemsLoading = ref(false);
    const itemsError = ref('');
    const searchQuery = ref('');
    const selectedCategory = ref('');
    const showItemModal = ref(false);
    const editingItem = ref(null);
    const savingItem = ref(false);
    const deletingId = ref('');
    const formError = ref('');
    const itemForm = ref({ name: '', category: '', stock: 0, unit: '' });

    const categories = computed(() =>
        [...new Set(items.value.map((item) => item.category).filter(Boolean))]
            .sort((first, second) => first.localeCompare(second, 'id'))
    );
    const filteredItems = computed(() => {
        const query = searchQuery.value.toLocaleLowerCase('id');
        return items.value.filter((item) => {
            const matchesName = !query || item.name.toLocaleLowerCase('id').includes(query);
            const matchesCategory = !selectedCategory.value || item.category === selectedCategory.value;
            return matchesName && matchesCategory;
        });
    });
    const totalItems = computed(() => items.value.length);
    const totalCategories = computed(() => categories.value.length);
    const totalStock = computed(() =>
        items.value.reduce((total, item) => total + Number(item.stock || 0), 0)
    );
    const lowStockItems = computed(() =>
        items.value.filter((item) => Number(item.stock) <= 5).length
    );

    function clearItems() {
        items.value = [];
        itemsError.value = '';
    }

    async function loadItems() {
        if (!client) return;
        itemsLoading.value = true;
        itemsError.value = '';

        try {
            const { data, error } = await client
                .from('items')
                .select('id, name, category, stock, unit, created_at')
                .order('created_at', { ascending: false });

            if (error) throw error;
            items.value = data || [];
        } catch (error) {
            itemsError.value = readableError(error, 'Data inventaris tidak dapat dimuat.');
            items.value = [];
        } finally {
            itemsLoading.value = false;
        }
    }

    function openCreateModal() {
        editingItem.value = null;
        itemForm.value = { name: '', category: '', stock: 0, unit: '' };
        formError.value = '';
        showItemModal.value = true;
    }

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

    async function saveItem() {
        if (!client || !isAdmin.value) return;
        const stock = Number(itemForm.value.stock);
        if (!Number.isInteger(stock) || stock < 0) {
            formError.value = 'Stok harus berupa bilangan bulat nol atau lebih.';
            return;
        }

        savingItem.value = true;
        formError.value = '';
        const itemData = {
            name: itemForm.value.name,
            category: itemForm.value.category,
            stock,
            unit: itemForm.value.unit
        };

        try {
            const result = editingItem.value
                ? await client.from('items').update(itemData).eq('id', editingItem.value.id)
                : await client.from('items').insert(itemData);
            if (result.error) throw result.error;
            showItemModal.value = false;
            await loadItems();
        } catch (error) {
            formError.value = readableError(error, 'Data barang gagal disimpan.');
        } finally {
            savingItem.value = false;
        }
    }

    async function deleteItem(item) {
        if (!isAdmin.value || !window.confirm(`Hapus barang "${item.name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
        deletingId.value = item.id;
        pageError.value = '';

        try {
            const { error } = await client.from('items').delete().eq('id', item.id);
            if (error) throw error;
            await loadItems();
        } catch (error) {
            pageError.value = readableError(error, 'Barang gagal dihapus.');
        } finally {
            deletingId.value = '';
        }
    }

    function formatDate(dateString) {
        if (!dateString) return '-';
        return new Intl.DateTimeFormat('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).format(new Date(dateString));
    }

    return {
        categories, closeItemModal, deleteItem, deletingId, editingItem, filteredItems,
        formError, formatDate, itemForm, items, itemsError, itemsLoading, loadItems,
        lowStockItems, openCreateModal, openEditModal, pageError, saveItem, savingItem,
        searchQuery, selectedCategory, showItemModal, totalCategories, totalItems, totalStock
    };
}
