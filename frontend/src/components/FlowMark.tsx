interface FlowMarkProps {
  variant?: "full" | "symbol" | "wordmark";
  colorScheme?: "reversed" | "standard";
  className?: string;
  height?: number;
}

export default function FlowMark({
  variant = "full",
  colorScheme = "reversed",
  className = "",
  height = 36,
}: FlowMarkProps) {
  const cyan = "#00C2D1";
  const wordmarkColor = colorScheme === "reversed" ? "#FFFFFF" : "#0F2040";
  const symbolColor = cyan;

  const symbolWidth = Math.round(height * 1.1);
  const wordmarkWidth = Math.round(height * 3.2);
  const totalWidth =
    variant === "full"
      ? symbolWidth + 12 + wordmarkWidth
      : variant === "symbol"
        ? symbolWidth
        : wordmarkWidth;

  if (variant === "symbol") {
    return (
      <svg
        width={symbolWidth}
        height={height}
        viewBox="0 0 44 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="Nexflow Flow Mark"
        role="img"
      >
        <path d="M0 4 L36 4 L44 20 L36 14 L0 14 Z" fill={symbolColor} />
        <path d="M0 22 L32 22 L44 20 L32 26 L0 30 Z" fill={symbolColor} />
      </svg>
    );
  }

  if (variant === "wordmark") {
    return (
      <svg
        width={wordmarkWidth}
        height={height}
        viewBox="0 0 128 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="Nexflow"
        role="img"
      >
        <text
          x="0"
          y="30"
          fontFamily="Inter, system-ui, sans-serif"
          fontWeight="700"
          fontSize="28"
          fill={wordmarkColor}
          letterSpacing="-0.5"
        >
          nexflow
        </text>
      </svg>
    );
  }

  return (
    <svg
      width={totalWidth}
      height={height}
      viewBox={`0 0 ${totalWidth} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Nexflow"
      role="img"
    >
      <g transform={`scale(${height / 40})`}>
        <path d="M0 4 L36 4 L44 20 L36 14 L0 14 Z" fill={symbolColor} />
        <path d="M0 22 L32 22 L44 20 L32 26 L0 30 Z" fill={symbolColor} />
      </g>
      <text
        x={symbolWidth + 12}
        y={Math.round(height * 0.78)}
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="700"
        fontSize={Math.round(height * 0.7)}
        fill={wordmarkColor}
        letterSpacing="-0.5"
      >
        nexflow
      </text>
    </svg>
  );
}
