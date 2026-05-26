import { useEffect, useState } from 'react';

/** Debounce a value for `delay` ms — fires after the user stops typing.
 *  Used by every admin list page to avoid hammering the backend on each
 *  keystroke. Default 300ms feels snappy without being chatty. */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
