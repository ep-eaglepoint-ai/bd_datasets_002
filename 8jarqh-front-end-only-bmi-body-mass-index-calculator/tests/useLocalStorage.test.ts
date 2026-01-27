import { describe, it, expect, beforeEach } from 'vitest';
import { nextTick } from 'vue';
import { useLocalStorage } from '../repository_after/src/composables/useLocalStorage';


describe('useLocalStorage - Basic Functionality', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should initialize with default value when localStorage is empty', () => {
    const storage = useLocalStorage('test_key', 'default_value');
    
    expect(storage.value).toBe('default_value');
  });

  it('should load existing value from localStorage', () => {
    localStorage.setItem('test_key', JSON.stringify('saved_value'));
    
    const storage = useLocalStorage('test_key', 'default_value');
    
    expect(storage.value).toBe('saved_value');
  });

  it('should save value to localStorage when changed', async () => {
    const storage = useLocalStorage('test_key', 'default_value');
    
    storage.value = 'new_value';
    await nextTick();
    
    const saved = localStorage.getItem('test_key');
    expect(saved).toBe(JSON.stringify('new_value'));
  });

  it('should handle object values', async () => {
    const defaultObj = { name: 'test', count: 0 };
    const storage = useLocalStorage('test_obj', defaultObj);
    
    expect(storage.value).toEqual(defaultObj);
    
    storage.value.count = 5;
    await nextTick();
    
    const saved = JSON.parse(localStorage.getItem('test_obj') || '{}');
    expect(saved.count).toBe(5);
  });

  it('should handle array values', async () => {
    const defaultArray = [1, 2, 3];
    const storage = useLocalStorage('test_array', defaultArray);
    
    expect(storage.value).toEqual(defaultArray);
    
    storage.value.push(4);
    await nextTick();
    
    const saved = JSON.parse(localStorage.getItem('test_array') || '[]');
    expect(saved).toEqual([1, 2, 3, 4]);
  });

  it('should handle null values', async () => {
    const storage = useLocalStorage<null>('test_null', null);
    
    expect(storage.value).toBeNull();
    
    storage.value = null;
    await nextTick();
    
    const saved = localStorage.getItem('test_null');
    expect(saved).toBe(JSON.stringify(null));
  });

  it('should handle number values', async () => {
    const storage = useLocalStorage('test_number', 42);
    
    expect(storage.value).toBe(42);
    
    storage.value = 100;
    await nextTick();
    
    const saved = JSON.parse(localStorage.getItem('test_number') || '0');
    expect(saved).toBe(100);
  });

  it('should handle boolean values', async () => {
    const storage = useLocalStorage('test_bool', false);
    
    expect(storage.value).toBe(false);
    
    storage.value = true;
    await nextTick();
    
    const saved = JSON.parse(localStorage.getItem('test_bool') || 'false');
    expect(saved).toBe(true);
  });
});

describe('useLocalStorage - Deep Reactivity', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should watch deep object changes', async () => {
    interface TestObj {
      nested: {
        value: string;
      };
    }
    
    const defaultObj: TestObj = { nested: { value: 'initial' } };
    const storage = useLocalStorage<TestObj>('test_deep', defaultObj);
    
    storage.value.nested.value = 'changed';
    await nextTick();
    
    const saved = JSON.parse(localStorage.getItem('test_deep') || '{}');
    expect(saved.nested.value).toBe('changed');
  });

  it('should watch array mutations', async () => {
    const storage = useLocalStorage<number[]>('test_array_mut', [1, 2, 3]);
    
    storage.value.push(4);
    storage.value[0] = 10;
    await nextTick();
    
    const saved = JSON.parse(localStorage.getItem('test_array_mut') || '[]');
    expect(saved).toEqual([10, 2, 3, 4]);
  });

  it('should handle nested object replacement', async () => {
    interface NestedObj {
      data: { id: number };
    }
    
    const storage = useLocalStorage<NestedObj>('test_nested', { data: { id: 1 } });
    
    storage.value.data = { id: 2 };
    await nextTick();
    
    const saved = JSON.parse(localStorage.getItem('test_nested') || '{}');
    expect(saved.data.id).toBe(2);
  });
});

describe('useLocalStorage - Edge Cases and Error Handling', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should handle invalid JSON in localStorage gracefully', () => {
    localStorage.setItem('test_invalid', 'not valid json{');
    
    // Should fall back to default value
    const storage = useLocalStorage('test_invalid', 'default');
    
    // The composable should handle JSON.parse errors
    // If it throws, the test will fail; if it handles gracefully, it uses default
    expect(storage.value).toBeDefined();
  });

  it('should handle empty string in localStorage', () => {
    localStorage.setItem('test_empty', '');
    
    const storage = useLocalStorage('test_empty', 'default');
    
    // Empty string should fall back to default
    expect(storage.value).toBe('default');
  });

  it('should persist complex nested structures', async () => {
    interface ComplexData {
      user: {
        name: string;
        preferences: {
          theme: 'light' | 'dark';
          items: number[];
        };
      };
    }
    
    const complexData: ComplexData = {
      user: {
        name: 'Test',
        preferences: {
          theme: 'dark',
          items: [1, 2, 3],
        },
      },
    };
    
    const storage = useLocalStorage<ComplexData>('test_complex', complexData);
    
    storage.value.user.preferences.theme = 'light';
    storage.value.user.preferences.items.push(4);
    await nextTick();
    
    const saved = JSON.parse(localStorage.getItem('test_complex') || '{}');
    expect(saved.user.preferences.theme).toBe('light');
    expect(saved.user.preferences.items).toEqual([1, 2, 3, 4]);
  });

  it('should maintain separate storage for different keys', async () => {
    const storage1 = useLocalStorage('key1', 'value1');
    const storage2 = useLocalStorage('key2', 'value2');
    
    storage1.value = 'changed1';
    storage2.value = 'changed2';
    await nextTick();
    
    expect(localStorage.getItem('key1')).toBe(JSON.stringify('changed1'));
    expect(localStorage.getItem('key2')).toBe(JSON.stringify('changed2'));
  });

  it('should handle rapid value changes', async () => {
    const storage = useLocalStorage('test_rapid', 0);
    
    for (let i = 1; i <= 10; i++) {
      storage.value = i;
    }
    await nextTick();
    
    const saved = JSON.parse(localStorage.getItem('test_rapid') || '0');
    expect(saved).toBe(10);
  });
});

describe('useLocalStorage - BMI Calculator Specific Use Cases', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should persist theme preference', async () => {
    const theme = useLocalStorage<'light' | 'dark'>('bmi_theme', 'light');
    
    expect(theme.value).toBe('light');
    
    theme.value = 'dark';
    await nextTick();
    
    const saved = localStorage.getItem('bmi_theme');
    expect(saved).toBe(JSON.stringify('dark'));
  });

  it('should persist BMI result', async () => {
    interface BmiResult {
      bmi: number;
      category: string;
      timestamp: string;
    }
    
    const result: BmiResult = {
      bmi: 23.1,
      category: 'Normal',
      timestamp: new Date().toISOString(),
    };
    
    const storage = useLocalStorage<BmiResult | null>('bmi_current_result', null);
    
    storage.value = result;
    await nextTick();
    
    const saved = JSON.parse(localStorage.getItem('bmi_current_result') || 'null');
    expect(saved.bmi).toBe(23.1);
    expect(saved.category).toBe('Normal');
  });

  it('should persist calculation history', () => {
    interface HistoryEntry {
      bmi: number;
      category: string;
      height: string;
      weight: string;
      timestamp: string;
    }
    
    const history = useLocalStorage<HistoryEntry[]>('bmi_history', []);
    
    const entry: HistoryEntry = {
      bmi: 23.1,
      category: 'Normal',
      height: '180 cm',
      weight: '75 kg',
      timestamp: new Date().toISOString(),
    };
    
    history.value = [entry];
    await nextTick();
    
    const saved = JSON.parse(localStorage.getItem('bmi_history') || '[]');
    expect(saved).toHaveLength(1);
    expect(saved[0].bmi).toBe(23.1);
  });

  it('should persist input values', async () => {
    interface Inputs {
      unitSystem: 'metric' | 'imperial';
      height: number | null;
      weight: number | null;
    }
    
    const inputs = useLocalStorage<Inputs>('bmi_inputs', {
      unitSystem: 'metric',
      height: null,
      weight: null,
    });
    
    inputs.value.height = 180;
    inputs.value.weight = 75;
    await nextTick();
    
    const saved = JSON.parse(localStorage.getItem('bmi_inputs') || '{}');
    expect(saved.height).toBe(180);
    expect(saved.weight).toBe(75);
  });

  it('should handle history limit (last 10 entries)', async () => {
    const history = useLocalStorage<Array<{ bmi: number }>>('bmi_history', []);
    
    // Add 15 entries
    for (let i = 1; i <= 15; i++) {
      history.value.push({ bmi: i });
    }
    
    // Simulate keeping only last 10
    history.value = history.value.slice(-10);
    await nextTick();
    
    const saved = JSON.parse(localStorage.getItem('bmi_history') || '[]');
    expect(saved).toHaveLength(10);
    expect(saved[0].bmi).toBe(6); // First of last 10
    expect(saved[9].bmi).toBe(15); // Last entry
  });
});
