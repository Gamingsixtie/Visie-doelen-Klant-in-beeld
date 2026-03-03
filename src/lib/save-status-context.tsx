"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";

type SaveStatus = "idle" | "saving" | "saved";

interface SaveStatusContextType {
  status: SaveStatus;
  triggerSave: () => void;
}

const SaveStatusContext = createContext<SaveStatusContextType>({
  status: "idle",
  triggerSave: () => {}
});

export function SaveStatusProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerSave = useCallback(() => {
    // Clear any existing timer
    if (timerRef.current) clearTimeout(timerRef.current);

    setStatus("saving");

    // Show "saving" briefly, then "saved"
    timerRef.current = setTimeout(() => {
      setStatus("saved");

      // Return to idle after showing "saved"
      timerRef.current = setTimeout(() => {
        setStatus("idle");
      }, 2000);
    }, 300);
  }, []);

  return (
    <SaveStatusContext.Provider value={{ status, triggerSave }}>
      {children}
    </SaveStatusContext.Provider>
  );
}

export function useSaveStatus() {
  return useContext(SaveStatusContext);
}
