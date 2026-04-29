import mapboxgl from "mapbox-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import LocationSearchBar from "./LocationSearchBar";
import { useAppStore } from "../../store/useAppStore";
import { reverseGeocodeLocality } from "../../services/mapboxGeocoding";
import { reportMatchesLocality } from "../../utils/locality";
import { isPointInPolygon } from "../../utils/pointInPolygon";

const assamTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Kolkata",
});

function formatAssamTime(value: string): string {
  return assamTimeFormatter.format(new Date(value));
}

const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
const mapboxStyle =
  import.meta.env.VITE_MAPBOX_STYLE ?? "mapbox://styles/mapbox/streets-v12";
const geofenceSourceId = "clicked-location-geofence-source";
const geofenceFillLayerId = "clicked-location-geofence-fill";
const geofenceOutlineLayerId = "clicked-location-geofence-outline";
const locationAccuracySourceId = "current-location-accuracy-source";
const locationAccuracyFillLayerId = "current-location-accuracy-fill";
const locationAccuracyOutlineLayerId = "current-location-accuracy-outline";
const wardsGeoJsonUrl = "/data/guwahati_60wards_official.geojson";

interface MapViewProps {
  onReportClick: () => void;
}

interface ActiveGeofence {
  name: string;
  polygons: Array<Array<Array<[number, number]>>>;
  localityId: string | null;
}

interface LocationSelectionInput {
  latitude: number;
  longitude: number;
  preferredName?: string;
}

interface WardBoundaryProperties {
  ward_no?: number | string;
  ward_name?: string;
  ward_lgd_code?: string;
  objectid?: string;
}

type WardBoundaryFeature = GeoJSON.Feature<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  WardBoundaryProperties
>;

const emptyGeofenceCollection: GeoJSON.FeatureCollection<GeoJSON.Polygon> = {
  type: "FeatureCollection",
  features: [],
};

const emptyLocationAccuracyCollection: GeoJSON.FeatureCollection<GeoJSON.Polygon> =
  {
    type: "FeatureCollection",
    features: [],
  };

function createAccuracyCircle(
  latitude: number,
  longitude: number,
  radiusMeters: number,
): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  const earthRadiusMeters = 6371008.8;
  const angularDistance = radiusMeters / earthRadiusMeters;
  const centerLatitude = (latitude * Math.PI) / 180;
  const centerLongitude = (longitude * Math.PI) / 180;
  const coordinates: Array<[number, number]> = [];

  for (let index = 0; index <= 64; index += 1) {
    const bearing = (index / 64) * Math.PI * 2;
    const pointLatitude = Math.asin(
      Math.sin(centerLatitude) * Math.cos(angularDistance) +
        Math.cos(centerLatitude) *
          Math.sin(angularDistance) *
          Math.cos(bearing),
    );
    const pointLongitude =
      centerLongitude +
      Math.atan2(
        Math.sin(bearing) *
          Math.sin(angularDistance) *
          Math.cos(centerLatitude),
        Math.cos(angularDistance) -
          Math.sin(centerLatitude) * Math.sin(pointLatitude),
      );

    coordinates.push([
      (pointLongitude * 180) / Math.PI,
      (pointLatitude * 180) / Math.PI,
    ]);
  }

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [coordinates],
        },
      },
    ],
  };
}

function formatLocationAccuracy(accuracy: number | null) {
  if (accuracy == null) {
    return "Accuracy unknown";
  }

  const roundedAccuracy = Math.round(accuracy);

  if (roundedAccuracy > 1000) {
    return `Approximate location, within ${(roundedAccuracy / 1000).toFixed(1)} km`;
  }

  if (roundedAccuracy > 100) {
    return `Approximate location, within ${roundedAccuracy} m`;
  }

  return `Accuracy: ${roundedAccuracy} m`;
}

function getGeometryPolygons(geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon) {
  if (geometry.type === "Polygon") {
    return [geometry.coordinates as Array<Array<[number, number]>>];
  }

  return geometry.coordinates as Array<Array<Array<[number, number]>>>;
}

function getWardDisplayName(properties: WardBoundaryProperties) {
  if (properties.ward_name?.trim()) {
    return properties.ward_name;
  }

  return `Ward No.${String(properties.ward_no ?? "")}`;
}

function SelectionPopupCard({
  onReportClick,
  onDismiss,
}: {
  onReportClick: () => void;
  onDismiss: () => void;
}) {
  const selectedLocalityId = useAppStore((state) => state.selectedLocalityId);
  const customLocation = useAppStore((state) => state.customLocation);
  const floodProneZones = useAppStore((state) => state.floodProneZones);
  const reports = useAppStore((state) => state.reports);

  const zone = useMemo(() => {
    return (
      floodProneZones?.features.find(
        (feature) => feature.properties.id === selectedLocalityId,
      ) ?? null
    );
  }, [floodProneZones, selectedLocalityId]);

  const localityName =
    customLocation?.name ?? zone?.properties.name ?? "Finding location...";
  const localityReports = useMemo(() => {
    const selectedLocalityName =
      customLocation?.name ?? zone?.properties.name ?? null;

    return reports
      .filter((report) =>
        reportMatchesLocality(
          report,
          selectedLocalityId,
          selectedLocalityName,
        ),
      )
      .sort(
        (left, right) =>
          new Date(right.created_at).getTime() -
          new Date(left.created_at).getTime(),
      );
  }, [customLocation?.name, reports, selectedLocalityId, zone?.properties.name]);

  const latestReport = localityReports[0];
  const images = localityReports
    .filter((report) => report.image_url)
    .slice(0, 3)
    .map((report) => ({ url: report.image_url!, time: report.created_at }));

  const isLocationPending = customLocation?.name == null;

  const handleDismiss = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onDismiss();
  };

  return (
    <div className="w-fit min-w-[20rem] max-w-[92vw] rounded-[1.75rem] border border-white/80 bg-white/95 p-5 text-left font-normal text-slate-950 shadow-[0_24px_70px_rgba(15,23,42,0.22)] backdrop-blur-xl sm:max-w-[36rem]">
      <div className="mb-4 flex items-start gap-4">
        <div className="mt-0.5 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-cyan-700 shadow-inner shadow-cyan-200/70 ring-1 ring-cyan-200/80">
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
            <path d="M12 21s6-4.35 6-10a6 6 0 0 0-12 0c0 5.65 6 10 6 10Z" />
            <circle cx="12" cy="11" r="2.25" />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="break-words text-xl font-medium leading-tight text-slate-950">
            {localityName}
          </h3>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {isLocationPending
              ? "Resolving locality name..."
              : selectedLocalityId
                ? "Flood-prone locality"
                : "Nearby area"}
          </p>
        </div>

        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={handleDismiss}
          aria-label="Dismiss panel"
          className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
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
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>

      {localityReports.length > 0 ? (
        <div className="mb-5 rounded-2xl border border-slate-100 bg-slate-50/90 p-4">
          <div className="mb-2 text-sm font-semibold text-slate-700">
            Latest Water Level:{" "}
            <strong className="text-slate-900 uppercase">
              {latestReport.water_level}
            </strong>
          </div>

          {images.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((image, index) => (
                <div
                  key={`${image.time}-${index}`}
                  className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200"
                >
                  <img
                    src={image.url}
                    alt="Flood report"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/55 px-1 py-0.5 text-[9px] text-white backdrop-blur-sm">
                    {formatAssamTime(image.time)}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mb-5 rounded-2xl bg-slate-50/95 px-5 py-6 text-center text-base font-medium text-slate-500">
          No reports for this area yet.
        </div>
      )}

      <button
        type="button"
        onClick={onReportClick}
        disabled={isLocationPending}
        className="w-full rounded-full bg-sky-400 px-6 py-3.5 text-base font-semibold text-white shadow-[0_14px_30px_rgba(56,189,248,0.26)] focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
      >
        Report Flood
      </button>
    </div>
  );
}

mapboxgl.accessToken = mapboxToken ?? "";

export default function MapView({ onReportClick }: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const currentLocationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const selectionMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const selectionPopupRef = useRef<mapboxgl.Popup | null>(null);
  const selectionPopupRootRef = useRef<Root | null>(null);
  const selectionRequestIdRef = useRef(0);
  const activeGeofenceRef = useRef<ActiveGeofence | null>(null);
  const wardBoundariesRef = useRef<WardBoundaryFeature[]>([]);
  const selectionControllerRef = useRef<
    ((input: LocationSelectionInput) => void) | null
  >(null);
  const onReportClickRef = useRef(onReportClick);
  const suppressPopupCloseRef = useRef(false);
  const [isMapStyleLoaded, setIsMapStyleLoaded] = useState(false);

  const mapCenter = useAppStore((state) => state.mapCenter);
  const initialMapCenterRef = useRef(mapCenter);
  const reports = useAppStore((state) => state.reports);
  const currentLocation = useAppStore((state) => state.currentLocation);

  useEffect(() => {
    onReportClickRef.current = onReportClick;
  }, [onReportClick]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !mapboxToken) {
      return;
    }

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: mapboxStyle,
      center: [
        initialMapCenterRef.current.longitude,
        initialMapCenterRef.current.latitude,
      ],
      zoom: initialMapCenterRef.current.zoom,
      attributionControl: true,
    });

    mapRef.current = map;
    setIsMapStyleLoaded(map.isStyleLoaded());

    const handleStyleLoad = () => {
      setIsMapStyleLoaded(true);
    };

    map.addControl(new mapboxgl.ScaleControl(), "bottom-right");
    map.on("load", handleStyleLoad);

    const loadWardBoundaries = async () => {
      try {
        const response = await fetch(wardsGeoJsonUrl);

        if (!response.ok) {
          throw new Error(`Ward boundaries request failed: ${response.status}`);
        }

        const data = (await response.json()) as GeoJSON.FeatureCollection<
          GeoJSON.Polygon | GeoJSON.MultiPolygon,
          WardBoundaryProperties
        >;

        wardBoundariesRef.current = (data.features ?? []).filter((feature) => {
          return (
            feature.geometry?.type === "Polygon" ||
            feature.geometry?.type === "MultiPolygon"
          );
        });
      } catch (error) {
        console.error("Could not load ward boundaries", error);
        wardBoundariesRef.current = [];
      }
    };

    void loadWardBoundaries();

    const ensureGeofenceLayers = () => {
      if (!map.getSource(geofenceSourceId)) {
        map.addSource(geofenceSourceId, {
          type: "geojson",
          data: emptyGeofenceCollection,
        });
      }

      if (!map.getLayer(geofenceFillLayerId)) {
        map.addLayer({
          id: geofenceFillLayerId,
          type: "fill",
          source: geofenceSourceId,
          paint: {
            "fill-color": "#f59e0b",
            "fill-opacity": 0,
          },
        });
      }

      if (!map.getLayer(geofenceOutlineLayerId)) {
        map.addLayer({
          id: geofenceOutlineLayerId,
          type: "line",
          source: geofenceSourceId,
          paint: {
            "line-color": "#ea580c",
            "line-width": 2,
            "line-opacity": 0.85,
          },
        });
      }
    };

    const setGeofenceLayerData = (
      polygons: Array<Array<Array<[number, number]>>>,
    ) => {
      ensureGeofenceLayers();

      const geometry =
        polygons.length === 1
          ? ({
              type: "Polygon",
              coordinates: polygons[0],
            } as const)
          : ({
              type: "MultiPolygon",
              coordinates: polygons,
            } as const);

      const source = map.getSource(geofenceSourceId) as mapboxgl.GeoJSONSource;
      source.setData({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry,
          },
        ],
      });
    };

    const clearGeofenceLayerData = () => {
      if (!map.getSource(geofenceSourceId)) {
        return;
      }

      const source = map.getSource(geofenceSourceId) as mapboxgl.GeoJSONSource;
      source.setData(emptyGeofenceCollection);
    };

    const clearActiveGeofence = () => {
      activeGeofenceRef.current = null;
      clearGeofenceLayerData();
    };

    if (map.isStyleLoaded()) {
      ensureGeofenceLayers();
    } else {
      map.once("load", ensureGeofenceLayers);
    }

    const removeSelectionUI = () => {
      suppressPopupCloseRef.current = true;

      selectionPopupRootRef.current?.unmount();
      selectionPopupRootRef.current = null;

      selectionPopupRef.current?.remove();
      selectionPopupRef.current = null;

      selectionMarkerRef.current?.remove();
      selectionMarkerRef.current = null;

      suppressPopupCloseRef.current = false;
    };

    const clearSelection = () => {
      selectionRequestIdRef.current += 1;
      removeSelectionUI();
      useAppStore.getState().setSelectedLocalityId(null);
      useAppStore.getState().setCustomLocation(null);
      clearActiveGeofence();
    };

    const renderSelectionPopup = (latitude: number, longitude: number) => {
      removeSelectionUI();

      const markerElement = document.createElement("div");
      markerElement.style.width = "34px";
      markerElement.style.height = "34px";
      markerElement.style.display = "flex";
      markerElement.style.alignItems = "center";
      markerElement.style.justifyContent = "center";
      markerElement.style.borderRadius = "9999px";
      markerElement.style.background = "rgba(14, 165, 233, 0.16)";
      markerElement.style.backdropFilter = "blur(6px)";
      markerElement.style.boxShadow = "0 12px 24px rgba(15, 23, 42, 0.24)";
      markerElement.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0f172a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 21s6-4.35 6-10a6 6 0 0 0-12 0c0 5.65 6 10 6 10Z" fill="#0ea5e9" stroke="#0ea5e9" />
          <circle cx="12" cy="11" r="2.2" fill="#ffffff" stroke="#ffffff" />
        </svg>
      `;

      selectionMarkerRef.current = new mapboxgl.Marker({
        element: markerElement,
        anchor: "bottom",
      })
        .setLngLat([longitude, latitude])
        .addTo(map);

      const popupContainer = document.createElement("div");
      const popupRoot = createRoot(popupContainer);
      popupRoot.render(
        <SelectionPopupCard
          onReportClick={() => onReportClickRef.current()}
          onDismiss={clearSelection}
        />,
      );

      const popup = new mapboxgl.Popup({
        className: "selection-popup",
        closeButton: false,
        closeOnClick: false,
        offset: 24,
        maxWidth: "none",
      })
        .setLngLat([longitude, latitude])
        .setDOMContent(popupContainer)
        .addTo(map);

      popup.on("close", () => {
        if (suppressPopupCloseRef.current) {
          return;
        }

        clearSelection();
      });

      selectionPopupRootRef.current = popupRoot;
      selectionPopupRef.current = popup;
    };

    const selectLocation = async ({
      latitude,
      longitude,
      preferredName,
    }: LocationSelectionInput) => {
      const selectionId = ++selectionRequestIdRef.current;
      const mapHeight = map.getContainer().clientHeight;
      const verticalOffset = Math.min(Math.max(mapHeight * 0.14, 64), 140);

      map.easeTo({
        center: [longitude, latitude],
        offset: [0, verticalOffset],
        duration: 650,
        essential: true,
      });

      const clickedPoint = { latitude, longitude };
      const activeGeofence = activeGeofenceRef.current;

      if (
        activeGeofence &&
        activeGeofence.polygons.some((polygon) =>
          isPointInPolygon(clickedPoint, polygon),
        )
      ) {
        useAppStore
          .getState()
          .setSelectedLocalityId(activeGeofence.localityId ?? null);
        useAppStore.getState().setCustomLocation({
          latitude,
          longitude,
          name: preferredName ?? activeGeofence.name,
        });
        renderSelectionPopup(latitude, longitude);
        return;
      }

      const zones = useAppStore.getState().floodProneZones;
      const matchedZone = zones?.features.find((feature) => {
        return isPointInPolygon(
          clickedPoint,
          feature.geometry.coordinates as Array<Array<[number, number]>>,
        );
      });

      if (matchedZone) {
        const zonePolygons = [
          matchedZone.geometry.coordinates as Array<Array<[number, number]>>,
        ];

        activeGeofenceRef.current = {
          name: preferredName ?? matchedZone.properties.name,
          polygons: zonePolygons,
          localityId: matchedZone.properties.id,
        };
        setGeofenceLayerData(zonePolygons);

        useAppStore.getState().setSelectedLocalityId(matchedZone.properties.id);
        useAppStore.getState().setCustomLocation({
          latitude,
          longitude,
          name: preferredName ?? matchedZone.properties.name,
        });
        renderSelectionPopup(latitude, longitude);
        return;
      }

      const matchedWard = wardBoundariesRef.current.find((wardFeature) => {
        return getGeometryPolygons(wardFeature.geometry).some((polygon) => {
          return isPointInPolygon(clickedPoint, polygon);
        });
      });

      if (matchedWard) {
        const wardPolygons = getGeometryPolygons(matchedWard.geometry);
        const wardName = getWardDisplayName(matchedWard.properties ?? {});
        const fallbackName = preferredName ?? wardName;

        activeGeofenceRef.current = {
          name: fallbackName,
          polygons: wardPolygons,
          localityId: null,
        };
        setGeofenceLayerData(wardPolygons);

        useAppStore.getState().setSelectedLocalityId(null);
        useAppStore.getState().setCustomLocation({
          latitude,
          longitude,
          name: fallbackName,
        });
        renderSelectionPopup(latitude, longitude);

        if (preferredName) {
          return;
        }

        try {
          const localityName = await reverseGeocodeLocality(
            latitude,
            longitude,
          );

          if (selectionId !== selectionRequestIdRef.current) {
            return;
          }

          const resolvedName = localityName ?? wardName;

          if (activeGeofenceRef.current) {
            activeGeofenceRef.current.name = resolvedName;
          }

          useAppStore.getState().setCustomLocation({
            latitude,
            longitude,
            name: resolvedName,
          });
        } catch (error) {
          console.error("Reverse geocoding failed", error);
        }

        return;
      }

      useAppStore.getState().setSelectedLocalityId(null);
      useAppStore.getState().setCustomLocation({
        latitude,
        longitude,
        name: preferredName ?? null,
      });
      renderSelectionPopup(latitude, longitude);

      if (preferredName) {
        clearActiveGeofence();
        return;
      }

      try {
        const localityName = await reverseGeocodeLocality(latitude, longitude);

        if (selectionId !== selectionRequestIdRef.current) {
          return;
        }

        clearActiveGeofence();

        useAppStore.getState().setCustomLocation({
          latitude,
          longitude,
          name: localityName ?? "Nearby location",
        });
      } catch (error) {
        console.error("Reverse geocoding failed", error);
        if (selectionId !== selectionRequestIdRef.current) {
          return;
        }

        useAppStore.getState().setCustomLocation({
          latitude,
          longitude,
          name: "Nearby location",
        });
        activeGeofenceRef.current = null;
        clearGeofenceLayerData();
      }
    };

    selectionControllerRef.current = selectLocation;

    const handleMapClick = (event: mapboxgl.MapMouseEvent) => {
      // Check if layers exist before querying to avoid exception
      const layers = ["flood-report-unclustered", "flood-report-clusters"].filter(
        (id) => map.getLayer(id)
      );

      if (layers.length > 0) {
        const clickedFeatures = map.queryRenderedFeatures(event.point, { layers });
        if (clickedFeatures.length > 0) {
          return; // Handled by specific layer listeners
        }
      }

      void selectLocation({
        latitude: event.lngLat.lat,
        longitude: event.lngLat.lng,
      });
    };

    map.on("click", handleMapClick);

    return () => {
      map.off("load", handleStyleLoad);
      map.off("click", handleMapClick);
      clearSelection();
      currentLocationMarkerRef.current?.remove();
      currentLocationMarkerRef.current = null;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      selectionControllerRef.current = null;
      map.remove();
      mapRef.current = null;
      setIsMapStyleLoaded(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !isMapStyleLoaded) {
      return;
    }

    map.easeTo({
      center: [mapCenter.longitude, mapCenter.latitude],
      zoom: mapCenter.zoom,
      duration: 500,
      essential: true,
    });
  }, [
    isMapStyleLoaded,
    mapCenter.latitude,
    mapCenter.longitude,
    mapCenter.zoom,
  ]);

  useEffect(() => {
    if (!mapRef.current || !mapboxToken || !isMapStyleLoaded) {
      return;
    }

    const map = mapRef.current;
    const reportsSourceId = "flood-reports-source";
    const clustersLayerId = "flood-report-clusters";
    const clusterCountLayerId = "flood-report-cluster-count";
    const unclusteredLayerId = "flood-report-unclustered";

    // Convert reports to GeoJSON with clustering
    const reportsGeoJSON: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: reports.map((report) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [report.longitude, report.latitude],
        },
        properties: {
          water_level: report.water_level,
          created_at: report.created_at,
          id: report.id,
          locality_name: report.locality_name,
          locality_key: report.locality_key,
        },
      })),
    };

    // Add or update source
    if (!map.getSource(reportsSourceId)) {
      map.addSource(reportsSourceId, {
        type: "geojson",
        data: reportsGeoJSON,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });
    } else {
      (map.getSource(reportsSourceId) as mapboxgl.GeoJSONSource).setData(
        reportsGeoJSON,
      );
    }

    // Remove old markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Cluster circles layer
    if (!map.getLayer(clustersLayerId)) {
      map.addLayer({
        id: clustersLayerId,
        type: "circle",
        source: reportsSourceId,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#facc15",
            3,
            "#fb923c",
            10,
            "#f97316",
          ],
          "circle-radius": ["step", ["get", "point_count"], 18, 3, 24, 10, 30],
        },
      });
    }

    // Cluster count labels
    if (!map.getLayer(clusterCountLayerId)) {
      map.addLayer({
        id: clusterCountLayerId,
        type: "symbol",
        source: reportsSourceId,
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-size": 12,
          "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
        },
        paint: {
          "text-color": "#000",
        },
      });
    }

    // Unclustered individual points
    if (!map.getLayer(unclusteredLayerId)) {
      map.addLayer({
        id: unclusteredLayerId,
        type: "circle",
        source: reportsSourceId,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": [
            "match",
            ["get", "water_level"],
            "ankle",
            "#facc15",
            "knee",
            "#fb923c",
            "waist",
            "#f97316",
            "severe",
            "#dc2626",
            "#999",
          ],
          "circle-radius": 8,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
        },
      });
    }

    // Handle cluster clicks to zoom
    map.on("click", clustersLayerId, (e) => {
      if (!e.features || !e.features[0]) return;
      const feature = e.features[0];
      if (
        feature.properties &&
        typeof feature.properties.cluster_id === "number"
      ) {
        const clusterId = feature.properties.cluster_id;
        const source = map.getSource(reportsSourceId) as mapboxgl.GeoJSONSource;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (source as any).getClusterExpansionZoom(
          clusterId,
          (err: Error | null, zoom: number) => {
            if (err) {
              console.error("Cluster expansion zoom error:", err);
              return;
            }

            if (!feature.geometry || feature.geometry.type !== "Point") {
              return;
            }

            map.easeTo({
              center: feature.geometry.coordinates as [number, number],
              zoom,
              duration: 300,
            });
          },
        );
      }
    });

    // Change cursor on cluster hover
    map.on("mouseenter", clustersLayerId, () => {
      if (map.getCanvas()) map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", clustersLayerId, () => {
      if (map.getCanvas()) map.getCanvas().style.cursor = "";
    });

    // Handle unclustered point clicks
    map.on("click", unclusteredLayerId, (e) => {
      if (!e.features || !e.features[0]) return;
      const feature = e.features[0];

      if (!feature.geometry || feature.geometry.type !== "Point") {
        return;
      }

      new mapboxgl.Popup({ offset: 16 })
        .setLngLat(feature.geometry.coordinates as [number, number])
        .setHTML(
          `<div style="font-family: sans-serif; font-size: 13px; color: #0f172a; padding: 2px;"><strong>${(feature.properties?.water_level || "Unknown").toUpperCase()}</strong><br />${new Date(feature.properties?.created_at || "").toLocaleString()}</div>`,
        )
        .addTo(map);

      // Trigger the selection UI to match the exact report locality
      void selectionControllerRef.current?.({
        latitude: feature.geometry.coordinates[1],
        longitude: feature.geometry.coordinates[0],
        preferredName: feature.properties?.locality_name,
      });
    });

    map.on("mouseenter", unclusteredLayerId, () => {
      if (map.getCanvas()) map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", unclusteredLayerId, () => {
      if (map.getCanvas()) map.getCanvas().style.cursor = "";
    });
  }, [isMapStyleLoaded, reports]);

  useEffect(() => {
    if (!mapRef.current || !mapboxToken || !isMapStyleLoaded) {
      return;
    }

    const map = mapRef.current;

    if (!map.getSource(locationAccuracySourceId)) {
      map.addSource(locationAccuracySourceId, {
        type: "geojson",
        data: emptyLocationAccuracyCollection,
      });
    }

    if (!map.getLayer(locationAccuracyFillLayerId)) {
      map.addLayer({
        id: locationAccuracyFillLayerId,
        type: "fill",
        source: locationAccuracySourceId,
        paint: {
          "fill-color": "#0284c7",
          "fill-opacity": 0.12,
        },
      });
    }

    if (!map.getLayer(locationAccuracyOutlineLayerId)) {
      map.addLayer({
        id: locationAccuracyOutlineLayerId,
        type: "line",
        source: locationAccuracySourceId,
        paint: {
          "line-color": "#0284c7",
          "line-width": 2,
          "line-opacity": 0.38,
        },
      });
    }

    const accuracySource = map.getSource(
      locationAccuracySourceId,
    ) as mapboxgl.GeoJSONSource;

    currentLocationMarkerRef.current?.remove();
    currentLocationMarkerRef.current = null;

    if (!currentLocation) {
      accuracySource.setData(emptyLocationAccuracyCollection);
      return;
    }

    accuracySource.setData(
      currentLocation.accuracy
        ? createAccuracyCircle(
            currentLocation.latitude,
            currentLocation.longitude,
            currentLocation.accuracy,
          )
        : emptyLocationAccuracyCollection,
    );

    const markerElement = document.createElement("div");
    markerElement.style.position = "relative";
    markerElement.style.width = "22px";
    markerElement.style.height = "22px";
    markerElement.style.borderRadius = "9999px";
    markerElement.style.zIndex = "5";
    markerElement.innerHTML = `
      <div style="position:absolute;inset:-11px;border-radius:9999px;background:rgba(14,165,233,0.22);animation:pulse 1.8s ease-in-out infinite;"></div>
      <div style="position:absolute;inset:0;border-radius:9999px;background:#0284c7;border:4px solid white;box-shadow:0 0 0 2px rgba(2,132,199,0.28),0 8px 18px rgba(15,23,42,0.28);"></div>
    `;

    currentLocationMarkerRef.current = new mapboxgl.Marker({
      element: markerElement,
      anchor: "center",
    })
      .setLngLat([currentLocation.longitude, currentLocation.latitude])
      .setPopup(
        new mapboxgl.Popup({ offset: 14 }).setHTML(
          `<div style="font-family: sans-serif; font-size: 12px;"><strong>Your location</strong><br />${formatLocationAccuracy(currentLocation.accuracy)}</div>`,
        ),
      )
      .addTo(map);

    return () => {
      currentLocationMarkerRef.current?.remove();
      currentLocationMarkerRef.current = null;
    };
  }, [currentLocation, isMapStyleLoaded]);

  if (!mapboxToken) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-amber-300/60 bg-amber-50/95 p-6 text-center text-amber-900 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">Mapbox token missing</h2>
          <p className="mt-2 text-sm">
            Add VITE_MAPBOX_TOKEN to .env.local to render the interactive map.
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className="relative h-full w-full overflow-hidden bg-slate-900">
      <div className="absolute left-1/2 top-3 z-20 -translate-x-1/2">
        <LocationSearchBar
          onSelectLocation={(location) => {
            void selectionControllerRef.current?.({
              latitude: location.latitude,
              longitude: location.longitude,
              preferredName: location.name,
            });
          }}
        />
      </div>
      <div className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-lg bg-slate-900/85 px-3 py-2 text-xs font-medium text-slate-100 backdrop-blur">
        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        Guwahati live view
      </div>
      <div ref={mapContainerRef} className="h-full w-full" />
    </section>
  );
}
