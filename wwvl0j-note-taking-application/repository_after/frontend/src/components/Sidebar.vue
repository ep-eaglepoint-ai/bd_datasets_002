<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useNotesStore } from "@/stores/notes";
import { useAuthStore } from "@/stores/auth";
import {
  PlusIcon,
  TrashIcon,
  FolderIcon,
  DocumentIcon,
  ArrowLeftOnRectangleIcon,
} from "@heroicons/vue/24/outline";

const notesStore = useNotesStore();
const authStore = useAuthStore();
const newNotebookName = ref("");
const showNewNotebookInput = ref(false);

onMounted(async () => {
  await notesStore.fetchNotebooks();
  // Optionally fetch all notes initially or create an "All Notes" view
});

const createNotebook = async () => {
  if (newNotebookName.value.trim()) {
    await notesStore.createNotebook(newNotebookName.value);
    newNotebookName.value = "";
    showNewNotebookInput.value = false;
  }
};

const deleteNotebook = async (id: number) => {
  if (confirm("Are you sure? All notes in this notebook will be lost.")) {
    await notesStore.deleteNotebook(id);
  }
};
</script>

<template>
  <div class="flex h-full flex-col bg-gray-900 w-64 text-white">
    <div class="p-4 border-b border-gray-700 flex justify-between items-center">
      <h1 class="text-xl font-bold">MarkNote</h1>
      <button
        @click="authStore.logout()"
        class="text-gray-400 hover:text-white"
        title="Logout"
      >
        <ArrowLeftOnRectangleIcon class="h-5 w-5" />
      </button>
    </div>

    <div class="flex-1 overflow-y-auto">
      <div class="p-2">
        <div
          @click="notesStore.selectNotebook(null)"
          class="group flex items-center rounded-md px-2 py-2 text-sm font-medium hover:bg-gray-700 cursor-pointer"
          :class="{ 'bg-gray-800': notesStore.currentNotebookId === null }"
        >
          <FolderIcon class="mr-3 h-6 w-6 flex-shrink-0 text-gray-400" />
          All Notes
        </div>

        <div class="mt-4">
          <div class="flex justify-between px-2 mb-2">
            <h3 class="text-xs font-semibold uppercase text-gray-400">
              Notebooks
            </h3>
            <button
              @click="showNewNotebookInput = !showNewNotebookInput"
              class="text-gray-400 hover:text-white"
            >
              <PlusIcon class="h-4 w-4" />
            </button>
          </div>

          <div v-if="showNewNotebookInput" class="px-2 mb-2">
            <input
              v-model="newNotebookName"
              @keyup.enter="createNotebook"
              type="text"
              class="w-full rounded bg-gray-800 px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Notebook Name..."
              autofocus
            />
          </div>

          <div
            v-for="notebook in notesStore.notebooks"
            :key="notebook.id"
            class="space-y-1"
          >
            <div
              @click="notesStore.selectNotebook(notebook.id)"
              class="group flex items-center justify-between rounded-md px-2 py-2 text-sm font-medium hover:bg-gray-700 cursor-pointer"
              :class="{
                'bg-gray-800': notesStore.currentNotebookId === notebook.id,
              }"
            >
              <div class="flex items-center truncate">
                <DocumentIcon
                  class="mr-3 h-5 w-5 flex-shrink-0 text-gray-500"
                />
                {{ notebook.name }}
              </div>
              <button
                @click.stop="deleteNotebook(notebook.id)"
                class="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400"
              >
                <TrashIcon class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
