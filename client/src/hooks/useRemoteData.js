import { useCallback, useEffect, useRef, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

export function useRemoteData(path, demoValue) {
  const { demoMode } = useAuth();
  const [data, setData] = useState(demoMode ? demoValue : null);
  const [loading, setLoading] = useState(!demoMode);
  const [error, setError] = useState(null);
  const requestId = useRef(0);
  const demoValueRef = useRef(demoValue);
  demoValueRef.current = demoValue;

  const refetch = useCallback(async () => {
    const currentRequest = ++requestId.current;
    if (demoMode) {
      setData(demoValueRef.current);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.get(path);
      if (currentRequest !== requestId.current) return;
      setData(response?.data ?? null);
      setError(null);
    } catch (err) {
      if (currentRequest !== requestId.current) return;
      setError(
        err.response?.data?.message ||
        err.message ||
        "Failed to load data"
      );
      setData(null);
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [demoMode, path]);

  useEffect(() => {
    refetch();
    return () => {
      requestId.current += 1;
    };
  }, [refetch]);

  return { data, loading, error, refetch };
}
