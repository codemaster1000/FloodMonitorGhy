import { SearchBox } from "@mapbox/search-js-react";
import { useEffect, useRef } from "react";

const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

type MapboxSearchBoxElement = HTMLElement & {
  input?: HTMLInputElement;
};

interface LocationSearchBarProps {
  onSelectLocation: (location: {
    latitude: number;
    longitude: number;
    name: string;
  }) => void;
}

export default function LocationSearchBar({
  onSelectLocation,
}: LocationSearchBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    const removeInputChrome = () => {
      const searchBox =
        containerRef.current?.querySelector<MapboxSearchBoxElement>(
          "mapbox-search-box",
        );
      const input = searchBox?.input;

      if (!isMounted || !input) {
        return;
      }

      input.style.border = "none";
      input.style.outline = "none";
      input.style.boxShadow = "none";
      input.style.height = "30px";
      input.style.minHeight = "30px";
    };

    const frameId = window.requestAnimationFrame(removeInputChrome);
    window.customElements
      .whenDefined("mapbox-search-box")
      .then(removeInputChrome)
      .catch(() => undefined);

    return () => {
      isMounted = false;
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  if (!mapboxToken) {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleRetrieve = (result: any) => {
    const feature = result?.features?.[0] ?? result?.feature ?? null;
    const coordinates = feature?.geometry?.coordinates;

    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      return;
    }

    const latitude = Number(coordinates[1]);
    const longitude = Number(coordinates[0]);
    const name =
      feature?.properties?.name ??
      feature?.place_name ??
      feature?.text ??
      feature?.name ??
      "Selected location";

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return;
    }

    onSelectLocation({ latitude, longitude, name });
  };

  return (
    <div
      ref={containerRef}
      className="w-96 rounded-full bg-white/95 px-4 py-1.5 shadow-lg backdrop-blur-sm transition-all hover:bg-white hover:shadow-xl border border-slate-200"
    >
      <style>{`
        mapbox-search-box {
          display: block;
          width: 100%;
        }
      `}</style>
      <SearchBox
        accessToken={mapboxToken}
        placeholder="Search locality, ward, or place"
        theme={{
          variables: {
            border: "none",
            borderRadius: "12px",
            boxShadow: "none",
            colorBackground: "#ffffff",
            colorText: "#1e293b",
            colorSecondary: "#94a3b8",
            fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif",
            unit: "14px",
            padding: "8px 12px",
          },
        }}
        options={{
          country: "IN",
          types: "place,locality,neighborhood,district,region,address",
          limit: 10,
        }}
        onRetrieve={handleRetrieve}
      />
    </div>
  );
}
