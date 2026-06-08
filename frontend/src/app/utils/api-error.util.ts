/** Normalize NestJS / HTTP error bodies for display in the UI. */
export function formatApiError(err: unknown, fallback = 'Something went wrong.'): string {
  const body = (err as { error?: { message?: string | string[] } })?.error;
  const msg = body?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  if (typeof msg === 'string' && msg.trim()) return msg;
  return fallback;
}
