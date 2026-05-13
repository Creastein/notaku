export type ApiResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Wraps an async handler and returns a typed ApiResult.
 * Catches errors and converts them to a JSON response.
 */
export async function handleApi<T>(fn: () => Promise<T>): Promise<ApiResult<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
