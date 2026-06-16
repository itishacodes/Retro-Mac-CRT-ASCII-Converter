import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import blissBg from "@/assets/bliss-bg.jpg";
import macImg from "@/assets/vintage-mac.png";

const CHAR_SETS: Record<string, string> = {
  Blocks: " ░▒▓█",
  Standard: " .:-=+*#%@",
  Minimal: " .:-=+*",
  Detailed: " .'`^\",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
  Binary: " 01",
};

export default function App() {
  const [detail, setDetail] = useState(100);
  const [res, setRes] = useState(135);
  const [charSet, setCharSet] = useState<keyof typeof CHAR_SETS>("Blocks");
  const [invert, setInvert] = useState(false);
  const [color, setColor] = useState(false);
  const [ascii, setAscii] = useState<string>("");
  const [colorData, setColorData] = useState<string[][] | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const convert = useCallback(
    (img: HTMLImageElement) => {
      const chars = CHAR_SETS[charSet];
      const ramp = invert ? chars.split("").reverse().join("") : chars;
      const w = res;
      const h = Math.round((img.height / img.width) * w * 0.5);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      const contrast = detail / 100;
      let out = "";
      const colors: string[][] = [];
      for (let y = 0; y < h; y++) {
        const row: string[] = [];
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          let lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          lum = Math.min(1, Math.max(0, (lum - 0.5) * contrast + 0.5));
          if (a < 32) lum = invert ? 1 : 0;
          const idx = Math.floor(lum * (ramp.length - 1));
          out += ramp[idx];
          row.push(`rgb(${r},${g},${b})`);
        }
        out += "\n";
        colors.push(row);
      }
      setAscii(out);
      setColorData(colors);
    },
    [charSet, detail, res, invert],
  );

  const loadFile = useCallback(
    (file: File) => {
      setFileName(file.name);
      setLoading(true);
      setProgress(0);
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        let p = 0;
        const tick = () => {
          p += 12;
          setProgress(Math.min(100, p));
          if (p < 100) requestAnimationFrame(tick);
          else {
            convert(img);
            setLoading(false);
            URL.revokeObjectURL(url);
          }
        };
        tick();
      };
      img.src = url;
    },
    [convert],
  );

  useEffect(() => {
    if (imgRef.current && !loading) convert(imgRef.current);
  }, [convert, loading]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith("image/")) loadFile(f);
  };

  const headerStatus = loading
    ? `LOADING: ${fileName.toUpperCase()}`
    : ascii
      ? `RENDERED: ${imgRef.current?.width}x${imgRef.current?.height} → ASCII`
      : "READY — AWAITING INPUT";

  const reset = () => {
    setAscii("");
    setColorData(null);
    setFileName("");
    imgRef.current = null;
    setDetail(100);
    setRes(135);
    setCharSet("Blocks");
    setInvert(false);
    setColor(false);
  };

  const copyText = () => navigator.clipboard.writeText(ascii);

  const downloadTxt = () => {
    const blob = new Blob([ascii], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${fileName || "ascii"}.txt`;
    a.click();
  };

  const downloadPng = () => {
    const lines = ascii.split("\n");
    const fs = 10;
    const canvas = document.createElement("canvas");
    canvas.width = (lines[0]?.length || 1) * (fs * 0.6);
    canvas.height = lines.length * fs;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${fs}px monospace`;
    ctx.textBaseline = "top";
    lines.forEach((line, y) => {
      if (color && colorData) {
        for (let x = 0; x < line.length; x++) {
          ctx.fillStyle = colorData[y]?.[x] || "#39FF14";
          ctx.fillText(line[x], x * fs * 0.6, y * fs);
        }
      } else {
        ctx.fillStyle = "#39FF14";
        ctx.fillText(line, 0, y * fs);
      }
    });
    canvas.toBlob((b) => {
      if (!b) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b);
      a.download = `${fileName || "ascii"}.png`;
      a.click();
    });
  };

  const asciiLines = useMemo(() => ascii.split("\n"), [ascii]);

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden font-mono"
      style={{
        backgroundImage: `url(${blissBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="fixed left-6 top-1/2 z-20 w-44 -translate-y-1/2 rounded-md border border-[#39FF14]/40 bg-black/80 p-4 text-[#39FF14] shadow-[0_0_20px_rgba(57,255,20,0.2)] backdrop-blur">
        <div className="space-y-4 text-[11px] uppercase tracking-widest">
          <div>
            <div className="flex items-center justify-between">
              <span>Detail</span>
              <span className="h-2 w-2 rounded-full bg-[#39FF14] shadow-[0_0_6px_#39FF14]" />
            </div>
            <input type="range" min={20} max={200} value={detail} onChange={(e) => setDetail(+e.target.value)} className="ascii-slider mt-2 w-full" />
            <div className="mt-1 text-[10px]">{detail}%</div>
          </div>
          <div>
            <div>Res</div>
            <input type="range" min={40} max={240} value={res} onChange={(e) => setRes(+e.target.value)} className="ascii-slider mt-2 w-full" />
            <div className="mt-1 text-[10px]">{res}</div>
          </div>
          <div>
            <div>Chars</div>
            <select value={charSet} onChange={(e) => setCharSet(e.target.value as keyof typeof CHAR_SETS)} className="mt-2 w-full rounded border border-[#39FF14]/50 bg-black px-2 py-1 text-[#39FF14]">
              {Object.keys(CHAR_SETS).map((k) => (<option key={k}>{k}</option>))}
            </select>
          </div>
        </div>
      </div>

      {ascii && (
        <button onClick={reset} className="fixed bottom-6 left-6 z-20 rounded border border-[#39FF14]/50 bg-black/80 px-3 py-1.5 text-[11px] uppercase tracking-widest text-[#39FF14] hover:bg-[#39FF14]/10">
          [ Reset ]
        </button>
      )}

      <div className="relative flex min-h-screen items-center justify-center">
        <div className="relative" style={{ height: "100vh", aspectRatio: "1 / 1" }}>
          <img src={macImg} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-contain select-none" draggable={false} />
          <div
            className="absolute overflow-hidden rounded-[1.5%] bg-black text-[#39FF14]"
            style={{ left: "21%", top: "20%", width: "58%", height: "47%", boxShadow: "inset 0 0 60px rgba(0,0,0,0.9)" }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => !ascii && !loading && fileInputRef.current?.click()}
          >
            <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.4) 0 1px, transparent 1px 3px)" }} />
            <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(rgba(57,255,20,0.15) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

            <div className="relative flex items-center justify-between px-4 pt-3 text-[10px] uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 bg-[#39FF14] shadow-[0_0_6px_#39FF14]" />
                <span className="font-bold">ASCII Terminal</span>
              </div>
              <div className="opacity-80">{headerStatus}</div>
            </div>
            <div className="mx-4 mt-2 border-t border-dashed border-[#39FF14]/40" />

            {ascii && !loading && (
              <div className="relative mt-2 flex flex-wrap gap-2 px-4 text-[10px] uppercase tracking-widest">
                {[
                  { l: "[ Copy ]", a: copyText },
                  { l: "[ .txt ]", a: downloadTxt },
                  { l: "[ .png ]", a: downloadPng },
                  { l: "[ Invert ]", a: () => setInvert((v) => !v) },
                  { l: "[ Color ]", a: () => setColor((v) => !v) },
                ].map((b) => (
                  <button key={b.l} onClick={b.a} className="rounded border border-[#39FF14]/50 px-2 py-0.5 hover:bg-[#39FF14]/10">{b.l}</button>
                ))}
              </div>
            )}

            <div className="relative h-[calc(100%-3.5rem)] w-full overflow-hidden">
              {!ascii && !loading && (
                <div className={`flex h-full w-full cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed text-center transition-colors ${dragging ? "border-[#39FF14] bg-[#39FF14]/10" : "border-[#39FF14]/30"}`}>
                  <div className="grid grid-cols-3 gap-1.5">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <span key={i} className={`h-1.5 w-1.5 rounded-full ${[1, 4, 7].includes(i) ? "bg-[#39FF14] shadow-[0_0_4px_#39FF14]" : "bg-[#39FF14]/0"}`} />
                    ))}
                  </div>
                  <div className="text-sm font-bold tracking-widest">&gt; DROP IMAGE HERE _</div>
                  <div className="text-[10px] opacity-70">or click to browse // .png .jpg .gif .webp</div>
                </div>
              )}

              {loading && (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-8">
                  <div className="text-sm tracking-widest">ASCII Terminal</div>
                  <div className="h-3 w-full border border-[#39FF14]/60">
                    <div className="h-full bg-[#39FF14] shadow-[0_0_10px_#39FF14] transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="text-[10px] tracking-widest">Loading {progress}%</div>
                </div>
              )}

              {ascii && !loading && (
                <div className="h-full w-full overflow-auto px-4 pb-3 pt-1">
                  <pre className="leading-[1] text-[6px] sm:text-[7px] md:text-[8px]" style={{ fontFamily: "ui-monospace, monospace" }}>
                    {color && colorData
                      ? asciiLines.map((line, y) => (
                          <div key={y}>
                            {line.split("").map((ch, x) => (
                              <span key={x} style={{ color: colorData[y]?.[x] }}>{ch}</span>
                            ))}
                          </div>
                        ))
                      : ascii}
                  </pre>
                </div>
              )}
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); }} />
          </div>
        </div>
      </div>

      <style>{`
        .ascii-slider { -webkit-appearance: none; appearance: none; height: 2px; background: #39FF14; border-radius: 1px; outline: none; }
        .ascii-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; border-radius: 50%; background: #39FF14; box-shadow: 0 0 8px #39FF14; cursor: pointer; }
        .ascii-slider::-moz-range-thumb { width: 12px; height: 12px; border-radius: 50%; background: #39FF14; border: none; box-shadow: 0 0 8px #39FF14; cursor: pointer; }
      `}</style>
    </div>
  );
}
