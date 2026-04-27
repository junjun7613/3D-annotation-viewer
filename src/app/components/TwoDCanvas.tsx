'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import OpenSeadragon from 'openseadragon';

export interface Annotation2D {
  id: string;
  label: string;
  kind: 'rect' | 'polygon';
  // rect fields
  x?: number;      // normalized 0–1
  y?: number;
  width?: number;
  height?: number;
  // polygon fields
  points?: { x: number; y: number }[];
}

interface TwoDCanvasProps {
  manifestUrl: string;
  annotations: Annotation2D[];
  annotationMode: 'none' | 'rect' | 'polygon';
  annotationsVisible: boolean;
  focusAnnotationId?: string | null;
  onRectAnnotation?: (x: number, y: number, width: number, height: number, canvasId: string) => void;
  onPolygonAnnotation?: (points: { x: number; y: number }[], canvasId: string) => void;
  onAnnotationClick?: (id: string) => void;
}

export default function TwoDCanvas({
  manifestUrl,
  annotations,
  annotationMode,
  annotationsVisible,
  focusAnnotationId,
  onRectAnnotation,
  onPolygonAnnotation,
  onAnnotationClick,
}: TwoDCanvasProps) {
  const viewerRef = useRef<OpenSeadragon.Viewer | null>(null);
  const osdContainerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const canvasIdRef = useRef<string>('');

  // Rect drag state (pixel coords relative to OSD viewer element)
  const [dragRect, setDragRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const dragStartPixel = useRef<{ x: number; y: number } | null>(null);

  // Polygon in-progress points (normalized) + preview pixel positions
  const polygonPointsRef = useRef<{ x: number; y: number }[]>([]);
  const [polygonPreview, setPolygonPreview] = useState<{ x: number; y: number }[]>([]);

  // Refs so OSD handlers (registered once) always see latest values
  const annotationModeRef = useRef(annotationMode);
  const onRectAnnotationRef = useRef(onRectAnnotation);
  const onPolygonAnnotationRef = useRef(onPolygonAnnotation);
  useEffect(() => { annotationModeRef.current = annotationMode; }, [annotationMode]);
  useEffect(() => { onRectAnnotationRef.current = onRectAnnotation; }, [onRectAnnotation]);
  useEffect(() => { onPolygonAnnotationRef.current = onPolygonAnnotation; }, [onPolygonAnnotation]);

  // Reset in-progress state when mode changes
  useEffect(() => {
    dragStartPixel.current = null;
    setDragRect(null);
    polygonPointsRef.current = [];
    setPolygonPreview([]);
  }, [annotationMode]);

  // Helper: normalize a pixel Point to image-relative 0–1 coords
  const toNorm = useCallback((viewer: OpenSeadragon.Viewer, px: OpenSeadragon.Point) => {
    const item = viewer.world.getItemAt(0);
    if (!item) return null;
    const imgSize = item.getContentSize();
    const vp = viewer.viewport.pointFromPixel(px);
    const ip = viewer.viewport.viewportToImageCoordinates(vp);
    return { nx: ip.x / imgSize.x, ny: ip.y / imgSize.y };
  }, []);

  // Helper: convert normalized point to pixel coords in viewer element
  const toPixel = useCallback((viewer: OpenSeadragon.Viewer, nx: number, ny: number) => {
    const item = viewer.world.getItemAt(0);
    if (!item) return null;
    const imgSize = item.getContentSize();
    const vp = viewer.viewport.imageToViewportCoordinates(nx * imgSize.x, ny * imgSize.y);
    return viewer.viewport.viewportToViewerElementCoordinates(vp);
  }, []);

  // Initialize OpenSeadragon viewer once
  useEffect(() => {
    if (!osdContainerRef.current) return;

    const viewer = OpenSeadragon({
      element: osdContainerRef.current,
      prefixUrl: 'https://openseadragon.github.io/openseadragon/images/',
      showNavigationControl: true,
      navigationControlAnchor: OpenSeadragon.ControlAnchor.TOP_RIGHT,
      gestureSettingsMouse: { clickToZoom: false },
      animationTime: 0.3,
    });
    viewerRef.current = viewer;

    // Overlay div inside OSD container → above canvas, below controls
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (viewer as any).container.appendChild(overlay);
    overlayRef.current = overlay;

    // --- Rect mode: press → drag → drag-end ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    viewer.addHandler('canvas-press', (event: any) => {
      if (annotationModeRef.current !== 'rect') return;
      dragStartPixel.current = { x: event.position.x, y: event.position.y };
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    viewer.addHandler('canvas-drag', (event: any) => {
      if (annotationModeRef.current !== 'rect' || !dragStartPixel.current) return;
      event.preventDefaultAction = true;
      const { x: sx, y: sy } = dragStartPixel.current;
      const { x: ex, y: ey } = event.position;
      setDragRect({ x: Math.min(sx, ex), y: Math.min(sy, ey), w: Math.abs(ex - sx), h: Math.abs(ey - sy) });
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    viewer.addHandler('canvas-drag-end', (event: any) => {
      if (annotationModeRef.current !== 'rect' || !dragStartPixel.current) return;
      event.preventDefaultAction = true;

      const s = toNorm(viewer, new OpenSeadragon.Point(dragStartPixel.current.x, dragStartPixel.current.y));
      const e = toNorm(viewer, new OpenSeadragon.Point(event.position.x, event.position.y));

      if (s && e) {
        const x = Math.min(s.nx, e.nx);
        const y = Math.min(s.ny, e.ny);
        const w = Math.abs(e.nx - s.nx);
        const h = Math.abs(e.ny - s.ny);
        if (w > 0.005 && h > 0.005) {
          onRectAnnotationRef.current?.(x, y, w, h, canvasIdRef.current);
        }
      }
      dragStartPixel.current = null;
      setDragRect(null);
    });

    // --- Polygon mode: click to add vertex, double-click to close ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    viewer.addHandler('canvas-click', (event: any) => {
      if (annotationModeRef.current !== 'polygon' || !event.quick) return;
      const norm = toNorm(viewer, event.position);
      if (!norm) return;
      polygonPointsRef.current.push({ x: norm.nx, y: norm.ny });
      // Update pixel preview
      const px = polygonPointsRef.current.map(p => {
        const item = viewer.world.getItemAt(0);
        if (!item) return { x: 0, y: 0 };
        const imgSize = item.getContentSize();
        const vp = viewer.viewport.imageToViewportCoordinates(p.x * imgSize.x, p.y * imgSize.y);
        const pxPt = viewer.viewport.viewportToViewerElementCoordinates(vp);
        return { x: pxPt.x, y: pxPt.y };
      });
      setPolygonPreview(px);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    viewer.addHandler('canvas-double-click', (_event: any) => {
      if (annotationModeRef.current !== 'polygon') return;
      const pts = polygonPointsRef.current;
      if (pts.length >= 3) {
        onPolygonAnnotationRef.current?.(pts, canvasIdRef.current);
      }
      polygonPointsRef.current = [];
      setPolygonPreview([]);
    });

    return () => {
      viewer.destroy();
      viewerRef.current = null;
      overlayRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load IIIF manifest
  useEffect(() => {
    if (!viewerRef.current || !manifestUrl) return;
    const loadManifest = async () => {
      try {
        const res = await fetch(manifestUrl);
        const manifest = await res.json();
        const canvas = manifest.items?.[0] || manifest.sequences?.[0]?.canvases?.[0];
        if (!canvas) return;
        canvasIdRef.current = canvas.id || canvas['@id'] || '';

        // IIIF v3
        const paintingAnno = canvas.items?.[0]?.items?.[0];
        const imageBody = paintingAnno?.body;
        if (imageBody) {
          const svc = Array.isArray(imageBody.service) ? imageBody.service[0] : imageBody.service;
          const serviceId = svc?.id || svc?.['@id'] || imageBody.id;
          if (serviceId && (imageBody.type === 'Image' || imageBody.format?.startsWith('image/'))) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (viewerRef.current as any).open(`${serviceId}/info.json`);
            return;
          }
        }
        // IIIF v2
        const resource = canvas.images?.[0]?.resource;
        if (resource) {
          const svc = Array.isArray(resource.service) ? resource.service[0] : resource.service;
          const serviceId = svc?.['@id'] || svc?.id;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (serviceId) (viewerRef.current as any).open(`${serviceId}/info.json`);
        }
      } catch { /* ignore */ }
    };
    loadManifest();
  }, [manifestUrl]);

  // Draw annotation overlays
  const drawOverlays = useCallback(() => {
    if (!viewerRef.current || !overlayRef.current) return;
    const viewer = viewerRef.current;
    overlayRef.current.innerHTML = '';
    if (!annotationsVisible || !viewer.world.getItemCount()) return;

    annotations.forEach((anno) => {
      const isFocused = anno.id === focusAnnotationId;
      const color = isFocused ? '#2563eb' : '#3b82f6';
      const fill  = isFocused ? 'rgba(59,130,246,0.25)' : 'rgba(59,130,246,0.12)';

      if (anno.kind === 'rect' && anno.x != null && anno.y != null && anno.width != null && anno.height != null) {
        const pxTL = toPixel(viewer, anno.x, anno.y);
        const pxBR = toPixel(viewer, anno.x + anno.width, anno.y + anno.height);
        if (!pxTL || !pxBR) return;
        const el = document.createElement('div');
        el.style.cssText = [
          'position:absolute',
          `left:${pxTL.x}px`, `top:${pxTL.y}px`,
          `width:${pxBR.x - pxTL.x}px`, `height:${pxBR.y - pxTL.y}px`,
          `background:${fill}`, `border:2px solid ${color}`,
          'border-radius:2px', 'cursor:pointer', 'pointer-events:all', 'box-sizing:border-box',
        ].join(';');
        el.title = anno.label;
        el.addEventListener('click', () => onAnnotationClick?.(anno.id));
        overlayRef.current?.appendChild(el);

      } else if (anno.kind === 'polygon' && anno.points && anno.points.length >= 3) {
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;';
        const poly = document.createElementNS(svgNS, 'polygon');
        const pts = anno.points.map(p => {
          const px = toPixel(viewer, p.x, p.y);
          return px ? `${px.x},${px.y}` : '0,0';
        });
        poly.setAttribute('points', pts.join(' '));
        poly.setAttribute('fill', fill);
        poly.setAttribute('stroke', color);
        poly.setAttribute('stroke-width', '2');
        poly.style.pointerEvents = 'all';
        poly.style.cursor = 'pointer';
        poly.addEventListener('click', () => onAnnotationClick?.(anno.id));
        svg.appendChild(poly);
        overlayRef.current?.appendChild(svg);
      }
    });
  }, [annotations, annotationsVisible, focusAnnotationId, onAnnotationClick, toPixel]);

  useEffect(() => {
    if (!viewerRef.current) return;
    const viewer = viewerRef.current;
    viewer.addHandler('update-viewport', drawOverlays);
    viewer.addHandler('open', drawOverlays);
    drawOverlays();
    return () => {
      viewer.removeHandler('update-viewport', drawOverlays);
      viewer.removeHandler('open', drawOverlays);
    };
  }, [drawOverlays]);

  const cursor = annotationMode === 'none' ? 'default' : annotationMode === 'polygon' ? 'crosshair' : 'crosshair';

  return (
    <div className="relative w-full h-full bg-gray-900" style={{ cursor }}>
      <div ref={osdContainerRef} className="absolute inset-0" />

      {/* Rect drag preview */}
      {dragRect && (
        <div
          className="absolute pointer-events-none border-2 border-blue-500 bg-blue-500/20"
          style={{ left: dragRect.x, top: dragRect.y, width: dragRect.w, height: dragRect.h }}
        />
      )}

      {/* Polygon in-progress preview */}
      {annotationMode === 'polygon' && polygonPreview.length > 0 && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
          <polyline
            points={polygonPreview.map(p => `${p.x},${p.y}`).join(' ')}
            fill="rgba(59,130,246,0.15)"
            stroke="#3b82f6"
            strokeWidth={2}
            strokeDasharray="4 2"
          />
          {polygonPreview.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={4} fill="#3b82f6" stroke="white" strokeWidth={1.5} />
          ))}
        </svg>
      )}

      {annotationMode !== 'none' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[var(--card-bg)]/90 backdrop-blur-sm border border-[var(--border)] rounded-lg px-4 py-2 text-sm text-[var(--text-secondary)]">
          {annotationMode === 'rect'
            ? 'Drag to select a region'
            : `Click to add points (${polygonPreview.length}) — double-click to close polygon`}
        </div>
      )}
    </div>
  );
}
