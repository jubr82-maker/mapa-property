export function checkHoneypot(value: string | undefined | null): boolean {
  return !value || value.trim() === "";
}
