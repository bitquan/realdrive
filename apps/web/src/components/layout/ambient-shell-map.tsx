import { cn } from "@/lib/utils";

const mapNodes = [
  { x: 138, y: 176, label: "Dispatch" },
  { x: 324, y: 118, label: "Drivers" },
  { x: 508, y: 208, label: "Rides" },
  { x: 704, y: 150, label: "Dues" },
  { x: 932, y: 260, label: "Community" },
  { x: 824, y: 434, label: "Share" },
  { x: 578, y: 516, label: "Team" },
  { x: 326, y: 434, label: "Markets" },
  { x: 190, y: 558, label: "Pricing" }
];

export function AmbientShellMap({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(95,125,255,0.18),transparent_22%),radial-gradient(circle_at_75%_30%,rgba(82,165,255,0.1),transparent_18%),linear-gradient(180deg,rgba(4,6,9,0.16),rgba(4,6,9,0.38))]" />
      <div className="absolute inset-y-0 right-[-10%] w-[78%] rounded-full bg-[radial-gradient(circle,rgba(14,21,33,0.68),rgba(6,8,12,0.02)_72%)] blur-3xl" />
      <svg
        className="absolute inset-y-0 right-[-8%] hidden h-full w-[76rem] max-w-none opacity-55 lg:block"
        viewBox="0 0 1200 760"
        fill="none"
      >
        <path
          d="M70 210C164 170 212 160 296 164C380 168 442 236 546 236C650 236 698 126 804 126C910 126 946 218 1010 256C1074 294 1142 286 1194 260"
          stroke="rgba(113,146,255,0.3)"
          strokeWidth="1.5"
        />
        <path
          d="M104 534C178 474 248 452 324 452C400 452 454 520 560 520C666 520 764 390 862 390C960 390 1064 478 1168 470"
          stroke="rgba(96,168,255,0.2)"
          strokeWidth="1.5"
        />
        <path
          d="M202 124L264 210L416 244L512 202L694 230L814 164L942 248"
          stroke="rgba(240,244,255,0.14)"
          strokeWidth="1.2"
          strokeDasharray="4 12"
        />
        <path
          d="M218 556L346 460L496 480L620 544L780 438L894 434L1026 486"
          stroke="rgba(240,244,255,0.12)"
          strokeWidth="1.2"
          strokeDasharray="4 12"
        />
        <g stroke="rgba(240,244,255,0.08)">
          <path d="M120 86H1124" />
          <path d="M120 198H1124" />
          <path d="M120 310H1124" />
          <path d="M120 422H1124" />
          <path d="M120 534H1124" />
          <path d="M120 646H1124" />
          <path d="M168 42V702" />
          <path d="M336 42V702" />
          <path d="M504 42V702" />
          <path d="M672 42V702" />
          <path d="M840 42V702" />
          <path d="M1008 42V702" />
        </g>
        {mapNodes.map((node) => (
          <g key={node.label}>
            <circle cx={node.x} cy={node.y} r="7" fill="rgba(113,146,255,0.18)" />
            <circle cx={node.x} cy={node.y} r="3.5" fill="rgba(240,244,255,0.92)" />
            <text
              x={node.x + 16}
              y={node.y - 14}
              fill="rgba(223,228,240,0.34)"
              fontSize="13"
              fontFamily="Sora, ui-sans-serif, system-ui"
              letterSpacing="0.24em"
            >
              {node.label.toUpperCase()}
            </text>
          </g>
        ))}
      </svg>
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#05070b] via-[#05070bcc] to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#05070b] via-[#05070be8] to-transparent" />
    </div>
  );
}
