// Postgres throws "invalid input syntax for type uuid" (→ 500) when a non-UUID
// string is compared against a uuid column. Routes check path params with this
// first so a malformed id becomes a clean 404 instead.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
    return UUID_RE.test(value);
}
