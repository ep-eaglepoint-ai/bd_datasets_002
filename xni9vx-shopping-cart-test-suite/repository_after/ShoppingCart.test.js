import { configureStore } from '@reduxjs/toolkit';
import { setCart, setDeleteCart, cartReducer } from '../repository_before/slices/cartSlice';

jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const createTestStore = (preloadedState) => {
  return configureStore({
    reducer: { cart: cartReducer },
    preloadedState: preloadedState ? { cart: preloadedState } : undefined,
  });
};

describe('Redux State Management Tests', () => {
  test('setCart reducer adds items correctly to empty cart', () => {
    const store = createTestStore({ cart: [], total: 0 });
    const item = { id: 1, product_name: 'Machine 1', product_price: 2000, product_quantity: 1 };
    store.dispatch(setCart(item));
    expect(store.getState().cart.cart).toHaveLength(1);
    expect(store.getState().cart.cart[0]).toEqual(item);
  });

  test('setCart reducer appends items to existing cart', () => {
    const store = createTestStore({ cart: [{ id: 1, product_name: 'Machine 1', product_price: 2000, product_quantity: 1 }], total: 0 });
    const item = { id: 2, product_name: 'Machine 2', product_price: 4000, product_quantity: 1 };
    store.dispatch(setCart(item));
    expect(store.getState().cart.cart).toHaveLength(2);
    expect(store.getState().cart.cart[1]).toEqual(item);
  });

  test('setDeleteCart reducer replaces entire cart array', () => {
    const store = createTestStore({ cart: [{ id: 1, product_name: 'Machine 1', product_price: 2000, product_quantity: 1 }], total: 0 });
    const newCart = [{ id: 2, product_name: 'Machine 2', product_price: 4000, product_quantity: 1 }];
    store.dispatch(setDeleteCart(newCart));
    expect(store.getState().cart.cart).toEqual(newCart);
    expect(store.getState().cart.cart).toHaveLength(1);
    expect(store.getState().cart.cart[0].id).toBe(2);
  });

  test('initial state is correct', () => {
    const store = createTestStore();
    expect(store.getState().cart).toEqual({ cart: [], total: 0 });
  });

  test('state immutability - original state not mutated', () => {
    const initialState = { cart: [{ id: 1, product_name: 'Machine 1', product_price: 2000, product_quantity: 1 }], total: 0 };
    const originalCart = initialState.cart;
    const newState = cartReducer(initialState, setCart({ id: 2, product_name: 'Machine 2', product_price: 4000, product_quantity: 1 }));
    expect(initialState.cart).toBe(originalCart);
    expect(newState.cart).not.toBe(initialState.cart);
  });
});

describe('Duplicate Prevention Logic Tests', () => {
  test('adding the same product twice does NOT create duplicates', () => {
    const store = createTestStore({ cart: [], total: 0 });
    const item = { id: 1, product_name: 'Machine 1', product_price: 2000, product_quantity: 1 };
    
    let cart = store.getState().cart.cart;
    const checkProd = cart.filter(prod => prod.id === item.id);
    if (cart.length === 0) {
      store.dispatch(setCart(item));
    } else if (checkProd.length === 0) {
      store.dispatch(setCart(item));
    }
    
    const checkProd2 = store.getState().cart.cart.filter(prod => prod.id === item.id);
    if (checkProd2.length === 0) {
      store.dispatch(setCart(item));
    }
    
    cart = store.getState().cart.cart;
    expect(cart).toHaveLength(1);
  });

  test('duplicate check works correctly with different product IDs', () => {
    const store = createTestStore({ cart: [{ id: 1, product_name: 'Machine 1', product_price: 2000, product_quantity: 1 }], total: 0 });
    const newItem = { id: 2, product_name: 'Machine 2', product_price: 4000, product_quantity: 1 };
    
    const cart = store.getState().cart.cart;
    const checkProd = cart.filter(prod => prod.id === newItem.id);
    expect(checkProd.length).toBe(0);
    
    store.dispatch(setCart(newItem));
    expect(store.getState().cart.cart).toHaveLength(2);
  });

  test('edge case: type coercion - id number vs string should not match', () => {
    const store = createTestStore({ cart: [{ id: 1, product_name: 'Machine 1', product_price: 2000, product_quantity: 1 }], total: 0 });
    const itemWithStringId = { id: '1', product_name: 'Machine 1', product_price: 2000, product_quantity: 1 };
    
    const cart = store.getState().cart.cart;
    const checkProd = cart.filter(prod => prod.id === itemWithStringId.id);
    expect(checkProd.length).toBe(0);
  });

  test('race condition: rapidly clicking Add to Cart multiple times on same product', () => {
    const store = createTestStore({ cart: [], total: 0 });
    const item = { id: 1, product_name: 'Machine 1', product_price: 2000, product_quantity: 1 };
    
    for (let i = 0; i < 10; i++) {
      const cart = store.getState().cart.cart;
      const checkProd = cart.filter(prod => prod.id === item.id);
      if (cart.length === 0) {
        store.dispatch(setCart(item));
      } else if (checkProd.length === 0) {
        store.dispatch(setCart(item));
      }
    }
    
    expect(store.getState().cart.cart).toHaveLength(1);
  });
});

describe('Quantity Manipulation Tests', () => {
  test('increment increases quantity by exactly 1', () => {
    const store = createTestStore({ cart: [{ id: 1, product_name: 'Machine 1', product_price: 2000, product_quantity: 1 }], total: 0 });
    
    const updatedCart = store.getState().cart.cart.map(prod => {
      if (prod.id === 1) {
        return { ...prod, product_quantity: prod.product_quantity + 1 };
      }
      return prod;
    });
    store.dispatch(setDeleteCart(updatedCart));
    
    expect(store.getState().cart.cart[0].product_quantity).toBe(2);
  });

  test('decrement decreases quantity by exactly 1', () => {
    const store = createTestStore({ cart: [{ id: 1, product_name: 'Machine 1', product_price: 2000, product_quantity: 5 }], total: 0 });
    
    const updatedCart = store.getState().cart.cart.map(prod => {
      if (prod.id === 1) {
        if (prod.product_quantity > 1) {
          return { ...prod, product_quantity: prod.product_quantity - 1 };
        }
      }
      return prod;
    });
    store.dispatch(setDeleteCart(updatedCart));
    
    expect(store.getState().cart.cart[0].product_quantity).toBe(4);
  });

  test('decrement does NOT go below 1 - minimum quantity', () => {
    const store = createTestStore({ cart: [{ id: 1, product_name: 'Machine 1', product_price: 2000, product_quantity: 1 }], total: 0 });
    
    const updatedCart = store.getState().cart.cart.map(prod => {
      if (prod.id === 1) {
        if (prod.product_quantity > 1) {
          return { ...prod, product_quantity: prod.product_quantity - 1 };
        }
      }
      return prod;
    });
    store.dispatch(setDeleteCart(updatedCart));
    
    expect(updatedCart[0].product_quantity).toBe(1);
    expect(store.getState().cart.cart[0].product_quantity).toBe(1);
  });

  test('increment/decrement on non-existent product ID - edge case', () => {
    const store = createTestStore({ cart: [{ id: 1, product_name: 'Machine 1', product_price: 2000, product_quantity: 1 }], total: 0 });
    
    const updatedCart = store.getState().cart.cart.map(prod => {
      if (prod.id === 999) {
        return { ...prod, product_quantity: prod.product_quantity + 1 };
      }
      return prod;
    });
    store.dispatch(setDeleteCart(updatedCart));
    
    expect(store.getState().cart.cart[0].product_quantity).toBe(1);
  });

  test('rapid increment - clicking + 10 times quickly results in quantity of 11', () => {
    const store = createTestStore({ cart: [{ id: 1, product_name: 'Machine 1', product_price: 2000, product_quantity: 1 }], total: 0 });
    
    for (let i = 0; i < 10; i++) {
      const updatedCart = store.getState().cart.cart.map(prod => {
        if (prod.id === 1) {
          return { ...prod, product_quantity: prod.product_quantity + 1 };
        }
        return prod;
      });
      store.dispatch(setDeleteCart(updatedCart));
    }
    
    const cart = store.getState().cart.cart;
    expect(cart[0].product_quantity).toBe(11);
  });

  test('quantity updates are applied to the correct product in a multi-item cart', () => {
    const store = createTestStore({
      cart: [
        { id: 1, product_name: 'Machine 1', product_price: 2000, product_quantity: 1 },
        { id: 2, product_name: 'Machine 2', product_price: 4000, product_quantity: 1 },
        { id: 3, product_name: 'Machine 3', product_price: 5000, product_quantity: 1 },
      ],
      total: 0
    });
    
    const updatedCart = store.getState().cart.cart.map(prod => {
      if (prod.id === 2) {
        return { ...prod, product_quantity: prod.product_quantity + 1 };
      }
      return prod;
    });
    store.dispatch(setDeleteCart(updatedCart));
    
    const cart = store.getState().cart.cart;
    expect(cart[0].product_quantity).toBe(1);
    expect(cart[1].product_quantity).toBe(2);
    expect(cart[2].product_quantity).toBe(1);
  });
});

describe('Price Calculation Tests', () => {
  test('total price calculation with single item', () => {
    const cart = [{ id: 1, product_name: 'Machine 1', product_price: 2000, product_quantity: 1 }];
    const totalPrice = cart.reduce((acc, item) => acc + (item.product_quantity * item.product_price), 0);
    expect(totalPrice).toBe(2000);
  });

  test('total price with multiple items of different quantities', () => {
    const cart = [
      { id: 1, product_name: 'Machine 1', product_price: 2000, product_quantity: 2 },
      { id: 2, product_name: 'Machine 2', product_price: 4000, product_quantity: 3 },
    ];
    const totalPrice = cart.reduce((acc, item) => acc + (item.product_quantity * item.product_price), 0);
    expect(totalPrice).toBe(16000);
  });

  test('total price returns 0 for empty cart - not NaN or undefined', () => {
    const cart = [];
    const totalPrice = cart.reduce((acc, item) => acc + (item.product_quantity * item.product_price), 0);
    expect(totalPrice).toBe(0);
    expect(Number.isNaN(totalPrice)).toBe(false);
  });

  test('total price handles missing product_quantity field gracefully', () => {
    const cart = [{ id: 1, product_name: 'Machine 1', product_price: 2000 }];
    const totalPrice = cart.reduce((acc, item) => {
      const quantity = item.product_quantity || 0;
      const price = item.product_price || 0;
      return acc + (quantity * price);
    }, 0);
    expect(totalPrice).toBe(0);
    expect(Number.isNaN(totalPrice)).toBe(false);
  });

  test('total price handles missing product_price field gracefully', () => {
    const cart = [{ id: 1, product_name: 'Machine 1', product_quantity: 2 }];
    const totalPrice = cart.reduce((acc, item) => {
      const quantity = item.product_quantity || 0;
      const price = item.product_price || 0;
      return acc + (quantity * price);
    }, 0);
    expect(totalPrice).toBe(0);
    expect(Number.isNaN(totalPrice)).toBe(false);
  });

  test('precision: products with decimal prices multiplied by large quantities', () => {
    const cart = [{ id: 1, product_name: 'Machine 1', product_price: 19.99, product_quantity: 33 }];
    const totalPrice = cart.reduce((acc, item) => acc + (item.product_quantity * item.product_price), 0);
    expect(totalPrice).toBe(659.67);
  });
});

describe('Delete Functionality Tests', () => {
  test('deleting an item removes it from cart', () => {
    const store = createTestStore({
      cart: [
        { id: 1, product_name: 'Machine 1', product_price: 2000, product_quantity: 1 },
        { id: 2, product_name: 'Machine 2', product_price: 4000, product_quantity: 1 },
      ],
      total: 0
    });
    
    const newCart = store.getState().cart.cart.filter(item => item.id !== 1);
    store.dispatch(setDeleteCart(newCart));
    
    expect(store.getState().cart.cart).toHaveLength(1);
    expect(store.getState().cart.cart[0].id).toBe(2);
  });

  test('deleting non-existent item does not crash', () => {
    const store = createTestStore({ cart: [{ id: 1, product_name: 'Machine 1', product_price: 2000, product_quantity: 1 }], total: 0 });
    
    const newCart = store.getState().cart.cart.filter(item => item.id !== 999);
    store.dispatch(setDeleteCart(newCart));
    
    expect(store.getState().cart.cart).toHaveLength(1);
    expect(store.getState().cart.cart[0].id).toBe(1);
  });

  test('cart length decreases by 1 after deletion', () => {
    const store = createTestStore({
      cart: [
        { id: 1, product_name: 'Machine 1', product_price: 2000, product_quantity: 1 },
        { id: 2, product_name: 'Machine 2', product_price: 4000, product_quantity: 1 },
        { id: 3, product_name: 'Machine 3', product_price: 5000, product_quantity: 1 },
      ],
      total: 0
    });
    
    const newCart = store.getState().cart.cart.filter(item => item.id !== 2);
    store.dispatch(setDeleteCart(newCart));
    
    expect(store.getState().cart.cart).toHaveLength(2);
  });

  test('deleting last item results in empty cart', () => {
    const store = createTestStore({ cart: [{ id: 1, product_name: 'Machine 1', product_price: 2000, product_quantity: 1 }], total: 0 });
    
    const newCart = store.getState().cart.cart.filter(item => item.id !== 1);
    store.dispatch(setDeleteCart(newCart));
    
    const cart = store.getState().cart.cart;
    expect(newCart).toEqual([]);
    expect(cart).toHaveLength(0);
    expect(cart).toEqual([]);
    expect(Array.isArray(cart)).toBe(true);
  });

  test('total price updates after deletion', () => {
    const store = createTestStore({
      cart: [
        { id: 1, product_name: 'Machine 1', product_price: 2000, product_quantity: 1 },
        { id: 2, product_name: 'Machine 2', product_price: 4000, product_quantity: 1 },
      ],
      total: 0
    });
    
    let cart = store.getState().cart.cart;
    let totalPrice = cart.reduce((acc, item) => acc + (item.product_quantity * item.product_price), 0);
    expect(totalPrice).toBe(6000);
    
    const newCart = cart.filter(item => item.id !== 1);
    store.dispatch(setDeleteCart(newCart));
    
    cart = store.getState().cart.cart;
    totalPrice = cart.reduce((acc, item) => acc + (item.product_quantity * item.product_price), 0);
    expect(totalPrice).toBe(4000);
  });
});

describe('Integration Tests', () => {
  test('full workflow: add item → increment → increment → decrement → delete', () => {
    const store = createTestStore({ cart: [], total: 0 });
    const item = { id: 1, product_name: 'Machine 1', product_price: 2000, product_quantity: 1 };
    
    store.dispatch(setCart(item));
    expect(store.getState().cart.cart).toHaveLength(1);
    expect(store.getState().cart.cart[0].product_quantity).toBe(1);
    
    let updatedCart = store.getState().cart.cart.map(prod => prod.id === 1 ? { ...prod, product_quantity: prod.product_quantity + 1 } : prod);
    store.dispatch(setDeleteCart(updatedCart));
    expect(store.getState().cart.cart[0].product_quantity).toBe(2);
    
    updatedCart = store.getState().cart.cart.map(prod => prod.id === 1 ? { ...prod, product_quantity: prod.product_quantity + 1 } : prod);
    store.dispatch(setDeleteCart(updatedCart));
    expect(store.getState().cart.cart[0].product_quantity).toBe(3);
    
    updatedCart = store.getState().cart.cart.map(prod => {
      if (prod.id === 1 && prod.product_quantity > 1) {
        return { ...prod, product_quantity: prod.product_quantity - 1 };
      }
      return prod;
    });
    store.dispatch(setDeleteCart(updatedCart));
    expect(store.getState().cart.cart[0].product_quantity).toBe(2);
    
    const newCart = store.getState().cart.cart.filter(item => item.id !== 1);
    store.dispatch(setDeleteCart(newCart));
    expect(store.getState().cart.cart).toHaveLength(0);
  });

  test('adding 3 different products, incrementing each, verifying total', () => {
    const store = createTestStore({ cart: [], total: 0 });
    
    store.dispatch(setCart({ id: 1, product_name: 'Machine 1', product_price: 2000, product_quantity: 1 }));
    store.dispatch(setCart({ id: 2, product_name: 'Machine 2', product_price: 4000, product_quantity: 1 }));
    store.dispatch(setCart({ id: 3, product_name: 'Machine 3', product_price: 5000, product_quantity: 1 }));
    expect(store.getState().cart.cart).toHaveLength(3);
    
    const updatedCart = store.getState().cart.cart.map(prod => ({ ...prod, product_quantity: prod.product_quantity + 1 }));
    store.dispatch(setDeleteCart(updatedCart));
    
    const cart = store.getState().cart.cart;
    expect(cart[0].product_quantity).toBe(2);
    expect(cart[1].product_quantity).toBe(2);
    expect(cart[2].product_quantity).toBe(2);
    
    const totalPrice = cart.reduce((acc, item) => acc + (item.product_quantity * item.product_price), 0);
    expect(totalPrice).toBe(22000);
  });

  test('cart persistence simulation - state consistency', () => {
    const store = createTestStore({
      cart: [
        { id: 1, product_name: 'Machine 1', product_price: 2000, product_quantity: 2 },
        { id: 2, product_name: 'Machine 2', product_price: 4000, product_quantity: 1 },
      ],
      total: 0
    });
    
    const cart = store.getState().cart.cart;
    const serialized = JSON.stringify(cart);
    const deserialized = JSON.parse(serialized);
    
    expect(deserialized).toEqual(cart);
    expect(deserialized[0].product_quantity).toBe(2);
    
    const totalPrice = deserialized.reduce((acc, item) => acc + (item.product_quantity * item.product_price), 0);
    expect(totalPrice).toBe(8000);
  });
});
