# Geospatial Data Sources (DevOps)

**Κατάσταση:** Ενεργή — runbook για operators
**Υπεύθυνος:** DevOps / backend
**Τελευταία ενημέρωση:** 2026-09-04

## Σκοπός

Πού καλεί το Oleachron για καιρό, δορυφόρο, έδαφος, έδαφος/κάλυψη, φωτιές και Natura· πότε τρέχει κάθε κλήση· ποια config/secret χρειάζεται· τι σπάει όταν ένας provider είναι down.

Αυτή η σελίδα είναι για **operators**. Δεν εξηγεί NDVI. Εξηγεί egress, jobs, storage, και πώς να διαγνώσεις ένα άδειο πεδίο.

Κείμενο για γεωλόγο (πίνακες, απλή γλώσσα — για paste στο Azure DevOps Wiki): [Field data sources (for geologists)](./Geospatial-Sources-for-Geologists.md).

Σχετικές σελίδες: [Infrastructure](./Infrastructure.md), [DevOps and CICD](./DevOps-and-CICD.md), [Database](./Database.md), [Backend](./Backend.md).

Κώδικας: `GeospatialOptions`, `GeospatialJobHost`, `GeospatialJobQueue`, `FieldSpatialController`, `backend/k8s/configmap.yaml`.

---

## Κανόνας egress (μην το παραβιάσεις)

| Ποιος καλεί | Τι καλεί |
|---|---|
| **API pod μόνο** (`olive-lifecycle-api`) | Open-Meteo, Earth Search STAC, Sentinel-2 COGs (HTTPS range), ISRIC SoilGrids, Terrascope WMS, NASA FIRMS |
| **Browser / mobile** | Basemap tiles (OpenFreeMap, Esri, OSM) και Terrascope **WMTS** όταν ο χρήστης ανοίξει land-cover. Overlay PNG (`truecolor`, `ndvi`, …) από το **API** `/uploads` |
| **Frontend pod** | Δεν καλεί providers. Το `nginx.conf` κάνει proxy `/uploads/` → `api.Oleachron.conceptatlas.eu` |

Αν μπει NetworkPolicy, άνοιξε **outbound HTTPS 443** από το API namespace προς τα hosts του πίνακα allowlist παρακάτω. Μην ανοίγεις egress από το frontend.

**Replicas = 1.** Τα geospatial jobs είναι `IHostedService` μέσα στο API process, με in-memory `Channel`. Δεύτερο replica = διπλά weather/fire/satellite jobs και χαμένη ουρά. Δεν υπάρχουν Kubernetes CronJobs.

**Restart = χαμένη ουρά.** Pending work ζει στο Channel. Η Mongo συλλογή `geospatial_processing_jobs` κρατά status, αλλά **δεν ξαναγεμίζει το Channel στο startup**. Job που έμεινε `Processing` μετά από crash δεν συνεχίζει μόνο του.

---

## Production topology

```
Grower (web / mobile)
        |
        v
Caddy Oleachron.conceptatlas.eu
  /uploads*  --> NodePort 31847  API
  *          --> NodePort 31848  frontend
        |
        v
API  api.Oleachron.conceptatlas.eu  (replicas: 1)
  - GeospatialJobHost (in-process)
  - MongoDB  OliveLifecycle
  - PVC olive-lifecycle-uploads  ->  /app/uploads
        |
        +--> Open-Meteo / Earth Search / AWS COGs / SoilGrids / Terrascope / FIRMS
```

| Setting | Production value | Config |
|---|---|---|
| Raster files | `/app/uploads/geospatial/fields/{fieldId}/satellite/...` | `Storage__LocalPath=uploads`, `Geospatial__Storage__RasterRoot=geospatial` |
| Public overlay URL | `https://api.Oleachron.conceptatlas.eu/uploads/...` | `Storage__PublicBasePath` — **must be the API host**, not the website |
| Overlay 404 on the website | Caddy `handle /uploads*` missing or `PublicBasePath` points at the SPA | See [Overlay PNGs 404](#overlay-pngs-404-on-the-website) |

---

## Background jobs (in-process)

Hosted by `GeospatialJobHost`. Disabled with `Geospatial__Jobs__Enabled=false` (jobs loop exits; queued work also stops).

### Scheduled loops

| Job | Interval (default) | Config | Provider | Notes |
|---|---|---|---|---|
| `WeatherRefreshJob` | 60 min | `Geospatial__Jobs__WeatherRefreshMinutes` | Open-Meteo forecast | One HTTP call per unique grid cell (centroid rounded 2 decimals). Then enqueues `TaskConditions` per field. Writes `data_source_health.sourceId=open-meteo` |
| `FireRefreshJob` | 120 min | `Geospatial__Jobs__FireRefreshMinutes` | NASA FIRMS | **No-op empty** if `Geospatial__Fires__MapKey` missing. Failure keeps previous `fire_detections`. Health `firms` |
| `SatelliteDiscoveryJob` | 24 h | `Geospatial__Satellite__DiscoveryIntervalHours` | Earth Search (queued) | Enqueues `SatelliteProcessing` for every **active** field with a polygon. Health `sentinel-2` = “queued”, not “COG downloaded” |
| `SatelliteRetentionJob` | 24 h | `Geospatial__Satellite__RetentionDays` (400) | none | Deletes overlay files + Mongo observations older than retention |
| `DailyFieldSnapshotJob` | 60 min | `Geospatial__Jobs__SnapshotHourUtc` unused as a gate — loop is hourly | none (cache) | Writes yesterday’s day into `field_daily_weather_snapshots` from weather cache. Does **not** call the archive API |

First tick waits a full interval (`PeriodicTimer`). After a pod start, weather/fire/satellite discovery do **not** run immediately.

### On-demand queues (Mongo + Channel)

| JobType | Idempotency key | Trigger | Work |
|---|---|---|---|
| `SpatialProfile` | `spatial_{fieldId}_{yyyyMMddHH}` | Field create/boundary save; `POST .../intelligence/refresh` | Elevation + SoilGrids + WorldCover WMS + live weather + Natura (local) + fire distance |
| `SatelliteProcessing` | `satellite_{fieldId}_{catalogItemId\|yyyyMMdd}` | Boundary save; daily discovery; `POST .../satellite/refresh`; intelligence refresh | STAC search + COG range-reads + PNG overlays |
| `FieldHistoryBackfill` | `fieldhistory_{fieldId}` **one key for the life of the field** | Activate (terms); `GET .../weather/history` if &lt;60 snapshots; `POST .../history/backfill`; intelligence refresh | Archive weather **then** one Sentinel scene per month × `HistoryYears` (3) |
| `TaskConditions` | `taskconditions_{fieldId}_{yyyyMMddHHmm}` | After weather refresh; intelligence refresh | Spray/harvest/irrigation rules vs hourly cache |

Duplicate enqueue while status is not `Failed` is **skipped**. A completed `FieldHistoryBackfill` will **not** run again until the Mongo document is set to `Failed` (or deleted). Weather days already stored are not overwritten; missing satellite months can still fill if you reset the job.

**Capacity:** satellite and history queues are **single-consumer**. One field’s 36 monthly COGs can occupy the history worker for hours. Other fields wait.

---

## When the API calls whom

| Event | Jobs enqueued | External HTTP |
|---|---|---|
| Draw / save boundary | `SpatialProfile`, `SatelliteProcessing` | Open-Meteo elevation + forecast, SoilGrids, Terrascope WMS, Earth Search, Sentinel COGs |
| Accept terms (activate) | `FieldHistoryBackfill` only | Open-Meteo **archive**, then Earth Search + COGs monthly |
| Grower opens field / weather | none (unless cache &gt; 60 min) | Open-Meteo forecast if stale |
| Grower opens History | `FieldHistoryBackfill` if &lt;60 daily snapshots | Archive only if the job actually starts |
| `POST /api/v1/fields/{id}/intelligence/refresh` | Spatial + satellite + tasks + history | Full set (history skipped if job already Completed) |
| `POST /api/v1/fields/{id}/history/backfill` | History | Archive + monthly COGs |
| `POST /api/v1/fields/{id}/satellite/refresh` | Satellite | Earth Search + COGs |
| Map layer / date change | none | **None.** Serves stored PNGs |
| Cadastre PDF upload | none | **None.** Local PDF parse |
| Admin Natura import | none | **None.** GeoJSON file, max 200 MB |
| Client pans the map | none | Client → OpenFreeMap / Esri / OSM / Terrascope WMTS |

Internal routes (JWT unless noted):

| Method | Path | Auth |
|---|---|---|
| GET | `/api/v1/fields/{id}/spatial-profile` | field access |
| GET | `/api/v1/fields/{id}/intelligence` | field access |
| GET | `/api/v1/fields/{id}/weather` | field access |
| GET | `/api/v1/fields/{id}/weather/history` | field access |
| GET | `/api/v1/fields/{id}/satellite` , `/satellite/dates` | field access |
| GET | `/api/v1/fields/{id}/map-data` | field access |
| POST | `/api/v1/fields/{id}/intelligence/refresh` | field access, **202** |
| POST | `/api/v1/fields/{id}/history/backfill` | field access, **202** |
| POST | `/api/v1/fields/{id}/satellite/refresh` | field access, **202** |
| GET | `/api/v1/map/layers` | authenticated |
| GET | `/api/v1/admin/data-sources` | Administrator |
| GET | `/api/v1/admin/data-sources/jobs` | Administrator |
| GET | `/api/v1/admin/data-sources/natura` | Administrator |
| POST | `/api/v1/admin/data-sources/natura/import` | Administrator, 200 MB |
| GET | `/health` | none (k8s probes) — **does not** check providers |

---

## Allowlist (API outbound HTTPS)

| Host | Used for | Auth |
|---|---|---|
| `api.open-meteo.com` | Forecast + elevation | none |
| `archive-api.open-meteo.com` | ERA5 daily history | none |
| `earth-search.aws.element84.com` | Sentinel-2 L2A STAC search | none |
| `sentinel-cogs.s3.us-west-2.amazonaws.com` (and other COG `asset.href` hosts from STAC) | Range GET on B02–B11, SCL, TCI | none |
| `rest.isric.org` | SoilGrids | none |
| `services.terrascope.be` | WorldCover WMS GetFeatureInfo (API) and WMTS (client) | none |
| `firms.modaps.eosdis.nasa.gov` | VIIRS country CSV | MapKey in path |

COG hosts are **not a fixed hostname**. Earth Search returns per-scene `href`s (typically AWS Open Data). A tight egress proxy must allow those S3/CloudFront endpoints or STAC will succeed and raster processing will fail.

Client-only (not API):

| Host | Used for |
|---|---|
| `tiles.openfreemap.org` | Street vector style |
| `server.arcgisonline.com` | Esri World Imagery |
| `tile.openstreetmap.org` | OSM raster |

---

## Secrets and ConfigMap

### Secret `backend-secrets` (namespace `Oleachron-backend`)

| Key | Required | Pipeline variable | If missing |
|---|---|---|---|
| `MongoDB__ConnectionString` | yes | `MONGODB_CONNECTION_STRING` | API will not start usefully |
| `JWT__SecretKey` | yes | `JWT_SECRET_KEY` | auth broken |
| `Geospatial__Fires__MapKey` | **optional** | `FIRMS_MAP_KEY` | Fire job logs “map key is not configured”, stores **zero** detections, UI looks like “no fires” |

Pipeline: `azure-pipelines.yml` adds the FIRMS key only when `FIRMS_MAP_KEY` is non-empty and not the unexpanded `$(FIRMS_MAP_KEY)` placeholder. Deployment mounts it `optional: true`.

No other geospatial API keys exist today (Open-Meteo, Earth Search, SoilGrids, Terrascope are keyless).

### ConfigMap `olive-lifecycle-api-config`

| Key | Default in prod ConfigMap | Meaning |
|---|---|---|
| `Geospatial__Jobs__Enabled` | `true` | Master switch for `GeospatialJobHost` |
| `Geospatial__Jobs__WeatherRefreshMinutes` | `60` | Forecast loop |
| `Geospatial__Jobs__FireRefreshMinutes` | `120` | FIRMS loop |
| `Geospatial__Fires__CountryCode` | `GRC` | FIRMS country extract |
| `Geospatial__Satellite__RetentionDays` | `400` | Overlay prune |
| `Geospatial__Satellite__MaxRasterDimension` | `2048` | Large fields coarsen |
| `Geospatial__Storage__RasterRoot` | `geospatial` | Under `/app/uploads` |
| `Storage__PublicBasePath` | `https://api.Oleachron.conceptatlas.eu/uploads` | Absolute URLs in satellite DTOs |

Code defaults (not all in ConfigMap): `Weather:HistoryYears=3`, `ArchiveLagDays=5`, `Satellite:HistoryYears=3`, `MaxCloudCover=20`, `HistoryMaxCloudCover=40`, `DiscoveryIntervalHours=24`, `SearchWindowDays=30`.

`Geospatial__Terrain__OpenTopographyBaseUrl` exists. **Not implemented.** Elevation is Open-Meteo GLO-30 only.

---

## HTTP clients

Typed clients via `AddHttpClient` in `GeospatialDependencyInjection`. Default .NET timeout (~100 s) unless noted.

| Client | Timeout | Special |
|---|---|---|
| Weather, elevation, soil, STAC, FIRMS, WorldCover WMS | default | — |
| Named `Raster` (COG range reads) | **5 minutes** | `Accept-Encoding` cleared; **no** automatic decompression (would break byte ranges) |

A hung COG host occupies the single satellite/history worker for up to 5 minutes per request, then fails the job.

---

## Provider sheets (ops)

### 1. Open-Meteo forecast

| | |
|---|---|
| **Endpoint** | `GET https://api.open-meteo.com/v1/forecast` |
| **When** | Weather GET if cache older than 60 min; spatial profile; `WeatherRefreshJob` |
| **Store** | `weather_cache_locations` (grid cell) |
| **Failure** | Field weather stale; task spray warnings not updated. Health `open-meteo` → Degraded if any grid refresh throws |
| **Cost / quota** | Free non-commercial; round coords to 2 decimals to share cache across nearby groves |

### 2. Open-Meteo archive (ERA5)

| | |
|---|---|
| **Endpoint** | `GET https://archive-api.open-meteo.com/v1/archive` |
| **When** | `FieldHistoryBackfill` only (activate / History sparse / POST backfill) |
| **Store** | `field_daily_weather_snapshots` — skip days that already exist |
| **Window** | `HistoryYears` (3) ending `ArchiveLagDays` (5) before today |
| **Failure** | History charts stay short. Job `Failed`. Re-POST does nothing until job status is `Failed` |
| **Gotcha** | Last ~5 days of History come from forecast cache / daily snapshot, not archive |

### 3. Earth Search STAC (Sentinel-2 L2A)

| | |
|---|---|
| **Endpoint** | `POST https://earth-search.aws.element84.com/v1/search` collection `sentinel-2-l2a` |
| **When** | Satellite processing job (live: 30 days, cloud ≤20%; history: 1 scene/month, cloud ≤40%) |
| **Store** | Item id + cloud on `field_satellite_observations` — not raw STAC JSON |
| **Failure** | No new dates in the date picker. Discovery health can still be “Healthy” (it only counts enqueues) |
| **Alternative** | Copernicus Data Space is documented in comments; **not called** |

### 4. Sentinel-2 COG bands

| | |
|---|---|
| **Endpoint** | `GET {asset.href}` with HTTP Range — B02, B03, B04, B05, B08, B11, SCL, optional TCI |
| **When** | Same satellite / history jobs. **Not** on map-layer click |
| **Store** | Mongo stats + disk `uploads/geospatial/fields/{id}/satellite/{date}-{obsId}/{truecolor,ndvi,ndmi,ndre,ndwi,savi,ndvi-change}.png` and `ndvi.grid.gz` |
| **Failure** | Observation may be stored unusable if usable pixels &lt;40%. Overlay 404 if PVC empty or PublicBasePath wrong |
| **Perf** | History backfill is the heavy path. Do not bounce the API mid-backfill unless necessary |

### 5. Copernicus DEM via Open-Meteo elevation

| | |
|---|---|
| **Endpoint** | `GET https://api.open-meteo.com/v1/elevation` batches of 100 (11×11 = 121 points) |
| **When** | Spatial profile only |
| **Store** | `field_spatial_profiles.TerrainSummary` |
| **Failure** | Terrain section empty/partial; other profile parts may still succeed |

### 6. ISRIC SoilGrids 2.0

| | |
|---|---|
| **Endpoint** | `GET https://rest.isric.org/soilgrids/v2.0/properties/query` |
| **When** | Spatial profile, centroid, 0–5 cm |
| **Store** | `field_spatial_profiles.SoilSummary` (`IsRegionalEstimate=true`) |
| **Failure** | Soil card empty. ISRIC is occasionally slow; default HTTP timeout applies |

### 7. ESA WorldCover 2021 (Terrascope)

| | |
|---|---|
| **API** | WMS GetFeatureInfo `https://services.terrascope.be/wms/v2` layer `WORLDCOVER_2021_MAP` |
| **Client** | WMTS tiles when land-cover overlay is on — **not stored** |
| **When (API)** | Spatial profile |
| **Store** | `field_spatial_profiles.LandCoverSummary` |
| **Failure** | Percentages missing; map overlay still depends on Terrascope from the browser |

### 8. NASA FIRMS VIIRS SNPP NRT

| | |
|---|---|
| **Endpoint** | `GET https://firms.modaps.eosdis.nasa.gov/api/country/csv/{MapKey}/VIIRS_SNPP_NRT/GRC/1` |
| **When** | `FireRefreshJob` every 120 min |
| **Store** | Replace-all `fire_detections`. Distance copied onto field profile |
| **Failure** | Keep previous detections; health Degraded. **Missing key ≠ no fires** |
| **Ops** | Request a free map key from NASA FIRMS; set pipeline `FIRMS_MAP_KEY`; redeploy so the secret exists |

### 9. Natura 2000 (local)

| | |
|---|---|
| **Live API** | none |
| **Import** | `POST /api/v1/admin/data-sources/natura/import` GeoJSON ≤ 200 MB |
| **Store** | `natura_sites`; spatial profile intersects field geometry |
| **Failure** | Empty collection → status **unknown**, not “not protected”. Check `GET .../natura` `siteCount` |

### 10. Hellenic Cadastre

| | |
|---|---|
| **Live API** | none |
| **When** | `POST /api/v1/fields/import/greek-cadastre` (PDFs) |
| **Store** | Field document + files under `uploads/fields/{id}/cadastre/` |
| **Tiles** | `CadastreLayerEnabled` false unless operator sets `Geospatial__Map__CadastreTileUrl` |

### 11. Basemaps

Catalogue from `GET /api/v1/map/layers`. Clients hit tile URLs directly. API does not cache tiles. Distinct from Sentinel true-colour overlays.

---

## Mongo collections (geospatial)

| Collection | Written by |
|---|---|
| `field_spatial_profiles` | Spatial profile job |
| `weather_cache_locations` | Forecast refresh |
| `field_daily_weather_snapshots` | Archive backfill + daily snapshot job |
| `field_satellite_observations` | Satellite / history processing |
| `field_environmental_alerts` | Alert evaluator after profile/weather |
| `fire_detections` | FIRMS job (national replace-all) |
| `natura_sites` | Admin import |
| `data_source_health` | Weather, FIRMS, satellite-discovery jobs |
| `geospatial_processing_jobs` | Every enqueue |

---

## Operator checks

Admin JWT required.

```http
GET /api/v1/admin/data-sources
GET /api/v1/admin/data-sources/jobs
GET /api/v1/admin/data-sources/natura
```

| Check | Healthy | Sick |
|---|---|---|
| `open-meteo` LastSuccessfulUpdate | &lt; ~2 h | No forecast; History may still have old archive days |
| `firms` | detections count ≥ 0 **and** MapKey present | 0 detections + never-successful → key missing or blocked egress |
| `sentinel-2` | updates daily | Only means discovery **queued** fields |
| jobs `Pending`/`Processing` stuck | should drain | Pod restart dropped Channel; or one history job blocking |
| jobs `Failed` | inspect `RecentFailures` | Reset status to Failed is already Failed — delete/reset then POST backfill |
| natura `siteCount` | &gt; 0 after import | 0 → unknown protection |

From the cluster:

```bash
kubectl -n Oleachron-backend logs deploy/olive-lifecycle-api --tail=200 | grep -E "WeatherRefreshJob|FireRefreshJob|SatelliteDiscovery|Queued geospatial|FIRMS|Open-Meteo|SoilGrids"
kubectl -n Oleachron-backend exec deploy/olive-lifecycle-api -- ls /app/uploads/geospatial/fields
```

Expect log lines `{JobName} completed in {DurationMs} ms`. History COG work is slow; long duration is normal.

---

## Troubleshooting

### Overlay PNGs 404 on the website

Browser requests `https://Oleachron.conceptatlas.eu/uploads/geospatial/.../ndvi.png` and gets HTML 404.

1. Same path on `https://api.Oleachron.conceptatlas.eu/uploads/...` should be **200 image/png**.
2. Caddy must `handle /uploads*` → API NodePort **before** the SPA proxy (`deploy/caddy/Caddyfile`).
3. Frontend nginx `location ^~ /uploads/` must beat the `*.png` cache regex (`frontend/nginx.conf`).
4. `Storage__PublicBasePath` must be `https://api.Oleachron.conceptatlas.eu/uploads` (do not strip `https://` to `https:/`).

### History stays at 2 days after activate

1. Field must be **active** (terms accepted). Boundary-only does not start archive.
2. `GET /api/v1/admin/data-sources/jobs` — look for `FieldHistoryBackfill` `Processing` or `Failed`.
3. If `Completed` with few snapshots, the job will **not** rerun (`fieldhistory_{fieldId}`). Set that document to `Failed` (or delete it), then `POST /api/v1/fields/{id}/history/backfill`.
4. Confirm egress to `archive-api.open-meteo.com` and COG hosts.
5. Weather should appear first (~3 years daily); satellite months follow and can take hours.

### “No fires nearby” always

Almost always missing `Geospatial__Fires__MapKey`. Confirm secret:

```bash
kubectl -n Oleachron-backend get secret backend-secrets -o jsonpath="{.data.Geospatial__Fires__MapKey}" | wc -c
```

Zero length → set `FIRMS_MAP_KEY` in the pipeline library and redeploy.

### Soil / terrain empty, weather present

Spatial profile ran partially. Check API logs for `SoilGrids` / elevation. Re-run `POST .../intelligence/refresh` (hourly idempotency key `spatial_{id}_{yyyyMMddHH}` — wait an hour or fail the job to retry immediately).

### Duplicate work / CPU spike

`replicas` must stay **1**. Do not enable a second API deployment “for HA” until jobs move off in-memory channels.

### Disk growth

PVC `olive-lifecycle-uploads`. Overlays prune at 400 days (`SatelliteRetentionJob`). Cadastre PDFs are not pruned by that job. History of ~36 scenes × several PNGs per field is expected.

---

## Derived products (no extra provider)

| Product | Inputs | When |
|---|---|---|
| Water balance | 7-day rain + ET0; +10 mm per irrigation task (`IrrigationMmPerTask`) | Weather GET |
| Frost / heat / fire / vegetation alerts | Forecast min T; 38 °C; FIRMS &lt;10 km; NDVI vs own baseline | After profile / weather |
| Spray / harvest / irrigation task warnings | Hourly wind, rain, humidity vs `TaskRules` | Task create; after weather job |
| Area vs cadastre | Polygon m² vs parsed PDF | After PDF import |

---

## Known gaps (do not page on these)

| Gap | Behaviour |
|---|---|
| OpenTopography / GLO-90 | Config only; unused |
| Hellenic Cadastre HTTP / XYZ | Off unless `CadastreTileUrl` set |
| Copernicus Dataspace | Not wired |
| `/health` | Process up only — not Open-Meteo/STAC/FIRMS |
| Job recovery after restart | Manual: fail/delete Mongo job, POST refresh/backfill |
| FIRMS without key | Silent empty, not an error on `/health` |
