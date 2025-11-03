export function Field({ label, value }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-400">{label}</div>
      <div className="text-base font-semibold text-neutral-50">{value}</div>
    </div>
  );
}
