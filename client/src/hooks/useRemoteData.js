import { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

export function useRemoteData(path, demoValue) {
  const { demoMode } = useAuth();
  const [data, setData] = useState(demoMode ? demoValue : null);
  const [loading, setLoading] = useState(!demoMode);
  const [error, setError] = useState("");

  useEffect(() => {
    if (demoMode) {
      setData(demoValue);
      setLoading(false);
      return;
    }
    setLoading(true);
    api.get(path)
      .then((response) => setData(response.data))
      .catch((err) => setError(err.response?.data?.message || "Could not load data"))
      .finally(() => setLoading(false));
  }, [path, demoMode]);

  return { data, loading, error, setData };
}
