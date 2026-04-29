import { useEffect, useRef, useState } from "react";
import MapView from "./components/Map/MapView";
import InstallPrompt from "./components/PWA/InstallPrompt";
import ReportModal from "./components/Report/ReportModal";
import Layout from "./components/UI/Layout";
import {
  getRecentReports,
  submitReport,
  uploadReportImage,
} from "./features/floodReports/reportService";
import { getFloodProneZones } from "./features/map/zoneService";
import { useGeolocation } from "./hooks/useGeolocation";
import { useRealtimeReports } from "./hooks/useRealtimeReports";
import { isSupabaseConfigured } from "./services/supabaseClient";
import { useAppStore } from "./store/useAppStore";
import type { WaterLevel } from "./types/FloodReport";

function App() {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [zoneLoadError, setZoneLoadError] = useState<string | null>(null);
  const [realtimeError, setRealtimeError] = useState<string | null>(null);
  const hasAutoCenteredRef = useRef(false);
  const hasAutoCenteredOnAccurateFixRef = useRef(false);

  const {
    latitude,
    longitude,
    accuracy,
    loading,
    error: locationError,
  } = useGeolocation({ watch: true });

  const setReports = useAppStore((state) => state.setReports);
  const setFloodProneZones = useAppStore((state) => state.setFloodProneZones);
  const setCurrentLocation = useAppStore((state) => state.setCurrentLocation);
  const setMapCenter = useAppStore((state) => state.setMapCenter);
  const upsertReport = useAppStore((state) => state.upsertReport);
  const removeReport = useAppStore((state) => state.removeReport);
  const setIsSubmitting = useAppStore((state) => state.setIsSubmitting);

  useRealtimeReports({
    enabled: isSupabaseConfigured,
    onInsert: upsertReport,
    onUpdate: upsertReport,
    onDelete: removeReport,
    onError: setRealtimeError,
  });

  useEffect(() => {
    let ignore = false;

    async function loadFloodProneZones() {
      try {
        const zones = await getFloodProneZones();
        if (!ignore) {
          setFloodProneZones(zones);
        }
      } catch (error) {
        if (!ignore) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to load flood-prone zones.";
          setZoneLoadError(message);
        }
      }
    }

    loadFloodProneZones();

    return () => {
      ignore = true;
    };
  }, [setFloodProneZones]);

  useEffect(() => {
    let ignore = false;

    async function loadReports() {
      if (!isSupabaseConfigured) {
        return;
      }

      try {
        const reports = await getRecentReports(2);
        if (!ignore) {
          setReports(reports);
        }
      } catch (error) {
        if (!ignore) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to load reports from Supabase.";
          setLoadError(message);
        }
      }
    }

    loadReports();

    return () => {
      ignore = true;
    };
  }, [setReports]);

  useEffect(() => {
    if (latitude == null || longitude == null) {
      return;
    }

    setCurrentLocation({
      latitude,
      longitude,
      accuracy,
    });

    const hasAccurateFix = accuracy != null && accuracy <= 100;

    if (
      hasAutoCenteredRef.current &&
      (!hasAccurateFix || hasAutoCenteredOnAccurateFixRef.current)
    ) {
      return;
    }

    hasAutoCenteredRef.current = true;
    hasAutoCenteredOnAccurateFixRef.current = hasAccurateFix;
    setMapCenter({
      latitude,
      longitude,
      zoom: hasAccurateFix ? 15.2 : 13.4,
    });
  }, [accuracy, latitude, longitude, setCurrentLocation, setMapCenter]);

  const handleReportSubmit = async (payload: {
    latitude: number;
    longitude: number;
    waterLevel: WaterLevel;
    imageFile: File | null;
  }) => {
    setIsSubmitting(true);

    try {
      const state = useAppStore.getState();
      const customLocation = state.customLocation;
      const selectedLocalityId = state.selectedLocalityId;
      let imageUrl: string | null = null;
      let imagePath: string | null = null;

      if (payload.imageFile) {
        const uploadedImage = await uploadReportImage(
          payload.imageFile,
          selectedLocalityId,
        );
        imageUrl = uploadedImage.imageUrl;
        imagePath = uploadedImage.imagePath;
      }

      const newReport = await submitReport({
        latitude: customLocation?.latitude ?? payload.latitude,
        longitude: customLocation?.longitude ?? payload.longitude,
        locality_key: selectedLocalityId ?? undefined,
        locality_name: customLocation?.name ?? undefined,
        water_level: payload.waterLevel,
        image_url: imageUrl,
        image_path: imagePath,
      });

      upsertReport(newReport);
      return newReport;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <MapView onReportClick={() => setIsReportModalOpen(true)} />
      {loadError ? (
        <div className="pointer-events-none absolute left-6 top-28 z-20 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 shadow">
          {loadError}
        </div>
      ) : null}
      {zoneLoadError ? (
        <div className="pointer-events-none absolute left-6 top-40 z-20 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 shadow">
          {zoneLoadError}
        </div>
      ) : null}
      {realtimeError ? (
        <div className="pointer-events-none absolute left-6 top-[8.5rem] z-20 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 shadow">
          {realtimeError}
        </div>
      ) : null}
      {locationError ? (
        <div className="pointer-events-none absolute left-6 top-[10.5rem] z-20 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 shadow">
          {locationError}
        </div>
      ) : loading ? (
        <div className="pointer-events-none absolute left-6 top-[10.5rem] z-20 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 shadow">
          Detecting your location...
        </div>
      ) : null}
      {!isSupabaseConfigured ? (
        <div className="pointer-events-none absolute left-6 top-28 z-20 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 shadow">
          Configure Supabase keys in .env.local to enable reporting.
        </div>
      ) : null}
      <InstallPrompt />
      <ReportModal
        open={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSubmit={handleReportSubmit}
      />
    </Layout>
  );
}

export default App;
