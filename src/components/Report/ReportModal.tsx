import { type FormEvent, useEffect, useRef, useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import type { FloodReport, WaterLevel } from "../../types/FloodReport";
import WaterLevelSelector from "./WaterLevelSelector";

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    latitude: number;
    longitude: number;
    waterLevel: WaterLevel;
    imageFile: File | null;
  }) => Promise<FloodReport>;
}

export default function ReportModal({
  open,
  onClose,
  onSubmit,
}: ReportModalProps) {
  const currentLocation = useAppStore((state) => state.currentLocation);
  const isSubmitting = useAppStore((state) => state.isSubmitting);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [waterLevel, setWaterLevel] = useState<WaterLevel | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvedLat = currentLocation?.latitude ?? NaN;
  const resolvedLng = currentLocation?.longitude ?? NaN;

  const stopCamera = (closePreview = true) => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (closePreview) {
      setIsCameraOpen(false);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera(false);
    };
  }, [open]);

  useEffect(() => {
    if (!isCameraOpen || !videoRef.current || !streamRef.current) {
      return;
    }

    videoRef.current.srcObject = streamRef.current;
    void videoRef.current.play().catch(() => {
      setError("Could not start the camera preview.");
    });
  }, [isCameraOpen]);

  if (!open) {
    return null;
  }

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const handleOpenCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera capture is not supported in this browser.");
      return;
    }

    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });

      streamRef.current = stream;
      setIsCameraOpen(true);
    } catch (cameraError) {
      const message =
        cameraError instanceof Error
          ? cameraError.message
          : "Could not open the camera.";
      setError(`Could not open the camera. ${message}`);
    }
  };

  const handleCapturePhoto = () => {
    const video = videoRef.current;

    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setError("Camera is not ready yet. Please try again.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");

    if (!context) {
      setError("Could not capture photo from the camera.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Could not save the captured photo.");
          return;
        }

        const photo = new File([blob], `flood-report-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        setImageFile(photo);
        stopCamera();
      },
      "image/jpeg",
      0.9,
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!waterLevel) {
      setError("Please choose a water level.");
      return;
    }

    if (Number.isNaN(resolvedLat) || Number.isNaN(resolvedLng)) {
      setError(
        "Location not detected. Please enable location services and try again.",
      );
      return;
    }

    setError(null);

    try {
      await onSubmit({
        latitude: resolvedLat,
        longitude: resolvedLng,
        waterLevel,
        imageFile,
      });
      handleClose();
      setWaterLevel(null);
      setImageFile(null);
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Could not submit report right now.";
      setError(message);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/55 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-[1.75rem] border border-white/80 bg-white/95 p-5 text-left font-normal text-slate-950 shadow-[0_24px_70px_rgba(15,23,42,0.24)] backdrop-blur-xl sm:p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-medium leading-tight text-slate-950">
              Report Flooding
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Help fellow Guwahatians by reporting current water conditions near
              you.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full px-3 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            Close
          </button>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <WaterLevelSelector value={waterLevel} onChange={setWaterLevel} />

          <div>
            <p className="text-base font-medium text-slate-950">
              Optional photo
            </p>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Capture a live image from your camera.
            </p>
            {isCameraOpen ? (
              <div className="mt-3 space-y-3">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="aspect-video w-full rounded-2xl bg-slate-900 object-cover"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCapturePhoto}
                    className="flex-1 rounded-full bg-sky-400 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(56,189,248,0.24)]"
                  >
                    Capture photo
                  </button>
                  <button
                    type="button"
                    onClick={() => stopCamera()}
                    className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleOpenCamera}
                  aria-label="Take a picture"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-sky-700 shadow-[0_10px_22px_rgba(56,189,248,0.14)] transition hover:bg-sky-100"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M14.5 4h-5L8 6H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3l-1.5-2Z" />
                    <circle cx="12" cy="13" r="3" />
                  </svg>
                </button>
                <div className="min-w-0 flex flex-1 items-center gap-2">
                  <span className="min-w-0 truncate text-sm font-medium text-slate-500">
                    {imageFile ? imageFile.name : "No photo selected"}
                  </span>
                  {imageFile ? (
                    <button
                      type="button"
                      onClick={() => setImageFile(null)}
                      aria-label="Remove captured photo"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
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
                        aria-hidden="true"
                      >
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </button>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          {error ? (
            <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-sky-400 px-6 py-3.5 text-base font-semibold text-white shadow-[0_14px_30px_rgba(56,189,248,0.26)] focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
          >
            {isSubmitting ? "Submitting..." : "Submit report"}
          </button>
        </form>
      </div>
    </div>
  );
}
