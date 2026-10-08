import React, { useMemo } from 'react';
import { CircleLayer, ShapeSource } from '@maplibre/maplibre-react-native';
import { useTheme } from '../../context/ThemeContext';
import type { LatLng } from '../../utils/fieldGeo';
import { pointsToFeatureCollection } from '../../utils/maplibreGeo';

type Props = {
  points: LatLng[];
  /** Index of the corner currently under the finger. */
  activeIndex?: number | null;
};

/**
 * Corner handles for mobile boundary editing.
 * Sized for fat-finger use (≈28–36px visual), larger than Mapbox GL Draw's
 * desktop dots; the invisible hit radius in FieldBoundaryStage is larger still.
 */
const BoundaryVertexPins: React.FC<Props> = ({ points, activeIndex = null }) => {
  const { colors } = useTheme();
  const shape = useMemo(
    () =>
      pointsToFeatureCollection(
        points.map((coordinate, index) => ({
          id: `boundary-vertex-${index}`,
          coordinate,
          properties: { active: index === activeIndex ? 1 : 0 },
        }))
      ),
    [points, activeIndex]
  );

  if (points.length === 0) return null;

  const active = ['==', ['get', 'active'], 1] as const;

  return (
    <ShapeSource id="boundary-vertices" shape={shape}>
      <CircleLayer
        id="boundary-vertex-halo"
        style={{
          circleRadius: ['case', active, 18, 14],
          circleColor: '#FFFFFF',
          circleStrokeWidth: 2,
          circleStrokeColor: '#1F2A1C',
          circleOpacity: 0.98,
          circlePitchAlignment: 'viewport',
        }}
      />
      <CircleLayer
        id="boundary-vertex-core"
        style={{
          circleRadius: ['case', active, 11, 8],
          circleColor: colors.primary,
          circlePitchAlignment: 'viewport',
        }}
      />
    </ShapeSource>
  );
};

export default BoundaryVertexPins;
