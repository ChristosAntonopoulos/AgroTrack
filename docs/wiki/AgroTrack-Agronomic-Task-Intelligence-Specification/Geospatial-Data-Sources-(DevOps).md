# Field data sources (for geologists)

  

**Status:** Active  

**Audience:** Geologists / agronomists  

**Last updated:** 2026-09-04

  

Paste this page into Azure DevOps Wiki as-is. For operators (jobs, secrets, hosts) see [Geospatial Data Sources](./Geospatial-Data-Sources.md).

  

---

  

AgroTrack does **not** put a weather station or soil pit on the grove. It downloads **public scientific datasets**, clips them to the drawn polygon (or its centroid), and stores the result. The phone and website only read that stored result.

  

On a typical Messinian olive block (~0.3 ha): Sentinel-2 and WorldCover still give **tens of 10 m pixels**. Soil and weather are **one model cell for the neighbourhood**.

  

---

  

## Quick map — what you see → where it comes from

  

| On the field screen | Physical quantity | Dataset / provider | Nominal cell | How often it updates | When the first fill happens |

|---|---|---|---|---|---|

| Weather now, frost, ET0, 7-day forecast | Modelled air T, rain, wind, humidity, FAO ET0 | **Open-Meteo** `best_match` (not a station on the field) | ~1–11 km | Every **60 minutes** (and when the weather screen is opened if older than 60 min) | As soon as the **boundary is saved** |

| History graphs (T max/min, rain, ET0) | Daily reanalysis | **Open-Meteo archive / ERA5** | Same ~1–11 km grid | Once for **3 years**, then yesterday is added from the live cache | After the grower **accepts terms** (field activated). History screen also starts this if fewer than ~60 days exist |

| True colour, NDVI, NDMI, NDRE, NDWI, SAVI, change | Optical surface reflectance + indices we compute | **Copernicus Sentinel-2 L2A** via Earth Search (Element84 / AWS COGs) | **10 m** (20 m for red-edge, SWIR, cloud mask) | New scene hunted every **24 hours**; we keep the best recent one. History: **one lowest-cloud scene per month for 3 years** | Latest scene: **boundary saved**. Monthly archive: **after activation** |

| Elevation, slope %, aspect | Terrain | **Copernicus DEM GLO-30** (sampled through Open-Meteo elevation) | **30 m**, 11×11 samples over the bbox | **Static.** Recalculated only if the **boundary changes** (or “Update grove data”) | Boundary saved |

| Soil texture, pH, SOC | Modelled topsoil 0–5 cm | **ISRIC SoilGrids 2.0** | **250 m**, **one point at the centroid** | **Static.** Recalculated with the boundary | Boundary saved |

| Tree / crop / grass / built-up % | Land cover class | **ESA WorldCover 2021** (Terrascope) | **10 m**, year **2021 only** | **Static snapshot (2021).** Not a yearly update in the app | Boundary saved. Map overlay tiles load when the grower turns that layer on |

| Nearby fires | Thermal anomaly, not a confirmed wildfire | **NASA FIRMS VIIRS** Suomi NPP, last 1 day, Greece | ~**375 m** | Every **120 minutes** (if a FIRMS key is configured) | Distance to grove computed with the spatial profile |

| Natura 2000 | Official site polygons | **EEA Natura 2000** — **local copy**, no live EEA feed | Official boundaries | Only when an operator **imports** a new GeoJSON | After import; then checked when the boundary is profiled |

| KAEK, official area | Cadastre extract | **Grower’s KD+KF PDFs** from ktimatologio.gr — **no cadastre API** | No live geometry | Only at **upload** | During add-field |

| Street / photo map under the grove | Cartography | **OpenFreeMap**, **Esri World Imagery**, **OSM** | Web tiles | While the grower pans (not stored) | Immediately on the map. **Not** Sentinel; **not** NDVI |

  

---

  

## What is measured vs modelled

  

| Dataset | Kind | What a geologist should read it as |

|---|---|---|

| Sentinel-2 L2A | **Observation** (optical, ~5-day revisit, clouds) | Surface reflectance over the polygon. We mask cloud/shadow/snow (SCL). NDVI etc. are **derived by us**. Baseline = **this field’s own 3-year median**, not a regional phenology curve |

| WorldCover 2021 | **Classification product** | One epoch (2021). New planting or clearing will not show |

| Copernicus DEM GLO-30 | **Elevation model** | Field mean slope/aspect from a handful of 30 m cells — not a terrace survey |

| SoilGrids | **Global pedological model** | Neighbourhood topsoil fingerprint. **Not a lab analysis.** Do not prescribe fertilizer from this alone |

| Open-Meteo / ERA5 | **NWP + reanalysis** | Same weather as the surrounding countryside. Not canopy T, not a rain gauge |

| FIRMS VIIRS | **Thermal detection** | Proximity warning. Agricultural burning and industrial heat can trigger |

| Natura 2000 | **Legal/administrative geometry** | Intersects / nearest site. If nothing is imported, status is **unknown**, not “not protected” |

| Cadastre PDFs | **User document** | KAEK and official m² vs drawn area. Not proof of ownership; no cadastral polygon from the state |

  

---

  

## When AgroTrack fetches (grower actions)

  

| Grower action | What is fetched |

|---|---|

| Draw or save the boundary | Terrain, soil, WorldCover, live weather, **latest** Sentinel scene, Natura (from local copy), fire distance |

| Accept terms (activate the field) | **3 years** of daily weather (ERA5) **then** **one Sentinel scene per month** for 3 years |

| Open the field / weather | Uses cache. Calls Open-Meteo only if weather is older than **60 minutes** |

| Open History | Reads stored days. If fewer than **60** weather days, starts the 3-year backfill |

| “Update grove data” | Terrain, soil, land cover, forecast, latest Sentinel, and history if it was never completed |

| Change map layer or satellite date | **No new download.** Shows pictures already stored. WorldCover map tiles come from Terrascope in the browser |

| Upload cadastre PDFs | Parse files only — no state API |

| Pan the map | Basemap tiles from OpenFreeMap / Esri / OSM |

  

---

  

## Clock (no grower needed)

  

| Interval | What |

|---|---|

| Every **60 min** | Refresh live weather for active fields |

| Every **120 min** | Refresh Greece fire detections (FIRMS) |

| Every **24 h** | Look for a newer usable Sentinel-2 scene |

| About **hourly** | Write **yesterday’s** weather day from the cache (archive lags ~**5 days**) |

  

History overlays are kept about **400 days**. Monthly history aims at ~**36** scenes over 3 years.

  

---

  

## Resolution vs a ~0.3 ha grove

  

| Dataset | Cell | On a 0.3 ha olive block |

|---|---|---|

| Sentinel-2 / WorldCover | 10 m | Tens of pixels — greenness and cover, **not tree counting** |

| Copernicus DEM | 30 m | A few elevation samples — **mean slope**, not a contour map |

| VIIRS fire | ~375 m | **Proximity only** — cannot place a fire inside the grove |

| SoilGrids | 250 m | **One** modelled topsoil value for the neighbourhood |

| Open-Meteo / ERA5 | 1–11 km | Same cell as neighbouring villages |

  

---

  

## Each source in one block

  

### Atmosphere — live weather

  

| | |

|---|---|

| **Provider** | Open-Meteo, model blend `best_match` |

| **Licence** | Open-Meteo attribution; modelled grid |

| **Variables** | 2 m temperature, humidity, dew point, rain, wind, gusts, cloud, pressure, shortwave, ET0, soil T/moisture (model), weather code |

| **Time** | Hourly; 7 past days + 7 forecast days |

| **Point used** | Field **centroid** (nearby groves share one grid cell) |

| **Caveat** | Not a field sensor. Frost uses forecast **minimum temperature only** — the 30 m DEM is **not** fused into frost today |

  

### Atmosphere — history

  

| | |

|---|---|

| **Provider** | Open-Meteo Archive, **ERA5** seamless |

| **Variables** | Daily T max / min / mean, rain, ET0, wind, shortwave |

| **Time** | Last **3 years**, ending ~**5 days** before today |

| **Caveat** | Reanalysis, not a rain gauge. The last few History days may still be filling from the live forecast |

  

### Optical — Sentinel-2

  

| | |

|---|---|

| **Provider** | Copernicus Sentinel-2 L2A, indexed by Element84 Earth Search |

| **Licence** | Contains modified Copernicus Sentinel data |

| **Bands we read** | B02 blue, B03 green, B04 red, B05 red-edge, B08 NIR, B11 SWIR, SCL (cloud class) |

| **Indices we compute** | NDVI, NDMI, NDRE, NDWI (McFeeters), SAVI (L=0.5), true-colour RGB, NDVI change vs previous aligned grid |

| **Cloud rules** | Live search: last 30 days, scene cloud ≤20%. History: one lowest-cloud scene per month, ≤40%. Scene cloud ≠ cloud over the grove until SCL is applied |

| **Reject** | If usable (in-polygon, cloud-free) pixels **&lt; 40%**, the date is kept but marked unusable |

| **Caveat** | L2A surface reflectance, not top-of-canopy. Overlay is a picture of **our** 10 m grid, not Esri photography |

  

### Terrain

  

| | |

|---|---|

| **Provider** | Copernicus DEM GLO-30 via Open-Meteo elevation |

| **Method** | 121 sample points; Horn 3×3 slope and aspect |

| **Slope classes** | Flat ≤5%, moderate ≤12%, steep ≤20% |

| **Caveat** | Not a topographic survey |

  

### Soil

  

| | |

|---|---|

| **Provider** | ISRIC SoilGrids 2.0 |

| **Depth** | 0–5 cm mean: pH, clay, sand, silt, SOC, N, bulk density, CEC |

| **Caveat** | Always labelled a **regional estimate** |

  

### Land cover

  

| | |

|---|---|

| **Provider** | ESA WorldCover 2021, VITO Terrascope, CC BY 4.0 |

| **Method** | Sample class codes over the grove → percentages. Map tiles are live from Terrascope, not stored |

| **Caveat** | 2021 epoch only |

  

### Fire

  

| | |

|---|---|

| **Provider** | NASA FIRMS, VIIRS SNPP near-real-time, country Greece, last 1 day |

| **Alert** | Detection within **10 km** of the centroid (search radius 50 km) |

| **Caveat** | Thermal anomaly. If FIRMS is not configured, the screen can look like “no fires” |

  

### Conservation

  

| | |

|---|---|

| **Provider** | EEA Natura 2000 polygons imported by an operator |

| **Caveat** | No live EEA API. Empty import → **unknown**, not “clear” |

  

### Cadastre

  

| | |

|---|---|

| **Provider** | User PDFs. AgroTrack does not call ktimatologio.gr |

| **Caveat** | Not legal proof. No official polygon is downloaded |

  

### Basemap (context only)

  

| | |

|---|---|

| **Providers** | OpenFreeMap Liberty, Esri World Imagery, OpenStreetMap |

| **Caveat** | Esri photo is **not** the Sentinel true-colour / NDVI grid |

  

---

  

## Numbers we derive (no extra satellite or lab)

  

| Product | Made from |

|---|---|

| Water-balance label | 7-day rain − ET0, plus **10 mm assumed** per completed irrigation task |

| Frost / heat alerts | Forecast min T; heat **38 °C** |

| Fire alert | FIRMS closer than **10 km** |

| Vegetation alert | NDVI drop vs **this field’s** baseline (about 15% drop over ≥20% of the area, scene ≤21 days old) |

| Spray / harvest / irrigation warnings | Hourly wind, rain, humidity vs task rules |

| Area vs cadastre | Drawn geodesic m² vs m² parsed from the PDF |

  

---

  

## Attribution (short)

  

- Weather: Open-Meteo; archive lineage Copernicus ERA5  

- Optical: Copernicus Sentinel-2 L2A  

- DEM: Copernicus GLO-30  

- Soil: © ISRIC — World Soil Information, SoilGrids  

- Land cover: © ESA WorldCover 2021 / Terrascope  

- Fires: NASA FIRMS  

- Natura 2000: European Environment Agency  

- Basemaps: OSM ODbL; Esri World Imagery; OpenFreeMap