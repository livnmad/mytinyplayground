import React, { useEffect, useMemo, useRef, useState } from 'react';
import './css/body.css';

const Body: React.FC = () => {
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageList, setImageList] = useState<string[]>([]);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [transparency, setTransparency] = useState<number>(50); // percent transparency (0-100)
  const [isErasing, setIsErasing] = useState<boolean>(false);
  const [brushSize, setBrushSize] = useState<number>(5); // px diameter
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const brushSizeRef = useRef<number>(5); // default 5px round brush
  const eraserSizeRef = useRef<number>(10); // eraser radius (synced to brushSize)
  const isErasingRef = useRef<boolean>(false);

  useEffect(() => { isErasingRef.current = isErasing; }, [isErasing]);
  useEffect(() => { brushSizeRef.current = brushSize; eraserSizeRef.current = brushSize; }, [brushSize]);

  const colors = useMemo(() => {
    // Always include black, white, grey, and primary colors
    const fixed = [
      '#000000', // black
      '#FFFFFF', // white
      '#808080', // grey
      '#FF0000', // red
      '#00FF00', // green
      '#0000FF', // blue
      '#FFFF00', // yellow
    ];

    const target = 15;
    const needed = Math.max(0, target - fixed.length);

    // Fill remaining slots with evenly spaced vibrant HSL colors
    const generated: string[] = [];
    for (let i = 0; i < needed; i++) {
      const h = Math.round((360 / needed) * i);
      const s = 85; // vibrant
      const l = 55; // mid-lightness for good contrast
      generated.push(`hsl(${h} ${s}% ${l}%)`);
    }

    return [...fixed, ...generated];
  }, []);

  const onPickColor = (color: string) => {
    setIsErasing(false);
    setSelectedColor(color);
    try {
      localStorage.setItem('selectedColor', color);
      window.dispatchEvent(new CustomEvent('palette:selected', { detail: { color } }));
    } catch {}
  };

  // Load persisted color & image if present
  useEffect(() => {
    try {
      const saved = localStorage.getItem('selectedColor');
      if (saved) setSelectedColor(saved);
      const savedImg = localStorage.getItem('currentImageSrc');
      if (savedImg) setImageSrc(savedImg);
      const savedSize = localStorage.getItem('brushSize');
      if (savedSize) {
        const n = parseInt(savedSize, 10);
        if (!Number.isNaN(n) && n > 0) setBrushSize(n);
      }
      const savedAlpha = localStorage.getItem('alphaPercent');
      if (savedAlpha) {
        const a = parseInt(savedAlpha, 10);
        if (!Number.isNaN(a) && a >= 0 && a <= 100) setTransparency(a);
      }
    } catch {}
  }, []);
  // Fetch available images from the server
  useEffect(() => {
    const loadImages = async () => {
      try {
        const resp = await fetch('/api/images');
        const data = await resp.json();
        if (Array.isArray(data.images)) {
          setImageList(data.images);
          if (!imageSrc && data.images.length > 0) {
            const first = data.images[0];
            setImageSrc(first);
            try { localStorage.setItem('currentImageSrc', first); } catch {}
          }
        }
      } catch (e) {
        // ignore
      }
    };
    loadImages();
  }, [imageSrc]);

  // Handle New: rotate to next image (sequential) and clear canvas
  useEffect(() => {
    const onNew = async () => {
      // Refresh image list to capture any newly added files
      let list = imageList;
      try {
        const resp = await fetch('/api/images');
        const data = await resp.json();
        if (Array.isArray(data.images)) {
          list = data.images;
          setImageList(list);
        }
      } catch {}

      if (!list || list.length === 0) return;
      const current = imageSrc;
      const idx = current ? list.indexOf(current) : -1;
      const next = idx >= 0 ? list[(idx + 1) % list.length] : list[0];
      setImageSrc(next);
      try { localStorage.setItem('currentImageSrc', next); } catch {}

      const canvas = canvasRef.current;
      const ctx = getCtx();
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
    window.addEventListener('image:new' as any, onNew as EventListener);
    return () => window.removeEventListener('image:new' as any, onNew as EventListener);
  }, [imageList, imageSrc]);

  // Persist brush size
  useEffect(() => {
    try { localStorage.setItem('brushSize', String(brushSize)); } catch {}
  }, [brushSize]);

  // Persist transparency and update cursor preview when it changes
  useEffect(() => {
    try { localStorage.setItem('alphaPercent', String(transparency)); } catch {}
    updateCursor();
  }, [transparency]);

  // Keep cursor preview in sync with other controls
  useEffect(() => {
    updateCursor();
  }, [selectedColor, isErasing, brushSize]);

  // Resize canvas to fill stage and account for device pixel ratio
  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  };

  useEffect(() => {
    resizeCanvas();
    const onResize = () => resizeCanvas();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Open confirmation when clear is requested
  useEffect(() => {
    const onRequestClear = () => setShowConfirm(true);
    window.addEventListener('canvas:request-clear' as any, onRequestClear as EventListener);
    return () => window.removeEventListener('canvas:request-clear' as any, onRequestClear as EventListener);
  }, []);

  // Clear canvas when 'canvas:clear' is dispatched
  useEffect(() => {
    const handler = () => {
      const canvas = canvasRef.current;
      const ctx = getCtx();
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    window.addEventListener('canvas:clear' as any, handler as EventListener);
    return () => window.removeEventListener('canvas:clear' as any, handler as EventListener);
  }, []);

  // Basic paint handlers
  const getCtx = (): CanvasRenderingContext2D | null => {
    const canvas = canvasRef.current;
    return canvas ? canvas.getContext('2d') : null;
  };

  const pointerToStage = (evt: React.PointerEvent<HTMLCanvasElement>) => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const rect = stage.getBoundingClientRect();
    return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
  };

  const updateCursor = (evt?: React.PointerEvent<HTMLCanvasElement>) => {
    const dot = cursorRef.current;
    const stage = stageRef.current;
    if (!dot || !stage) return;
    if (evt) {
      const p = pointerToStage(evt);
      dot.style.left = `${p.x}px`;
      dot.style.top = `${p.y}px`;
    }
    const size = brushSizeRef.current;
    dot.style.width = `${size}px`;
    dot.style.height = `${size}px`;
    if (isErasingRef.current) {
      dot.style.background = 'transparent';
      dot.style.border = '2px solid #111827';
      dot.style.opacity = '1';
      dot.style.boxShadow = '0 0 0 2px rgba(255,255,255,0.6)';
    } else {
      const alpha = Math.max(0, Math.min(1, 1 - transparency / 100));
      const color = selectedColor || '#000000';
      dot.style.background = color;
      dot.style.border = '2px solid rgba(0,0,0,0.3)';
      dot.style.opacity = `${alpha}`;
      dot.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
    }
  };

  const startDraw = (evt: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = getCtx();
    if (!ctx) return;
    isDrawingRef.current = true;
    const p = pointerToStage(evt);
    lastPointRef.current = p;
    const color = selectedColor || '#000000';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (isErasingRef.current) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = brushSizeRef.current;
      ctx.beginPath();
      ctx.arc(p.x, p.y, brushSizeRef.current / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.max(0, Math.min(1, 1 - transparency / 100));
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = brushSizeRef.current;
      ctx.beginPath();
      ctx.arc(p.x, p.y, brushSizeRef.current / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const moveDraw = (evt: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    const p = pointerToStage(evt);
    const last = lastPointRef.current || p;
    const color = selectedColor || '#000000';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (isErasingRef.current) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = brushSizeRef.current;
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = Math.max(0, Math.min(1, 1 - transparency / 100));
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSizeRef.current;
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    lastPointRef.current = p;
  };

  const endDraw = () => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  const handlePointerEnter = () => {
    const dot = cursorRef.current;
    if (dot) {
      dot.style.display = 'block';
      updateCursor();
    }
  };

  const handlePointerMove = (evt: React.PointerEvent<HTMLCanvasElement>) => {
    updateCursor(evt);
    moveDraw(evt);
  };

  const handlePointerLeave = () => {
    endDraw();
    const dot = cursorRef.current;
    if (dot) dot.style.display = 'none';
  };

  return (
    <div className='body'>
      <div className='pallette-area'>
        <div className="alpha-row" aria-label="Transparency control">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={transparency}
            onChange={(e) => setTransparency(Number(e.target.value))}
            className="alpha-range"
          />
        </div>
        {/* Brush size options: 4x2 grid, 4px..32px by 4px increments */}
        <div
          className="size-grid"
          aria-label="Brush size options"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gridTemplateRows: 'repeat(2, 1fr)',
            gap: 6,
            margin: '2px 0 8px 0',
            border: 0,
          }}
        >
          {[4,8,12,16,20,24,28,32].map((s) => (
            <button
              key={s}
              title={`${s}px ${isErasing ? 'eraser' : 'brush'}`}
              onClick={() => setBrushSize(s)}
              style={{
                border: brushSize === s ? '2px solid #000' : '2px solid rgba(0,0,0,0.1)',
                borderRadius: 10,
                display: 'grid',
                placeItems: 'center',
                padding: 0,
                height: 'clamp(36px, 5vh, 48px)', /* non-square for better fit */
                cursor: 'pointer',
                boxShadow: brushSize === s
                  ? '0 0 0 2px rgba(0,0,0,0.2), 0 6px 12px rgba(0,0,0,0.12)'
                  : '0 2px 0 rgba(0,0,0,0.06), 0 6px 12px rgba(0,0,0,0.08)'
              }}
            >
              <div
                style={isErasing ? {
                  width: s,
                  height: s,
                  borderRadius: '50%',
                  background: 'transparent',
                  border: '3px solid #111827',
                  boxShadow: '0 0 0 2px rgba(255,255,255,0.6)'
                } : {
                  width: s,
                  height: s,
                  borderRadius: '50%',
                  background: selectedColor || '#000000',
                  opacity: Math.max(0, Math.min(1, 1 - transparency / 100)),
                  border: '2px solid rgba(0,0,0,0.25)'
                }}
              />
            </button>
          ))}
        </div>
        <div
          className="palette-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            /* let rows auto-size to avoid forcing squares */
            gap: 8,
          }}
        >
          {colors.map((c, i) => {
            const isLast = i === colors.length - 1;
            if (isLast) {
              return (
                <button
                  key={i}
                  title={'Erase'}
                  onClick={() => setIsErasing(true)}
                  style={{
                    background: 'repeating-linear-gradient(45deg, #f3f4f6 0 8px, #e5e7eb 8px 16px)',
                    border: isErasing ? '2px solid #000' : '2px solid rgba(255,255,255,0.9)',
                    borderRadius: 12,
                    display: 'grid',
                    placeItems: 'center',
                    padding: 8,
                    height: 'clamp(36px, 5vh, 48px)', /* non-square */
                    cursor: 'pointer',
                    boxShadow: isErasing
                      ? '0 0 0 2px rgba(0,0,0,0.2), 0 6px 12px rgba(0,0,0,0.12)'
                      : '0 2px 0 rgba(0,0,0,0.06), 0 6px 12px rgba(0,0,0,0.08)'
                  }}
                >
                  <span style={{
                    fontWeight: 800,
                    color: '#111827',
                    fontSize: 'clamp(0.9rem, 1.8vw, 1.1rem)'
                  }}>Erase</span>
                </button>
              );
            }
            return (
              <button
                key={i}
                title={`Pick color ${i + 1}`}
                onClick={() => onPickColor(c)}
                style={{
                  background: c,
                  border: selectedColor === c && !isErasing ? '2px solid #000' : '2px solid rgba(255,255,255,0.9)',
                  borderRadius: 12,
                  display: 'grid',
                  placeItems: 'center',
                  padding: 8,
                  height: 'clamp(36px, 5vh, 48px)', /* non-square */
                  cursor: 'pointer',
                  boxShadow: selectedColor === c && !isErasing
                    ? '0 0 0 2px rgba(0,0,0,0.2), 0 6px 12px rgba(0,0,0,0.12)'
                    : '0 2px 0 rgba(0,0,0,0.06), 0 6px 12px rgba(0,0,0,0.08)'
                }}
              >
              </button>
            );
          })}
        </div>
        {/* Selected display removed as requested */}
      </div>
      <div className='image-area'>
        <div ref={stageRef} className='paint-stage'>
          {imageSrc ? (
            <img className='paint-image' src={imageSrc} alt='To color' />
          ) : (
            <div className='paint-placeholder'>Add an image to start painting</div>
          )}
          <canvas
            ref={canvasRef}
            className='paint-canvas'
            onPointerDown={startDraw}
            onPointerMove={handlePointerMove}
            onPointerEnter={handlePointerEnter}
            onPointerUp={endDraw}
            onPointerLeave={handlePointerLeave}
          />
          <div ref={cursorRef} className='cursor-dot' />
          {showConfirm && (
            <div className='confirm-overlay' role='dialog' aria-modal='true' aria-labelledby='confirm-title'>
              <div className='confirm-card'>
                <div className='confirm-title' id='confirm-title'>Are you sure?</div>
                <div className='confirm-subtitle'>This will clear your painting.</div>
                <div className='confirm-actions'>
                  <button
                    className='btn-yes'
                    onClick={() => {
                      try {
                        window.dispatchEvent(new CustomEvent('canvas:clear'));
                      } catch {}
                      setShowConfirm(false);
                    }}
                  >
                    Yes!
                  </button>
                  <button
                    className='btn-no'
                    onClick={() => setShowConfirm(false)}
                  >
                    Nope
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Body;