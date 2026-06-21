import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../api/client";
import { useRemoteData } from "./useRemoteData";

vi.mock("../api/client", () => ({
  default: { get: vi.fn() }
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ demoMode: false })
}));

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe("useRemoteData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports loading while a request is in flight", async () => {
    const request = deferred();
    api.get.mockReturnValueOnce(request.promise);

    const { result } = renderHook(() => useRemoteData("/analytics"));
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBe(null);

    await act(async () => request.resolve({ data: { summary: {} } }));
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it("returns a friendly API error and clears data on failure", async () => {
    api.get.mockRejectedValueOnce({ response: { data: { message: "Backend unavailable" } } });
    const { result } = renderHook(() => useRemoteData("/analytics"));

    await waitFor(() => expect(result.current.error).toBe("Backend unavailable"));
    expect(result.current.data).toBe(null);
    expect(result.current.loading).toBe(false);
  });

  it("keeps null API responses as an empty result", async () => {
    api.get.mockResolvedValueOnce({ data: null });
    const { result } = renderHook(() => useRemoteData("/analytics"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe(null);
  });

  it("successfully refetches after an initial failure", async () => {
    api.get
      .mockRejectedValueOnce(new Error("Network down"))
      .mockResolvedValueOnce({ data: { summary: { totalSolved: 12 } } });
    const { result } = renderHook(() => useRemoteData("/analytics"));

    await waitFor(() => expect(result.current.error).toBe("Network down"));
    await act(async () => result.current.refetch());

    await waitFor(() => expect(result.current.data?.summary?.totalSolved).toBe(12));
    expect(result.current.error).toBe(null);
    expect(result.current.loading).toBe(false);
    expect(api.get).toHaveBeenCalledTimes(2);
  });
});
