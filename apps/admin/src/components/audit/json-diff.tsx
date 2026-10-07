/** Compact, read-only rendering of an audit entry's before/after JSON blobs. */
function format(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function JsonDiff({
  before,
  after,
  beforeLabel,
  afterLabel,
}: {
  before: unknown;
  after: unknown;
  beforeLabel: string;
  afterLabel: string;
}) {
  const hasBefore = before !== null && before !== undefined;
  const hasAfter = after !== null && after !== undefined;
  if (!hasBefore && !hasAfter) return <span className="text-muted-foreground">—</span>;

  return (
    <div className="flex flex-col gap-1 text-xs">
      {hasBefore ? (
        <div>
          <span className="text-muted-foreground">{beforeLabel}: </span>
          <code dir="ltr" className="break-all">
            {format(before)}
          </code>
        </div>
      ) : null}
      {hasAfter ? (
        <div>
          <span className="text-muted-foreground">{afterLabel}: </span>
          <code dir="ltr" className="break-all">
            {format(after)}
          </code>
        </div>
      ) : null}
    </div>
  );
}
