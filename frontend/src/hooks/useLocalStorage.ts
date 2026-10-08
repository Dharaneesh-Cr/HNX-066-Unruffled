import { useEffect, useState } from 'react'

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const storedValue = window.localStorage.getItem(key)
      return storedValue === null ? initialValue : (JSON.parse(storedValue) as T)
    } catch (error) {
      console.error(`Unable to read local storage key "${key}".`, error)
      return initialValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error(`Unable to save local storage key "${key}".`, error)
    }
  }, [key, value])

  return [value, setValue] as const
}
