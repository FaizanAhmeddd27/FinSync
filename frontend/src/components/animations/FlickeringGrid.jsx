import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export function FlickeringGrid({
  squareSize = 4,
  gridGap = 6,
  flickerChance = 0.3,
  color = 'rgb(28, 156, 240)',
  maxOpacity = 0.3,
  className,
  ...props
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isInView, setIsInView] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const memoizedColor = useMemo(() => {
    if (typeof window === 'undefined') return 'rgba(28,156,240,';
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'rgba(28,156,240,';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = Array.from(ctx.getImageData(0, 0, 1, 1).data);
    return `rgba(${r}, ${g}, ${b},`;
  }, [color]);

  const setupCanvas = useCallback(
    (canvas, width, height) => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const cols = Math.floor(width / (squareSize + gridGap));
      const rows = Math.floor(height / (squareSize + gridGap));
      const squares = new Float32Array(cols * rows);
      for (let i = 0; i < squares.length; i++) {
        squares[i] = Math.random() * maxOpacity;
      }
      return { cols, rows, squares, dpr };
    },
    [squareSize, gridGap, maxOpacity]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let gridParams;

    const updateSize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      setCanvasSize({ width: w, height: h });
      gridParams = setupCanvas(canvas, w, h);
    };
    updateSize();

    let lastTime = 0;
    const animate = (time) => {
      if (!isInView) return;
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      for (let i = 0; i < gridParams.squares.length; i++) {
        if (Math.random() < flickerChance * dt) {
          gridParams.squares[i] = Math.random() * maxOpacity;
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < gridParams.cols; i++) {
        for (let j = 0; j < gridParams.rows; j++) {
          const opacity = gridParams.squares[i * gridParams.rows + j];
          ctx.fillStyle = `${memoizedColor}${opacity})`;
          ctx.fillRect(
            i * (squareSize + gridGap) * gridParams.dpr,
            j * (squareSize + gridGap) * gridParams.dpr,
            squareSize * gridParams.dpr,
            squareSize * gridParams.dpr
          );
        }
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    const resizeObs = new ResizeObserver(updateSize);
    resizeObs.observe(container);

    const intObs = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0 }
    );
    intObs.observe(canvas);

    if (isInView) animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObs.disconnect();
      intObs.disconnect();
    };
  }, [setupCanvas, flickerChance, maxOpacity, squareSize, gridGap, memoizedColor, isInView]);

  return (
    <div ref={containerRef} className={cn('h-full w-full', className)} {...props}>
      <canvas
        ref={canvasRef}
        className="pointer-events-none"
        style={{ width: canvasSize.width, height: canvasSize.height }}
      />
    </div>
  );
}