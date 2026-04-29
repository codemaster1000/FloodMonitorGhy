import { waterLevels, type WaterLevel } from "../../types/FloodReport";

interface WaterLevelSelectorProps {
  value: WaterLevel | null;
  onChange: (value: WaterLevel) => void;
}

const levelLabelMap: Record<WaterLevel, string> = {
  ankle: "Ankle",
  knee: "Knee",
  waist: "Waist",
  severe: "Severe (vehicle impact)",
};

const levelStyleMap: Record<
  WaterLevel,
  {
    selected: string;
    idle: string;
  }
> = {
  ankle: {
    selected:
      "border-sky-300 bg-sky-50 text-sky-800 shadow-[0_10px_22px_rgba(56,189,248,0.16)]",
    idle: "border-sky-100 bg-white text-slate-600 hover:border-sky-200 hover:bg-sky-50/60",
  },
  knee: {
    selected:
      "border-amber-300 bg-amber-50 text-amber-800 shadow-[0_10px_22px_rgba(245,158,11,0.16)]",
    idle: "border-amber-100 bg-white text-slate-600 hover:border-amber-200 hover:bg-amber-50/60",
  },
  waist: {
    selected:
      "border-orange-300 bg-orange-50 text-orange-800 shadow-[0_10px_22px_rgba(249,115,22,0.16)]",
    idle: "border-orange-100 bg-white text-slate-600 hover:border-orange-200 hover:bg-orange-50/60",
  },
  severe: {
    selected:
      "border-red-300 bg-red-50 text-red-800 shadow-[0_10px_22px_rgba(239,68,68,0.16)]",
    idle: "border-red-100 bg-white text-slate-600 hover:border-red-200 hover:bg-red-50/60",
  },
};

export default function WaterLevelSelector({
  value,
  onChange,
}: WaterLevelSelectorProps) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-base font-medium text-slate-950">
        <span className="inline-flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-50 text-sky-600 ring-1 ring-sky-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 3.5s5 5.35 5 9.2a5 5 0 0 1-10 0c0-3.85 5-9.2 5-9.2Z" />
              <path d="M7.5 19.5c1.2.7 2.7 1 4.5 1s3.3-.3 4.5-1" />
            </svg>
          </span>
          Water level
        </span>
      </legend>
      <div className="grid grid-cols-2 gap-3">
        {waterLevels.map((level) => {
          const selected = value === level;
          const levelStyle = levelStyleMap[level];
          return (
            <button
              key={level}
              type="button"
              onClick={() => onChange(level)}
              className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                selected
                  ? levelStyle.selected
                  : levelStyle.idle
              }`}
            >
              {levelLabelMap[level]}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
