export function Footer() {
  return (
    <footer className="mt-10 mb-12 text-center text-xs text-neutral-500">
      © {new Date().getFullYear()} 3 Strands Cattle Co. · ranchOS operations.
      <div className="mt-1 text-[11px] text-neutral-600">All data is simulated while in demo mode.</div>
    </footer>
  );
}
