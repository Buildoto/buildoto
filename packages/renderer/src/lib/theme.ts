export type ThemePreference = 'light' | 'dark' | 'system'

type EffectiveTheme = 'light' | 'dark'

const DARK_CLASS = 'dark'

export function getSystemTheme(): EffectiveTheme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function resolveEffective(pref: ThemePreference): EffectiveTheme {
  return pref === 'system' ? getSystemTheme() : pref
}

export function applyThemeClass(pref: ThemePreference): EffectiveTheme {
  const effective = resolveEffective(pref)
  const root = document.documentElement
  if (effective === 'dark') root.classList.add(DARK_CLASS)
  else root.classList.remove(DARK_CLASS)
  root.dataset.theme = effective
  return effective
}

export function subscribeSystemTheme(
  onChange: (theme: EffectiveTheme) => void,
): () => void {
  if (typeof window === 'undefined') return () => undefined
  const mql = window.matchMedia('(prefers-color-scheme: dark)')
  const listener = (e: MediaQueryListEvent) => onChange(e.matches ? 'dark' : 'light')
  mql.addEventListener('change', listener)
  return () => mql.removeEventListener('change', listener)
}
