"use client";

import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { renderShareCard, ShareCardData } from "@/lib/shareCard";

interface ShareCardButtonProps {
  data: Omit<ShareCardData, "dateLabel">;
}

export default function ShareCardButton({ data }: ShareCardButtonProps) {
  const [open, setOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleOpen = useCallback(() => {
    setOpen(true);
    requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dateLabel = new Date().toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      renderShareCard(canvas, { ...data, dateLabel });
    });
  }, [data]);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "sona-voice-stability.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, []);

  return (
    <>
      <button
        onClick={handleOpen}
        className="rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground/80 transition hover:bg-surface"
      >
        Share results
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
            onClick={() => setOpen(false)}
          >
            <div
              className="flex w-full max-w-lg flex-col gap-4 rounded-2xl bg-surface p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <canvas ref={canvasRef} className="w-full rounded-xl" />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground/80 transition hover:bg-background"
                >
                  Close
                </button>
                <button
                  onClick={handleDownload}
                  className="rounded-full px-4 py-2 text-sm font-medium text-white transition"
                  style={{
                    background: "linear-gradient(180deg, #f4823f 0%, #f2601f 100%)",
                    boxShadow: "0 3px 0 0 #c94c15",
                  }}
                >
                  Download image
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
