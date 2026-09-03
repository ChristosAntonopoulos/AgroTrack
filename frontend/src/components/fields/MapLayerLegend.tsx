import React from 'react';
import { LayerLegend } from '../../services/geospatialService';
import './MapLayerLegend.css';

interface Props {
  legend: LayerLegend;
  label: string;
  attribution?: string;
}

const formatValue = (value: number) => (Number.isInteger(value) ? value.toString() : value.toFixed(2));

/**
 * Renders the colour ramp the backend used for the overlay, so the on-map colours
 * can be read as values rather than guessed.
 */
const MapLayerLegend: React.FC<Props> = ({ legend, label, attribution }) => {
  if (!legend.stops?.length) {
    return null;
  }

  const gradient = legend.stops
    .map((stop) => `${stop.colour} ${Math.round(stop.position * 100)}%`)
    .join(', ');

  return (
    <div className="map-layer-legend">
      <span className="map-layer-legend-label">{label}</span>
      <div className="map-layer-legend-ramp" style={{ background: `linear-gradient(90deg, ${gradient})` }} />
      <div className="map-layer-legend-scale">
        <span>{formatValue(legend.minimum)}</span>
        <span>{formatValue((legend.minimum + legend.maximum) / 2)}</span>
        <span>{formatValue(legend.maximum)}</span>
      </div>
      {attribution ? <span className="map-layer-legend-attribution">{attribution}</span> : null}
    </div>
  );
};

export default MapLayerLegend;
