<template>
  <div class="min-h-screen bg-slate-100 text-slate-900">
    <div class="flex min-h-screen">
      <AppSidebar />
      <div class="flex w-full flex-1 flex-col">
        <AppHeader />
        <main class="flex-1 px-4 pb-10 pt-6 sm:px-6 lg:px-10">
          <slot />
        </main>
      </div>
    </div>
    <ToastContainer />
    <ConfirmDialog />
  </div>
</template>
