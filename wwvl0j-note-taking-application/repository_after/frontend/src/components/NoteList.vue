<script setup lang="ts">
import { computed } from "vue";
import { useNotesStore } from "@/stores/notes";
import { PlusIcon, TrashIcon } from "@heroicons/vue/24/outline";
import { formatDistanceToNow } from "date-fns";

const notesStore = useNotesStore();

const notes = computed(() => notesStore.notes);

const createNote = async () => {
  if (notesStore.currentNotebookId) {
    await notesStore.createNote(notesStore.currentNotebookId);
  } else {
    alert("Please select a notebook first.");
  }
};

const formatDate = (dateStr: string) => {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch (e) {
    return "";
  }
};

const deleteNote = async (id: number) => {
  if (confirm("Delete this note?")) {
    await notesStore.deleteNote(id);
  }
};
</script>

<template>
  <div class="flex flex-col h-full bg-white border-r border-gray-200 w-80">
    <div
      class="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50"
    >
      <h2 class="text-lg font-semibold text-gray-700">Notes</h2>
      <button
        @click="createNote"
        class="text-gray-500 hover:text-indigo-600 disabled:opacity-50"
        :disabled="!notesStore.currentNotebookId"
        title="Create Note"
      >
        <PlusIcon class="h-6 w-6" />
      </button>
    </div>

    <div class="overflow-y-auto flex-1">
      <div v-if="notesStore.loading" class="p-4 text-center text-gray-400">
        Loading...
      </div>
      <div
        v-else-if="notes.length === 0"
        class="p-4 text-center text-gray-400 text-sm"
      >
        No notes found.
      </div>

      <div v-else class="divide-y divide-gray-100">
        <div
          v-for="note in notes"
          :key="note.id"
          @click="notesStore.selectNote(note)"
          class="p-4 cursor-pointer hover:bg-gray-50 transition-colors group relative"
          :class="{
            'bg-indigo-50 hover:bg-indigo-100':
              notesStore.currentNote?.id === note.id,
          }"
        >
          <h3 class="text-sm font-medium text-gray-900 truncate pr-6">
            {{ note.title || "Untitled" }}
          </h3>
          <p class="text-xs text-gray-500 mt-1 truncate">
            {{ note.content ? note.content.substring(0, 50) : "No content" }}
          </p>
          <p class="text-xs text-gray-400 mt-2">
            {{ formatDate(note.updated_at) }}
          </p>

          <button
            @click.stop="deleteNote(note.id)"
            class="absolute top-4 right-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500"
          >
            <TrashIcon class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
