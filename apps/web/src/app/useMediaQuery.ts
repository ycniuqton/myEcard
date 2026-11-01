import { useEffect, useState } from 'react'

/** Subscribes to a CSS media query and returns whether it matches. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => window.matchMedia(query).matches)

  useEffect(() => {
    const list = window.matchMedia(query)
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches)
    setMatches(list.matches)
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [query])

  return matches
}
