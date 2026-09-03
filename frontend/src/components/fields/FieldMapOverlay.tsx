import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ImageOverlay, useMap } from 'react-leaflet';
import L from 'leaflet';
import './FieldMapOverlay.css';

export type OverlayBounds = [[number, number], [number, number]];

interface Props {
  imageUrl: string;
  bounds: OverlayBounds;
  opacity: number;
  /** When set, the map shows a draggable seam between the two dates. */
  compareImageUrl?: string;
  compareBounds?: OverlayBounds;
}

interface ScreenRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Tracks where a geographic box lands on screen so the compare seam can be drawn
 * across the overlay itself rather than across the whole map viewport.
 */
const useOverlayRect = (bounds: OverlayBounds): ScreenRect | undefined => {
  const map = useMap();
  const [rect, setRect] = useState<ScreenRect>();

  useEffect(() => {
    const latLngBounds = L.latLngBounds(bounds);

    const update = () => {
      const topLeft = map.latLngToContainerPoint(latLngBounds.getNorthWest());
      const bottomRight = map.latLngToContainerPoint(latLngBounds.getSouthEast());
      setRect({
        left: topLeft.x,
        top: topLeft.y,
        width: bottomRight.x - topLeft.x,
        height: bottomRight.y - topLeft.y,
      });
    };

    update();
    map.on('move zoom resize viewreset', update);
    return () => {
      map.off('move zoom resize viewreset', update);
    };
  }, [map, bounds]);

  return rect;
};

const clipRight = (fraction: number) => `inset(0 ${(1 - fraction) * 100}% 0 0)`;
const clipLeft = (fraction: number) => `inset(0 0 0 ${fraction * 100}%)`;

/**
 * Draws a georeferenced overlay produced by the backend, optionally as a two-date
 * comparison. Both images share the analysis grid bounds, so the seam lines up.
 */
const FieldMapOverlay: React.FC<Props> = ({
  imageUrl,
  bounds,
  opacity,
  compareImageUrl,
  compareBounds,
}) => {
  const map = useMap();
  const primaryRef = useRef<L.ImageOverlay>(null);
  const compareRef = useRef<L.ImageOverlay>(null);
  const [split, setSplit] = useState(0.5);
  const dragging = useRef(false);
  const rect = useOverlayRect(bounds);
  const comparing = Boolean(compareImageUrl);

  const effectiveCompareBounds = useMemo(
    () => compareBounds ?? bounds,
    [compareBounds, bounds]
  );

  // Leaflet owns the <img> elements, so the seam is applied to them directly.
  useEffect(() => {
    const primaryElement = primaryRef.current?.getElement();
    const compareElement = compareRef.current?.getElement();
    if (primaryElement) {
      primaryElement.style.clipPath = comparing ? clipRight(split) : '';
    }
    if (compareElement) {
      compareElement.style.clipPath = clipLeft(split);
    }
  }, [comparing, split, imageUrl, compareImageUrl]);

  const moveSeam = useCallback(
    (clientX: number) => {
      if (!rect || rect.width <= 0) return;
      const container = map.getContainer().getBoundingClientRect();
      const offset = clientX - container.left - rect.left;
      setSplit(Math.min(1, Math.max(0, offset / rect.width)));
    },
    [map, rect]
  );

  useEffect(() => {
    if (!comparing) return;

    const onMove = (event: MouseEvent | TouchEvent) => {
      if (!dragging.current) return;
      const clientX = 'touches' in event ? event.touches[0]?.clientX : event.clientX;
      if (clientX != null) moveSeam(clientX);
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      map.dragging.enable();
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };
  }, [comparing, map, moveSeam]);

  const startDrag = useCallback(() => {
    dragging.current = true;
    map.dragging.disable();
  }, [map]);

  const seam =
    comparing && rect
      ? createPortal(
          <div
            className="field-map-seam"
            style={{
              left: rect.left + rect.width * split,
              top: rect.top,
              height: rect.height,
            }}
            onMouseDown={startDrag}
            onTouchStart={startDrag}
            role="separator"
            aria-orientation="vertical"
            aria-valuenow={Math.round(split * 100)}
          >
            <span className="field-map-seam-handle" aria-hidden="true" />
          </div>,
          map.getContainer()
        )
      : null;

  return (
    <>
      <ImageOverlay ref={primaryRef} url={imageUrl} bounds={bounds} opacity={opacity} />
      {compareImageUrl ? (
        <ImageOverlay
          ref={compareRef}
          url={compareImageUrl}
          bounds={effectiveCompareBounds}
          opacity={opacity}
        />
      ) : null}
      {seam}
    </>
  );
};

export default FieldMapOverlay;
