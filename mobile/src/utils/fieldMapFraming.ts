/** Cap initial / programmatic zoom so raster tiles load reliably (e.g. field detail hero).
 * User pinch/zoom is separately capped by MAP_MAX_ZOOM on AppMapView. */
export const FIELD_HERO_MAX_ZOOM = 11;
export const FIELD_HERO_MIN_DELTA = 0.004;
export const FIELD_HERO_POLYGON_PADDING = 56;
export const FIELD_HERO_POLYGON_FACTOR = 2.2;
