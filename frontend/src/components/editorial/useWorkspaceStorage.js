import { useEffect, useState } from "react";

// Browser preferences belong only to the illustrative workspace.
export function useWorkspaceStorage(key, initialValue, validate) {
  const [value, setValue] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("sift.demo." + key));
      return stored !== null && validate(stored) ? stored : initialValue;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("sift.demo." + key, JSON.stringify(value));
    } catch {
      /* Session state still works when storage is unavailable. */
    }
  }, [key, value]);
  return [value, setValue];
}
