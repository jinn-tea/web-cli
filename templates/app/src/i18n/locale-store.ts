import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SOURCE_LOCALE, isLocale, type Locale } from "./locales";

/**
 * Locale is client state (there is no URL locale routing). It is persisted so a
 * reload keeps the user's language, and synced from the signed-in user's
 * profile on login.
 */
interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: SOURCE_LOCALE,
      setLocale: (locale) => set({ locale }),
    }),
    { name: "locale" },
  ),
);

/**
 * Read the active locale from NON-React code (the HTTP transport's
 * `Accept-Language` header, formatters, validators). Reading the store outside
 * React is the whole reason this exists — never duplicate the storage key.
 */
export function getLocale(): Locale {
  const { locale } = useLocaleStore.getState();
  return isLocale(locale) ? locale : SOURCE_LOCALE;
}
