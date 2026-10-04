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
 * Corner handles drawn by the map, on the same coordinates as the outline.
 * A view slid across the map jumps away from the corner; a circle layer cannot.
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
          circleRadius: ['case', active, 15, 11],
          circleColor: '#1C1A14',
          circleOpacity: ['case', active, 0.28, 0.16],
          circleBlur: 0.7,
          circlePitchAlignment: 'viewport',
        }}
      />
      <CircleLayer
        id="boundary-vertex-disc"
        style={{
          circleRadius: ['case', active, 8, 6.5],
          circleColor: '#FFFcf6',
          circleStrokeWidth: 1.5,
          circleStrokeColor: '#2C3824',
          circlePitchAlignment: 'viewport',
        }}
      />
      <CircleLayer
        id="boundary-vertex-core"
        style={{
          circleRadius: ['case', active, 3.2, 2.5],
          circleColor: colors.primary,
          circlePitchAlignment: 'viewport',
        }}
      />
    </ShapeSource>
  );
};

export default BoundaryVertexPins;
