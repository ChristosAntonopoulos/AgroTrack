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
 * Visual size follows Mapbox GL Draw (about 4px core, 7px halo). The finger
 * target is a separate invisible radius in the stage, not a bigger circle.
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
          circleRadius: ['case', active, 9, 7],
          circleColor: '#fff',
          circleStrokeWidth: 1.5,
          circleStrokeColor: '#2C3824',
          circlePitchAlignment: 'viewport',
        }}
      />
      <CircleLayer
        id="boundary-vertex-core"
        style={{
          circleRadius: ['case', active, 5, 4],
          circleColor: colors.primary,
          circlePitchAlignment: 'viewport',
        }}
      />
    </ShapeSource>
  );
};

export default BoundaryVertexPins;
