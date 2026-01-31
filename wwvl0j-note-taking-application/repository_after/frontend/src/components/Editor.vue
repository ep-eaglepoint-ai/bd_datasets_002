<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useNotesStore } from "@/stores/notes";
import { marked } from "marked";
import DOMPurify from "dompurify";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css"; // Or any other style
import { debounce } from "lodash";

// Configure marked to use highlight.js
marked.setOptions({
  highlight: function (code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  },
});

const notesStore = useNotesStore();

const title = ref("");
const content = ref("");

// Initialize local state when currentNote changes
watch(
  () => notesStore.currentNote,
  (newNote) => {
    if (newNote) {
      title.value = newNote.title;
      content.value = newNote.content || "";
    } else {
      title.value = "";
      content.value = "";
    }
  },
  { immediate: true },
);

const renderedContent = computed(() => {
  return DOMPurify.sanitize(marked(content.value) as string);
});

const autoSave = debounce(async () => {
  if (notesStore.currentNote) {
    await notesStore.updateNote(notesStore.currentNote.id, {
      title: title.value,
      content: content.value,
    });
  }
}, 1000); // 1 second debounce as per requirements

watch([title, content], () => {
  if (notesStore.currentNote) {
    // Optimistically update store currentNote to prevent flickering if user switches quickly,
    // though store update happens on debounce.
    // Actually, we should probably trigger autoSave here.
    autoSave();
  }
});
</script>

<template>
  <div class="flex flex-col h-full bg-white relative">
    <div
      v-if="!notesStore.currentNote"
      class="flex items-center justify-center h-full text-gray-400"
    >
      Select a note or create a new one
    </div>
    <div v-else class="flex flex-col h-full">
      <div
        class="border-b border-gray-200 p-4 flex items-center justify-between gap-4"
      >
        <input
          v-model="title"
          type="text"
          class="block flex-1 border-0 text-xl font-semibold text-gray-900 placeholder:text-gray-400 focus:ring-0 min-w-0"
          placeholder="Note Title"
        />

        <div class="flex items-center gap-2">
          <select
            v-if="notesStore.currentNote"
            :value="notesStore.currentNote.notebook_id"
            @change="
              (e) =>
                notesStore.updateNote(notesStore.currentNote!.id, {
                  notebook_id: parseInt((e.target as HTMLSelectElement).value),
                })
            "
            class="block rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
          >
            <option
              v-for="nb in notesStore.notebooks"
              :key="nb.id"
              :value="nb.id"
            >
              {{ nb.name }}
            </option>
          </select>

          <div class="text-xs text-gray-500 w-16 text-right">
            <span v-if="notesStore.saving" class="text-orange-500"
              >Saving...</span
            >
            <span v-else class="text-green-600">Saved</span>
          </div>
        </div>
      </div>

      <div class="flex-1 flex overflow-hidden">
        <!-- Editor Pane -->
        <div class="w-1/2 h-full border-r border-gray-200">
          <textarea
            v-model="content"
            class="block w-full h-full border-0 p-4 font-mono text-sm text-gray-900 placeholder:text-gray-400 focus:ring-0 resize-none selection:bg-indigo-100"
            placeholder="Write your note in Markdown..."
          ></textarea>
        </div>

        <!-- Preview Pane -->
        <div
          class="w-1/2 h-full overflow-y-auto bg-gray-50 p-4 prose prose-indigo max-w-none dark:prose-invert"
          v-html="renderedContent"
        ></div>
      </div>
    </div>
  </div>
</template>

<style>
/* Add some basic prose styling fixes if tailwind/typography isn't perfect out of box */
.prose pre {
  background-color: #0d1117;
}
</style>
