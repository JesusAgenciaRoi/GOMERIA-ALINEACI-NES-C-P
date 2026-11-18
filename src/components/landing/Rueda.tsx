// Rueda decorativa (SVG) para animar.
export default function Rueda({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <circle cx="100" cy="100" r="96" fill="#111214" />
      {Array.from({ length: 36 }, (_, i) => (
        <rect key={i} x="96" y="2" width="8" height="16" rx="2" fill="#2a2c30" transform={`rotate(${i * 10} 100 100)`} />
      ))}
      <circle cx="100" cy="100" r="66" fill="#3a3d42" />
      <circle cx="100" cy="100" r="60" fill="#c9ccd1" />
      {Array.from({ length: 5 }, (_, i) => (
        <path key={i} d="M92 48 L108 48 L104 86 L96 86 Z" fill="#8d9197" transform={`rotate(${i * 72} 100 100)`} />
      ))}
      <circle cx="100" cy="100" r="18" fill="#f5b800" />
      <circle cx="100" cy="100" r="7" fill="#17181a" />
    </svg>
  );
}
