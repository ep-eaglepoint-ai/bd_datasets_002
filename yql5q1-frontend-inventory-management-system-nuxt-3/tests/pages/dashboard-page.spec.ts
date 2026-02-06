import { mount } from "@vue/test-utils";
import DashboardPage from "~/pages/index.vue";
import { createPinia, setActivePinia } from "pinia";
import { useProductsStore } from "~/stores/products";

describe("DashboardPage", () => {
  it("renders dashboard and shows aggregate stats with low-stock alerts", () => {
    setActivePinia(createPinia());
    const store = useProductsStore();
    store.initialize([
      {
        id: "A",
        name: "Mouse",
        sku: "SKU-1",
        category: "Accessories",
        price: 25,
        stock: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "B",
        name: "Keyboard",
        sku: "SKU-2",
        category: "Accessories",
        price: 45,
        stock: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    const wrapper = mount(DashboardPage);
    expect(wrapper.text()).toContain("Dashboard");
    expect(wrapper.text()).toContain("Total Stock");
    expect(wrapper.text()).toContain("12");
    expect(wrapper.text()).toContain("Low Stock");
    expect(wrapper.text()).toContain("Mouse");
  });
});
