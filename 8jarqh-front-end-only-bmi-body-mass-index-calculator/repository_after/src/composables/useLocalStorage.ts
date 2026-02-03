import { ref, watch } from 'vue'

export function useLocalStorage<T>(key: string, defaultValue: T) {
  let parsedValue: T = defaultValue
  let hasStoredValue = false
  
  try {
    const storedValue = localStorage.getItem(key)
    if (storedValue !== null && storedValue !== '') {
      parsedValue = JSON.parse(storedValue)
      hasStoredValue = true
    }
  } catch (error) {
    // If JSON.parse fails, use default value
    parsedValue = defaultValue
  }
  
  const data = ref<T>(parsedValue)

  // Persist initial value if it wasn't in localStorage
  if (!hasStoredValue) {
    localStorage.setItem(key, JSON.stringify(defaultValue))
  }

  watch(
    data,
    (newValue) => {
      localStorage.setItem(key, JSON.stringify(newValue))
    },
    { deep: true }
  )

  return data
}
