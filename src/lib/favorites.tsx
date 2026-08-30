import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { getFavoritesForUser, addFavoriteInDb, removeFavoriteInDb } from "./favorites.server";

type FavoritesContextValue = {
  favorites: Set<string>;
  isFavorited: (id: string) => boolean;
  toggle: (id: string) => void;
  count: number;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

const STORAGE_KEY = "apexauto_favorites";

export function FavoritesProvider({ children, userId }: { children: ReactNode; userId?: string | null }) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const loadedForUser = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (loadedForUser.current === userId) return;
    loadedForUser.current = userId;

    if (userId) {
      getFavoritesForUser({ data: userId })
        .then((ids) => setFavorites(new Set(ids)))
        .catch(() => setFavorites(new Set()));
    } else {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        setFavorites(stored ? new Set(JSON.parse(stored) as string[]) : new Set());
      } catch {
        setFavorites(new Set());
      }
    }
  }, [userId]);

  const toggle = useCallback(
    (id: string) => {
      setFavorites((prev) => {
        const next = new Set(prev);
        const willAdd = !next.has(id);
        if (willAdd) {
          next.add(id);
        } else {
          next.delete(id);
        }

        if (userId) {
          if (willAdd) {
            addFavoriteInDb({ data: { userId, carId: id } }).catch(() => {});
          } else {
            removeFavoriteInDb({ data: { userId, carId: id } }).catch(() => {});
          }
        } else {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
          } catch {}
        }

        return next;
      });
    },
    [userId]
  );

  const isFavorited = useCallback((id: string) => favorites.has(id), [favorites]);

  return (
    <FavoritesContext.Provider value={{ favorites, isFavorited, toggle, count: favorites.size }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}
