"use client";

import { useEffect, useRef } from "react";

interface WaveformProps {
  analyser: AnalyserNode | null;
  active: boolean;
}

export default function Waveform({ analyser, active }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const bufferLength = analyser?.fftSize ?? 2048;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      ctx!.clearRect(0, 0, width, height);

      if (!analyser || !active) {
        ctx!.strokeStyle = "rgba(109,92,230,0.15)";
        ctx!.lineWidth = 2;
        ctx!.beginPath();
        ctx!.moveTo(0, height / 2);
        ctx!.lineTo(width, height / 2);
        ctx!.stroke();
        return;
      }

      analyser.getByteTimeDomainData(dataArray);

      ctx!.lineWidth = 2.5;
      const gradient = ctx!.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, "#f2601f");
      gradient.addColorStop(1, "#f4a05f");
      ctx!.strokeStyle = gradient;
      ctx!.beginPath();

      const sliceWidth = width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;
        if (i === 0) ctx!.moveTo(x, y);
        else ctx!.lineTo(x, y);
        x += sliceWidth;
      }
      ctx!.stroke();
    }

    draw();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [analyser, active]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-24 rounded-2xl"
      style={{ width: "100%", height: "96px" }}
    />
  );
}
