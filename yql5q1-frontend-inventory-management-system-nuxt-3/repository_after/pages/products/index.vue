<template>
  <section class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="text-sm text-slate-500 dark:text-slate-400">Catalog</p>
        <h1 class="text-2xl font-semibold">Products</h1>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <label
          class="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-brand-300 hover:text-brand-700"
        >
          <input
            type="file"
            accept="application/json"
            class="hidden"
            @change="handleImport"
          />
          Import JSON
        </label>
        <button
          type="button"
          class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-brand-300 hover:text-brand-700"
          @click="exportData"
        >
          Export JSON
        </button>
        <button
          type="button"
          class="rounded-xl bg-gradient-to-r from-brand-500 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-soft transition hover:from-brand-600 hover:to-indigo-600"
          @click="openCreate"
        >
          Add product
        </button>
      </div>
    </div>

    <div class="grid gap-4 lg:grid-cols-[2fr_1fr_1fr_1fr]">
      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <label class="text-xs font-semibold uppercase text-slate-500"
          >Search</label
        >
        <input
          v-model.trim="search"
          type="text"
          class="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-400"
          placeholder="Search by name or SKU"
        />
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <label class="text-xs font-semibold uppercase text-slate-500"
          >Category</label
        >
        <select
          v-model="category"
          class="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-400"
        >
          <option value="">All categories</option>
          <option
            v-for="item in store.availableCategories"
            :key="item"
            :value="item"
          >
            {{ item }}
          </option>
        </select>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <label class="text-xs font-semibold uppercase text-slate-500"
          >Status</label
        >
        <select
          v-model="status"
          class="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-400"
        >
          <option value="">All statuses</option>
          <option value="In Stock">In Stock</option>
          <option value="Low Stock">Low Stock</option>
          <option value="Out of Stock">Out of Stock</option>
        </select>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <label class="text-xs font-semibold uppercase text-slate-500"
          >Sort by</label
        >
        <select
          v-model="sortKey"
          class="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-400"
        >
          <option value="name">Name</option>
          <option value="stock">Stock</option>
          <option value="price">Price</option>
        </select>
      </div>
    </div>

    <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
      <div v-if="paginatedProducts.length" class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead
            class="text-left text-xs font-semibold uppercase text-slate-400"
          >
            <tr class="border-b border-slate-200">
              <th class="px-3 py-3">Product</th>
              <th class="px-3 py-3">SKU</th>
              <th class="px-3 py-3">Category</th>
              <th class="px-3 py-3">Price</th>
              <th class="px-3 py-3">Stock</th>
              <th class="px-3 py-3">Status</th>
              <th class="px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="product in paginatedProducts"
              :key="product.id"
              class="text-slate-700"
            >
              <td class="px-3 py-4">
                <p class="font-semibold text-slate-900">{{ product.name }}</p>
                <p class="text-xs text-slate-400">
                  Updated {{ formatDate(product.updatedAt) }}
                </p>
              </td>
              <td class="px-3 py-4">{{ product.sku }}</td>
              <td class="px-3 py-4">{{ product.category }}</td>
              <td class="px-3 py-4">${{ product.price.toFixed(2) }}</td>
              <td class="px-3 py-4">
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-brand-300 hover:text-brand-700"
                    @click="adjustStock(product.id, -1)"
                  >
                    -
                  </button>
                  <span class="min-w-[32px] text-center font-semibold">{{
                    product.stock
                  }}</span>
                  <button
                    type="button"
                    class="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-brand-300 hover:text-brand-700"
                    @click="adjustStock(product.id, 1)"
                  >
                    +
                  </button>
                </div>
              </td>
              <td class="px-3 py-4">
                <StatusBadge :status="store.statusByStock(product.stock)" />
              </td>
              <td class="px-3 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    class="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-brand-300 hover:text-brand-700"
                    @click="openEdit(product)"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    class="rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:border-rose-300"
                    @click="confirmDelete(product)"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="py-12 text-center">
        <p class="text-sm font-semibold text-slate-600">No products found.</p>
        <p class="mt-1 text-xs text-slate-400">
          Adjust filters or add a new product.
        </p>
      </div>
      <div class="mt-4">
        <PaginationControl
          :current-page="currentPage"
          :total-pages="totalPages"
          @change="handlePageChange"
        />
      </div>
    </div>
  </section>

  <ModalBase :open="showCreateModal" title="Add product" @close="closeCreate">
    <ProductForm
      :categories="store.availableCategories"
      :reserved-skus="existingSkus"
      submit-label="Create product"
      @submit="createProduct"
      @cancel="closeCreate"
    />
  </ModalBase>

  <ModalBase :open="showEditModal" title="Edit product" @close="closeEdit">
    <ProductForm
      v-if="editingProduct"
      :initial-product="editingProduct"
      :categories="store.availableCategories"
      :reserved-skus="reservedSkus"
      submit-label="Save changes"
      @submit="updateProduct"
      @cancel="closeEdit"
    />
  </ModalBase>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from "vue";
import { useProductsStore, type Product } from "~/stores/products";
import { useToasts } from "~/composables/useToasts";
import { useConfirmDialog } from "~/composables/useConfirmDialog";

const store = useProductsStore();
const { addToast } = useToasts();
const confirmDialog = useConfirmDialog();

// Reactive filters and pagination
const search = ref("");
const category = ref("");
const status = ref("");
const sortKey = ref<"name" | "stock" | "price">("name");
const currentPage = ref(1);
const itemsPerPage = 8;
const showCreateModal = ref(false);
const showEditModal = ref(false);
const editingProduct = ref<Product | null>(null);

const existingSkus = computed(() =>
  store.products.map((product) => product.sku),
);

const reservedSkus = computed(() =>
  store.products
    .filter((item) => item.id !== editingProduct.value?.id)
    .map((item) => item.sku),
);

// Filtered products based on search, category, and status
const filteredProducts = computed(() => {
  let filtered = [...store.products];

  // Filter by search
  if (search.value) {
    const searchLower = search.value.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(searchLower) ||
        p.sku.toLowerCase().includes(searchLower),
    );
  }

  // Filter by category
  if (category.value) {
    filtered = filtered.filter((p) => p.category === category.value);
  }

  // Filter by status
  if (status.value) {
    if (status.value === "Out of Stock") {
      filtered = filtered.filter((p) => p.stock === 0);
    } else if (status.value === "Low Stock") {
      filtered = filtered.filter((p) => p.stock > 0 && p.stock <= 5);
    } else if (status.value === "In Stock") {
      filtered = filtered.filter((p) => p.stock > 5);
    }
  }

  // Sort
  filtered.sort((a, b) => {
    if (sortKey.value === "name") {
      return a.name.localeCompare(b.name);
    } else if (sortKey.value === "stock") {
      return b.stock - a.stock;
    } else if (sortKey.value === "price") {
      return b.price - a.price;
    }
    return 0;
  });

  return filtered;
});

// Paginated products
const paginatedProducts = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return filteredProducts.value.slice(start, end);
});

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredProducts.value.length / itemsPerPage)),
);

watch([search, category, status, sortKey], () => {
  currentPage.value = 1;
});

function handlePageChange(page: number) {
  currentPage.value = page;
}

function openCreate() {
  showCreateModal.value = true;
}

function closeCreate() {
  showCreateModal.value = false;
}

function openEdit(product: Product) {
  editingProduct.value = product;
  showEditModal.value = true;
}

function closeEdit() {
  showEditModal.value = false;
  editingProduct.value = null;
}

function createProduct(
  payload: Omit<Product, "id" | "createdAt" | "updatedAt">,
) {
  store.addProduct(payload);
  addToast("Product created successfully.", "success");
  closeCreate();
}

function updateProduct(
  payload: Omit<Product, "id" | "createdAt" | "updatedAt">,
) {
  if (!editingProduct.value) return;
  store.updateProduct(editingProduct.value.id, payload);
  addToast("Product updated successfully.", "success");
  closeEdit();
}

// Adjust stock with validation
function adjustStock(productId: string, amount: number) {
  const product = store.products.find((p) => p.id === productId);
  if (!product) return;

  const newStock = product.stock + amount;
  if (newStock < 0) {
    addToast("Stock cannot go below zero.", "error");
    return;
  }

  const success = store.adjustStock(productId, amount);
  if (success) {
    addToast("Stock updated.", "success");
  }
}

// Confirm and delete product
async function confirmDelete(product: Product) {
  const confirmed = await confirmDialog.confirm({
    title: "Delete Product",
    message: `Are you sure you want to delete "${product.name}"?`,
  });

  if (confirmed) {
    store.deleteProduct(product.id);
    addToast("Product deleted.", "success");
  }
}

// Handle JSON import
async function handleImport(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) return;

  try {
    const text = await file.text();
    const imported: Product[] = JSON.parse(text);

    // Validate it's an array
    if (!Array.isArray(imported)) {
      addToast("Invalid JSON file.", "error");
      return;
    }

    // Validate products have required fields
    const isValid = imported.every(
      (p) =>
        p.id &&
        p.name &&
        p.sku &&
        p.category !== undefined &&
        typeof p.price === "number" &&
        typeof p.stock === "number",
    );

    if (!isValid) {
      addToast("Invalid JSON file.", "error");
      return;
    }

    store.importProducts(imported);
    addToast("Inventory imported successfully.", "success");

    // Reset file input
    target.value = "";
  } catch (error) {
    addToast("Invalid JSON file.", "error");
    target.value = "";
  }
}

// Export data
function exportData() {
  try {
    if (!store.products || store.products.length === 0) {
      addToast("No data to export.", "warning");
      return;
    }
    const dataStr = JSON.stringify(store.products, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inventory-export-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast("Inventory exported successfully.", "success");
  } catch (error) {
    console.error("Export failed:", error);
    addToast("Failed to export inventory.", "error");
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString();
}

// Expose methods and computed properties for tests
defineExpose({
  search,
  category,
  status,
  sortKey,
  currentPage,
  filteredProducts,
  paginatedProducts,
  adjustStock,
  confirmDelete,
  handleImport,
  exportData,
});
</script>
