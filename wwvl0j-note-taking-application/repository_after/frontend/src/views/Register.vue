<script setup lang="ts">
import { ref } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "vue-router";

const email = ref("");
const password = ref("");
const error = ref("");
const authStore = useAuthStore();
const router = useRouter();

const handleSubmit = async () => {
  try {
    await authStore.register({ email: email.value, password: password.value });
    // Auto login after register
    const formData = new FormData();
    formData.append("username", email.value);
    formData.append("password", password.value);
    await authStore.login(formData);
    router.push("/");
  } catch (e: any) {
    if (e.response && e.response.status === 400) {
      error.value = "Email already registered";
    } else {
      error.value = "Registration failed";
    }
  }
};
</script>

<template>
  <div
    class="flex min-h-full items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
  >
    <div class="w-full max-w-md space-y-8">
      <div>
        <h2
          class="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900"
        >
          Create your account
        </h2>
      </div>
      <form class="mt-8 space-y-6" @submit.prevent="handleSubmit">
        <div class="-space-y-px rounded-md shadow-sm">
          <div>
            <label for="email-address" class="sr-only">Email address</label>
            <input
              id="email-address"
              name="email"
              type="email"
              autocomplete="email"
              required
              v-model="email"
              class="relative block w-full rounded-t-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 pl-2"
              placeholder="Email address"
            />
          </div>
          <div>
            <label for="password" class="sr-only">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autocomplete="new-password"
              required
              v-model="password"
              class="relative block w-full rounded-b-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 pl-2"
              placeholder="Password"
            />
          </div>
        </div>

        <div v-if="error" class="text-red-500 text-sm text-center">
          {{ error }}
        </div>

        <div>
          <button
            type="submit"
            class="group relative flex w-full justify-center rounded-md bg-indigo-600 py-2 px-3 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Sign up
          </button>
        </div>
        <div class="text-center">
          <router-link to="/login" class="text-indigo-600 hover:text-indigo-500"
            >Already have an account? Sign in</router-link
          >
        </div>
      </form>
    </div>
  </div>
</template>
