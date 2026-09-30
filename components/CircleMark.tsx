const OPACITY = [1, 0.65, 0.65, 1, 0.65, 0.65, 1, 0.65, 0.65, 1];

/** The Circle mark: ten dots in a ring. */
export function CircleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" aria-hidden="true">
      {OPACITY.map((opacity, i) => {
        const a = i * Math.PI / 5;
        return <circle key={i} cx={(20 + 11 * Math.sin(a)).toFixed(2)} cy={(20 - 11 * Math.cos(a)).toFixed(2)} r="1.25" opacity={opacity} />;
      })}
    </svg>
  );
}
