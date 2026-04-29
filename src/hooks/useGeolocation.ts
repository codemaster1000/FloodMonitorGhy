import { useEffect, useState } from "react";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  loading: boolean;
  error: string | null;
}

interface UseGeolocationOptions {
  watch?: boolean;
  timeoutMs?: number;
}

function getGeolocationUnavailableMessage() {
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return "Location requires a secure connection. Use localhost during development or serve the app over HTTPS.";
  }

  return "Geolocation is not supported by your browser.";
}

function getGeolocationErrorMessage(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) {
    return "Location permission is blocked. Allow location access in your browser settings and reload the app.";
  }

  if (error.code === error.POSITION_UNAVAILABLE) {
    return "Your browser could not determine your location. Check device location services and network/GPS access.";
  }

  if (error.code === error.TIMEOUT) {
    return "Location detection timed out. Check device location services and try again.";
  }

  return error.message;
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const { watch = false, timeoutMs = 60000 } = options;
  const geolocationSupported =
    typeof navigator !== "undefined" && "geolocation" in navigator;

  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    loading: geolocationSupported,
    error: geolocationSupported
      ? null
      : getGeolocationUnavailableMessage(),
  });

  useEffect(() => {
    if (!geolocationSupported) {
      return;
    }

    let hasReceivedPosition = false;

    const onSuccess = (position: GeolocationPosition) => {
      hasReceivedPosition = true;
      setState({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        loading: false,
        error: null,
      });
    };

    const onError = (error: GeolocationPositionError) => {
      setState((prev) => ({
        ...prev,
        loading: false,
        error:
          hasReceivedPosition || prev.latitude != null || prev.longitude != null
            ? prev.error
            : getGeolocationErrorMessage(error),
      }));
    };

    if (watch) {
      navigator.geolocation.getCurrentPosition(onSuccess, () => undefined, {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: Infinity,
      });

      const watchId = navigator.geolocation.watchPosition(onSuccess, onError, {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 300000, // Allow cached position up to 5 minutes old
      });

      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    }

    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: timeoutMs,
      maximumAge: 60000, // Allow cached position up to 1 minute old for one-shot
    });
  }, [geolocationSupported, timeoutMs, watch]);

  return state;
}
