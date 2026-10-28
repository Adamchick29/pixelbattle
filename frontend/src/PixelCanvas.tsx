import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, PixelIcon, Tooltip, TooltipContent, TooltipTrigger } from '@pixel-kit/react';
import type { Board, Point } from './board';

type View = { x: number; y: number; scale: number };
type Pointer = Point & { originX: number; originY: number; moved: boolean };

export function PixelCanvas({ board, selected, color, onSelect }: {
  board: Board; selected: Point | null; color: number; onSelect: (point: Point | null) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, Pointer>());
  const backing = useRef<HTMLCanvasElement | null>(null);
  const [bounds, setBounds] = useState({ width: 0, height: 0 });
  const [view, setView] = useState<View>({ x: 0, y: 0, scale: 1 });
  const [dragging, setDragging] = useState(false);

  const fit = useCallback(() => {
    const element = wrapper.current;
    if (!element) return;
    const { width, height } = element.getBoundingClientRect();
    const scale = Math.min((width - 40) / board.size, (height - 60) / board.size);
    setView({ x: (width - board.size * scale) / 2, y: (height - board.size * scale) / 2, scale });
  }, [board.size]);

  useEffect(() => {
    if (!wrapper.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setBounds({ width: entry.contentRect.width, height: entry.contentRect.height });
      fit();
    });
    observer.observe(wrapper.current);
    return () => observer.disconnect();
  }, [fit]);

  useEffect(() => {
    const offscreen = document.createElement('canvas');
    offscreen.width = offscreen.height = board.size;
    const ctx = offscreen.getContext('2d')!;
    const image = ctx.createImageData(board.size, board.size);
    const colors = board.palette.map(hex => [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16)));
    board.pixels.forEach((index, pixel) => {
      image.data.set([...colors[index], 255], pixel * 4);
    });
    ctx.putImageData(image, 0, 0);
    backing.current = offscreen;
  }, [board]);

  useEffect(() => {
    const node = canvas.current;
    if (!node || !backing.current || !bounds.width) return;
    const frame = requestAnimationFrame(() => {
      const dpr = window.devicePixelRatio || 1;
      node.width = Math.round(bounds.width * dpr);
      node.height = Math.round(bounds.height * dpr);
      const ctx = node.getContext('2d')!;
      ctx.scale(dpr, dpr);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, bounds.width, bounds.height);
      ctx.save();
      ctx.translate(view.x, view.y);
      ctx.scale(view.scale, view.scale);
      ctx.shadowColor = '#49332f18';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 6;
      ctx.shadowOffsetY = 6;
      ctx.drawImage(backing.current!, 0, 0);
      ctx.shadowColor = 'transparent';
      ctx.lineWidth = 1 / view.scale;
      ctx.strokeStyle = '#49332f55';
      ctx.strokeRect(0, 0, board.size, board.size);
      if (view.scale >= 10) {
        ctx.beginPath();
        const x0 = Math.max(0, Math.floor(-view.x / view.scale));
        const x1 = Math.min(board.size, Math.ceil((bounds.width - view.x) / view.scale));
        const y0 = Math.max(0, Math.floor(-view.y / view.scale));
        const y1 = Math.min(board.size, Math.ceil((bounds.height - view.y) / view.scale));
        for (let x = x0; x <= x1; x++) { ctx.moveTo(x, y0); ctx.lineTo(x, y1); }
        for (let y = y0; y <= y1; y++) { ctx.moveTo(x0, y); ctx.lineTo(x1, y); }
        ctx.strokeStyle = '#49332f22';
        ctx.stroke();
      }
      if (selected) {
        ctx.fillStyle = board.palette[color] + '99';
        ctx.fillRect(selected.x, selected.y, 1, 1);
        ctx.strokeStyle = '#49332f';
        ctx.lineWidth = 2 / view.scale;
        const pad = 3 / view.scale;
        ctx.strokeRect(selected.x - pad, selected.y - pad, 1 + 2 * pad, 1 + 2 * pad);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1 / view.scale;
        ctx.strokeRect(selected.x - pad, selected.y - pad, 1 + 2 * pad, 1 + 2 * pad);
      }
      ctx.restore();
    });
    return () => cancelAnimationFrame(frame);
  }, [board, bounds, view, selected, color]);

  const zoomAt = useCallback((factor: number, x: number, y: number) => {
    setView(previous => {
      const scale = Math.min(64, Math.max(0.25, previous.scale * factor));
      const ratio = scale / previous.scale;
      return { x: x - (x - previous.x) * ratio, y: y - (y - previous.y) * ratio, scale };
    });
  }, []);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      zoomAt(Math.exp(-event.deltaY * 0.002), event.clientX - rect.left, event.clientY - rect.top);
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [zoomAt]);

  const selectAt = (x: number, y: number) => {
    const point = { x: Math.floor((x - view.x) / view.scale), y: Math.floor((y - view.y) / view.scale) };
    if (point.x >= 0 && point.y >= 0 && point.x < board.size && point.y < board.size) onSelect(point);
  };

  const toolbarButton = (label: string, icon: 'plus' | 'grid' | null, action: () => void, text?: string) => (
    <Tooltip>
      <TooltipTrigger asChild><Button size="icon" variant="ghost" aria-label={label} onClick={action}>
        {icon ? <PixelIcon name={icon} /> : text}
      </Button></TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );

  return <div className="canvas-wrap" ref={wrapper}>
    <span className="canvas-coordinate coordinate-top">0, 0</span>
    <canvas ref={canvas} className={dragging ? 'pixel-canvas is-dragging' : 'pixel-canvas'}
      tabIndex={0} role="application"
      aria-label="Общее поле 256 на 256. Стрелки выбирают пиксель, плюс и минус меняют масштаб."
      onKeyDown={event => {
        const directions: Record<string, Point> = {
          ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
          ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
        };
        if (directions[event.key]) {
          event.preventDefault();
          const old = selected ?? { x: 128, y: 128 };
          const delta = directions[event.key];
          const next = { x: Math.max(0, Math.min(255, old.x + delta.x)), y: Math.max(0, Math.min(255, old.y + delta.y)) };
          onSelect(next);
          setView(previous => ({ ...previous, x: bounds.width / 2 - (next.x + 0.5) * previous.scale,
            y: bounds.height / 2 - (next.y + 0.5) * previous.scale }));
        } else if (event.key === '+' || event.key === '=') zoomAt(1.5, bounds.width / 2, bounds.height / 2);
        else if (event.key === '-') zoomAt(1 / 1.5, bounds.width / 2, bounds.height / 2);
        else if (event.key === '0') fit();
        else if (event.key === 'Escape') onSelect(null);
      }}
      onPointerDown={event => {
        if (event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left, y = event.clientY - rect.top;
        pointers.current.set(event.pointerId, { x, y, originX: x, originY: y, moved: false });
        if (pointers.current.size > 1) pointers.current.forEach(pointer => { pointer.moved = true; });
      }}
      onPointerMove={event => {
        const point = pointers.current.get(event.pointerId);
        if (!point) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left, y = event.clientY - rect.top;
        const oldPoints = [...pointers.current.values()].map(item => ({ ...item }));
        const dx = x - point.x, dy = y - point.y;
        if (Math.hypot(x - point.originX, y - point.originY) > 6) point.moved = true;
        point.x = x; point.y = y;
        if (pointers.current.size === 2) {
          const newPoints = [...pointers.current.values()];
          const oldDistance = Math.hypot(oldPoints[0].x - oldPoints[1].x, oldPoints[0].y - oldPoints[1].y);
          const newDistance = Math.hypot(newPoints[0].x - newPoints[1].x, newPoints[0].y - newPoints[1].y);
          if (oldDistance > 0) {
            const oldCenter = { x: (oldPoints[0].x + oldPoints[1].x) / 2, y: (oldPoints[0].y + oldPoints[1].y) / 2 };
            const newCenter = { x: (newPoints[0].x + newPoints[1].x) / 2, y: (newPoints[0].y + newPoints[1].y) / 2 };
            setView(previous => {
              const scale = Math.min(64, Math.max(0.25, previous.scale * newDistance / oldDistance));
              return { x: newCenter.x - (oldCenter.x - previous.x) * scale / previous.scale,
                y: newCenter.y - (oldCenter.y - previous.y) * scale / previous.scale, scale };
            });
          }
        } else if (pointers.current.size === 1 && point.moved) {
          setView(previous => ({ ...previous, x: previous.x + dx, y: previous.y + dy }));
        }
        if (point.moved) setDragging(true);
      }}
      onPointerUp={event => {
        const point = pointers.current.get(event.pointerId);
        if (point && !point.moved && pointers.current.size === 1) selectAt(point.x, point.y);
        pointers.current.delete(event.pointerId);
        if (!pointers.current.size) setDragging(false);
      }}
      onPointerCancel={event => { pointers.current.delete(event.pointerId); setDragging(false); }}
    />
    <span className="canvas-coordinate coordinate-bottom">255, 255</span>
    <div className="canvas-controls" aria-label="Масштаб поля">
      {toolbarButton('Уменьшить масштаб', null, () => zoomAt(1 / 1.5, bounds.width / 2, bounds.height / 2), '−')}
      <output className="zoom-value">{Math.round(view.scale * 100)}%</output>
      {toolbarButton('Увеличить масштаб', 'plus', () => zoomAt(1.5, bounds.width / 2, bounds.height / 2))}
      <span className="control-divider" />
      {toolbarButton('Показать поле целиком', 'grid', fit)}
    </div>
  </div>;
}
