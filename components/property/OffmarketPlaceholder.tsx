export function OffmarketPlaceholder({
  className = "",
  showLabel = true,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={`absolute inset-0 flex flex-col items-center justify-center ${className}`}
      style={{
        background:
          "radial-gradient(circle at center, #1a2332 0%, #0d1419 100%)",
      }}
    >
      <svg
        viewBox="0 0 80 80"
        width="80"
        height="80"
        fill="none"
        stroke="#C8A04A"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="15" y="35" width="50" height="35" rx="4" />
        <path d="M25 35V22a15 15 0 0 1 30 0v13" />
      </svg>
      {showLabel && (
        <p
          className="mt-4 font-display"
          style={{
            color: "#C8A04A",
            letterSpacing: "0.3em",
            fontSize: "18px",
            fontWeight: 700,
          }}
        >
          OFF MARKET
        </p>
      )}
    </div>
  );
}
