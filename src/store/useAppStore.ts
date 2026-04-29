import { create } from "zustand";
import type { FloodReport, MapCenter } from "../types/FloodReport";
import type { FloodProneZonesFeatureCollection } from "../types/FloodZone";

const defaultMapCenter: MapCenter = {
  latitude: 26.1445,
  longitude: 91.7362,
  zoom: 12.8,
};

interface AppState {
  reports: FloodReport[];
  floodProneZones: FloodProneZonesFeatureCollection | null;
  mapCenter: MapCenter;
  isSubmitting: boolean;
  currentLocation: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
  } | null;
  selectedReportId: string | null;
  selectedLocalityId: string | null;
  customLocation: {
    latitude: number;
    longitude: number;
    name: string | null;
  } | null;
  setMapCenter: (center: MapCenter) => void;
  setReports: (reports: FloodReport[]) => void;
  setFloodProneZones: (
    floodProneZones: FloodProneZonesFeatureCollection | null,
  ) => void;
  setCurrentLocation: (
    location: {
      latitude: number;
      longitude: number;
      accuracy: number | null;
    } | null,
  ) => void;
  addReport: (report: FloodReport) => void;
  upsertReport: (report: FloodReport) => void;
  removeReport: (reportId: string) => void;
  setIsSubmitting: (isSubmitting: boolean) => void;
  setSelectedReportId: (selectedReportId: string | null) => void;
  setSelectedLocalityId: (selectedLocalityId: string | null) => void;
  setCustomLocation: (
    location: {
      latitude: number;
      longitude: number;
      name: string | null;
    } | null,
  ) => void;
}

export const useAppStore = create<AppState>((set) => ({
  reports: [],
  floodProneZones: null,
  mapCenter: defaultMapCenter,
  isSubmitting: false,
  currentLocation: null,
  selectedReportId: null,
  selectedLocalityId: null,
  customLocation: null,
  setMapCenter: (center) => set({ mapCenter: center }),
  setReports: (reports) => set({ reports }),
  setFloodProneZones: (floodProneZones) => set({ floodProneZones }),
  setCurrentLocation: (currentLocation) => set({ currentLocation }),
  addReport: (report) =>
    set((state) => ({ reports: [report, ...state.reports] })),
  upsertReport: (report) =>
    set((state) => {
      const existingIndex = state.reports.findIndex(
        (item) => item.id === report.id,
      );

      if (existingIndex === -1) {
        return { reports: [report, ...state.reports] };
      }

      const nextReports = [...state.reports];
      nextReports[existingIndex] = report;
      return { reports: nextReports };
    }),
  removeReport: (reportId) =>
    set((state) => ({
      reports: state.reports.filter((report) => report.id !== reportId),
    })),
  setIsSubmitting: (isSubmitting) => set({ isSubmitting }),
  setSelectedReportId: (selectedReportId) => set({ selectedReportId }),
  setSelectedLocalityId: (selectedLocalityId) => set({ selectedLocalityId }),
  setCustomLocation: (customLocation) => set({ customLocation }),
}));
