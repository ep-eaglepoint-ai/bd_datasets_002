<script setup lang="ts">
import Sidebar from "../components/Sidebar.vue";
import NoteList from "../components/NoteList.vue";
import Editor from "../components/Editor.vue";
import Search from "../components/Search.vue";
</script>

<template>
  <div class="flex h-screen w-screen overflow-hidden bg-white">
    <!-- First Pane: Notebooks Sidebar -->
    <Sidebar class="flex-shrink-0" />

    <!-- Second Pane: Notes List -->
    <div
      class="flex flex-col h-full border-r border-gray-200 flex-shrink-0 bg-white z-10 w-80"
    >
      <div class="p-2 border-b border-gray-200">
        <Search />
      </div>
      <NoteList class="flex-1 w-full border-none" />
    </div>

    <!-- Third Pane: Editor -->
    <div class="flex-1 h-full overflow-hidden">
      <Editor />
    </div>
  </div>
</template>
