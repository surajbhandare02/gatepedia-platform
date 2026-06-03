export function Spinner({ label = "Loading" }) {
  return (
    <div className="spinner-wrap" role="status" aria-live="polite">
      <div className="spinner" aria-hidden />
      <span className="sr-only">{label}</span>
    </div>
  );
}
