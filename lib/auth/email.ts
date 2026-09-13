// E-mail je identita účtu (viz db/schema.sql `users.email UNIQUE`) — vždy
// se ukládá a porovnává normalizovaný, aby "Foo@Bar.cz" a "foo@bar.cz"
// nikdy nezaložily dva různé účty.
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return email.length > 0 && email.length <= 254 && EMAIL_RE.test(email);
}
