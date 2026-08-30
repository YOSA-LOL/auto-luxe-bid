import { useEffect, useState } from "react";

const GUEST_KEY = "apexauto_guest_mode";

export function useGuestMode() {
  const [ready, setReady] = useState(false);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    try {
      setIsGuest(localStorage.getItem(GUEST_KEY) === "true");
    } catch {
      setIsGuest(false);
    }
    setReady(true);
  }, []);

  const continueAsGuest = () => {
    try {
      localStorage.setItem(GUEST_KEY, "true");
    } catch {}
    setIsGuest(true);
  };

  return { ready, isGuest, continueAsGuest };
}
