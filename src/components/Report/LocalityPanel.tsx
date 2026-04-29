import { useMemo, useState, useRef } from "react";
import { useAppStore } from "../../store/useAppStore";
import { reportMatchesLocality } from "../../utils/locality";

const assamTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Kolkata",
});

const assamDateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Kolkata",
});

function formatAssamTime(value: string): string {
  return assamTimeFormatter.format(new Date(value));
}

function formatAssamDateTime(value: string): string {
  return assamDateTimeFormatter.format(new Date(value));
}

interface LocalityPanelProps {
  onReportClick: () => void;
}

export default function LocalityPanel({ onReportClick }: LocalityPanelProps) {
  const selectedLocalityId = useAppStore((state) => state.selectedLocalityId);
  const customLocation = useAppStore((state) => state.customLocation);
  const setCustomLocation = useAppStore((state) => state.setCustomLocation);
  const setSelectedLocalityId = useAppStore(
    (state) => state.setSelectedLocalityId,
  );
  const floodProneZones = useAppStore((state) => state.floodProneZones);
  const reports = useAppStore((state) => state.reports);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const zone = useMemo(() => {
    return floodProneZones?.features.find(
      (f) => f.properties.id === selectedLocalityId,
    );
  }, [floodProneZones, selectedLocalityId]);

  const localityReports = useMemo(() => {
    const selectedLocalityName = zone?.properties.name ?? customLocation?.name;

    return reports
      .filter((report) =>
        reportMatchesLocality(
          report,
          selectedLocalityId,
          selectedLocalityName,
        ),
      )
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
  }, [customLocation?.name, reports, selectedLocalityId, zone?.properties.name]);

  if (!selectedLocalityId && !customLocation) {
    return null;
  }

  const latestReport = localityReports[0];
  const images = localityReports
    .filter((r) => r.image_url)
    .slice(0, 3)
    .map((r) => ({ url: r.image_url!, time: r.created_at }));

  const handleClose = () => {
    setCustomLocation(null);
    setSelectedLocalityId(null);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 rounded-t-2xl border border-slate-200 bg-white p-5 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:bottom-6 sm:left-auto sm:right-6 sm:w-96 sm:rounded-2xl">
      <div className="mb-4">
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-bold text-slate-800">
            {zone?.properties.name ?? "Selected Location"}
          </h2>
          <button
            onClick={handleClose}
            className="p-1 text-slate-400 hover:text-slate-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        <div className="mt-1 flex items-center justify-between text-sm text-slate-500">
          <span>
            {zone ? (
              <>
                Risk Level:{" "}
                <span className="font-semibold capitalize text-slate-700">
                  {zone.properties.riskLevel}
                </span>
              </>
            ) : (
              Math.abs(customLocation!.latitude).toFixed(4) +
              "°, " +
              Math.abs(customLocation!.longitude).toFixed(4) +
              "°"
            )}
          </span>
          {latestReport && (
            <span>Updated: {formatAssamTime(latestReport.created_at)}</span>
          )}
        </div>
      </div>

      {localityReports.length > 0 ? (
        <div className="mb-4 rounded-lg border border-slate-100 bg-slate-50 p-3">
          <div className="mb-2 text-sm font-medium text-slate-700">
            Latest Water Level:{" "}
            <strong className="text-slate-900 uppercase">
              {latestReport.water_level}
            </strong>
          </div>
          {images.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {images.map((img, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setExpandedIndex(i)}
                  className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-slate-200 text-left transition hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-cyan-400"
                >
                  <img
                    src={img.url}
                    alt="Flood report"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 text-[8px] leading-tight text-white backdrop-blur-sm">
                    {formatAssamDateTime(img.time)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mb-4 rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-500">
          No reports for this area yet.
        </div>
      )}

      <button
        type="button"
        onClick={onReportClick}
        className="w-full rounded-xl bg-cyan-700 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
      >
        Report Flood Here
      </button>

      {expandedIndex !== null && images[expandedIndex] ? (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 p-4"
          onClick={() => setExpandedIndex(null)}
          onTouchStart={(e) => (touchStartX.current = e.touches[0].clientX)}
          onTouchMove={(e) => (touchEndX.current = e.touches[0].clientX)}
          onTouchEnd={() => {
            if (touchStartX.current == null || touchEndX.current == null) return;
            const diff = touchStartX.current - touchEndX.current;
            const threshold = 40;
            if (diff > threshold) {
              setExpandedIndex((i) => (i == null ? null : (i + 1) % images.length));
            } else if (diff < -threshold) {
              setExpandedIndex((i) => (i == null ? null : (i - 1 + images.length) % images.length));
            }
            touchStartX.current = null;
            touchEndX.current = null;
          }}
        >
          <div
            className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setExpandedIndex((i) => (i == null ? null : (i - 1 + images.length) % images.length))}
              className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow hover:bg-white"
              aria-label="Previous image"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setExpandedIndex((i) => (i == null ? null : (i + 1) % images.length))}
              className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow hover:bg-white"
              aria-label="Next image"
            >
              ›
            </button>
            <img
              src={images[expandedIndex].url}
              alt="Flood report enlarged"
              className="max-h-[75vh] w-full object-contain bg-slate-900"
            />
            <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-slate-700">
              <span>Uploaded: {formatAssamDateTime(images[expandedIndex].time)}</span>
              <button
                type="button"
                onClick={() => setExpandedIndex(null)}
                className="rounded-md border border-slate-200 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
