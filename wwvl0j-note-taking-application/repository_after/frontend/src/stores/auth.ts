import { defineStore } from "pinia";
import axios from "axios";
import router from "@/router";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: localStorage.getItem("token") || "",
    user: null as any,
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
  },
  actions: {
    async login(formData: FormData) {
      try {
        const response = await axios.post(`${API_URL}/auth/token`, formData);
        this.token = response.data.access_token;
        localStorage.setItem("token", this.token);
        axios.defaults.headers.common["Authorization"] = `Bearer ${this.token}`;
        await this.fetchUser();
        return true;
      } catch (error) {
        console.error("Login failed", error);
        throw error;
      }
    },
    async register(userData: any) {
      try {
        await axios.post(`${API_URL}/auth/register`, userData);
        return true;
      } catch (error) {
        throw error;
      }
    },
    async fetchUser() {
      if (!this.token) return;
      try {
        axios.defaults.headers.common["Authorization"] = `Bearer ${this.token}`;
        const response = await axios.get(`${API_URL}/auth/me`);
        this.user = response.data;
      } catch (error) {
        this.logout();
      }
    },
    logout() {
      this.token = "";
      this.user = null;
      localStorage.removeItem("token");
      delete axios.defaults.headers.common["Authorization"];
      router.push("/login");
    },
  },
});
