import { useState, useEffect, useRef, useCallback } from "react";

interface ClipboardState {
  copiedId: string | null;
}

export function useSecureClipboard() {
  const [state, setState] = useState<ClipboardState>({ copiedId: null });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const copy = useCallback(async (text: string, id: string) => {
    try {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      
      await navigator.clipboard.writeText(text);
      
      // Visual feedback
      setState({ copiedId: id });

      // Reset "Copied" status after 3 seconds (UI only)
      timeoutRef.current = setTimeout(() => {
        setState({ copiedId: null });
      }, 3000);

    } catch (e) {
      console.error("Failed to copy", e);
      alert("Failed to copy to clipboard");
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { ...state, copy };
}
