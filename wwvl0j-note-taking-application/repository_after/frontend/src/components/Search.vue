<script setup lang="ts">
import { ref, watch } from "vue";
import { useNotesStore } from "@/stores/notes";
import { MagnifyingGlassIcon } from "@heroicons/vue/20/solid";
import { debounce } from "lodash";

const notesStore = useNotesStore();
const query = ref("");

const doSearch = debounce((q: string) => {
  notesStore.fetchNotes(notesStore.currentNotebookId, q);
}, 300);

watch(query, (newVal) => {
  doSearch(newVal);
});
</script>

<template>
  <div class="relative">
    <div
      class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"
    >
      <MagnifyingGlassIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
    </div>
    <input
      v-model="query"
      type="text"
      name="search"
      id="search"
      class="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
      placeholder="Search notes..."
    />
  </div>
</template>
