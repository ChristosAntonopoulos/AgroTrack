import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useLocaleFormatters } from '../hooks/useLocaleFormatters';
import { useOfflineMode } from '../context/OfflineContext';
import { isDeviceOnline } from '../utils/networkStatus';
import PageContainer from '../components/Common/PageContainer';
import Breadcrumbs from '../components/Layout/Breadcrumbs';
import Card from '../components/Common/Card';
import Button from '../components/Common/Button';
import Badge from '../components/Common/Badge';
import EmptyState from '../components/Common/EmptyState';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import DemoTourPanel from '../components/Demo/DemoTourPanel';
import { getFieldService, getTaskService, isMockMode } from '../services/serviceFactory';
import { demoStore } from '../services/demo/demoStore';
import { Field } from '../services/fieldService';
import { Task } from '../services/taskService';
import { hasCapacity } from '../services/fieldPeopleService';
import { locationService, Location } from '../services/locationService';
import { useNavigate } from 'react-router-dom';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import './TodayPage.css';

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const openDirections = (lat: number, lng: number) => {
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
};

const numberedIcon = (n: number) =>
  L.divIcon({
    className: 'route-marker',
    html: `<div class="route-marker-inner">${n}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });

const TodayPage: React.FC = () => {
  const { t } = useTranslation(['today', 'common']);
  const { formatDate } = useLocaleFormatters();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { refreshGeneration, setShowingCachedData } = useOfflineMode();

  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [apiFields, setApiFields] = useState<Field[]>([]);
  const [apiTasks, setApiTasks] = useState<Task[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (isMockMode()) {
      demoStore.ensureSeeded();
      if (user?.userId) {
        demoStore.markDemoStep(user.userId, user.role || 'Producer', 'producer_visit_today');
      }
    } else if (user?.userId) {
      void (async () => {
        try {
          const [fieldsData, tasksData] = await Promise.all([
            getFieldService().getFields(),
            getTaskService().getTasks(),
          ]);
          if (!cancelled) {
            setApiFields(fieldsData);
            setApiTasks(tasksData);
            setShowingCachedData(!isDeviceOnline());
          }
        } catch {
          if (!cancelled) {
            setApiFields([]);
            setApiTasks([]);
          }
        }
      })();
    }
    (async () => {
      try {
        const loc = await locationService.getCurrentLocation({ enableHighAccuracy: false, timeoutMs: 5000 });
        if (!cancelled) setCurrentLocation(loc);
      } catch (e: any) {
        if (!cancelled) setLocationError(e?.message || 'Location unavailable');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.userId, user?.role, refreshGeneration, setShowingCachedData]);

  const producerId = user?.userId;
  const role = user?.role || '';

  const [routeMode, setRouteMode] = useState(false);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [completedStops, setCompletedStops] = useState<string[]>([]);

  const { fields, tasks } = useMemo(() => {
    if (isMockMode()) {
      demoStore.ensureSeeded();
      return { fields: demoStore.getFields(), tasks: demoStore.getTasks() };
    }
    return { fields: apiFields, tasks: apiTasks };
  }, [apiFields, apiTasks]);
  const myOpenTasks = useMemo(() => {
    if (!producerId) return [];
    const workFieldIds = new Set(
      fields
        .filter((f) => {
          if (f.memberships?.length) {
            return hasCapacity(f.memberships, producerId, 'work') || hasCapacity(f.memberships, producerId, 'help');
          }
          return (
            f.ownerId === producerId ||
            (f.assignedProducerIds || []).includes(producerId) ||
            role === 'Producer'
          );
        })
        .map((f) => f.id)
    );

    return tasks
      .filter((t) => {
        if (t.status === 'completed') return false;
        if (t.assignedTo === producerId) return true;
        // Solo owners with work capacity: unassigned or field tasks on their working fields.
        if (workFieldIds.has(t.fieldId) && (!t.assignedTo || t.assignedTo === producerId)) return true;
        return false;
      });
  }, [tasks, producerId, fields, role]);

  const recommended = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const list = myOpenTasks.slice();
    list.sort((a, b) => {
      const ad = a.scheduledEnd ? new Date(a.scheduledEnd).getTime() : Number.POSITIVE_INFINITY;
      const bd = b.scheduledEnd ? new Date(b.scheduledEnd).getTime() : Number.POSITIVE_INFINITY;
      const aOver = a.scheduledEnd ? new Date(a.scheduledEnd) < today : false;
      const bOver = b.scheduledEnd ? new Date(b.scheduledEnd) < today : false;
      if (aOver !== bOver) return aOver ? -1 : 1;
      return ad - bd;
    });
    return list.slice(0, 3);
  }, [myOpenTasks]);

  const routeFields = useMemo(() => {
    const fieldIds = Array.from(new Set(recommended.map((t) => t.fieldId).concat(myOpenTasks.map((t) => t.fieldId))));
    const list = fieldIds
      .map((id) => fields.find((f) => f.id === id))
      .filter(Boolean) as Field[];

    const withGps = list.filter((f) => typeof f.latitude === 'number' && typeof f.longitude === 'number');
    if (!currentLocation) {
      return withGps.sort((a, b) => a.name.localeCompare(b.name));
    }

    // Nearest-next heuristic.
    const remaining = withGps.slice();
    const ordered: Field[] = [];
    let cursor = { latitude: currentLocation.latitude, longitude: currentLocation.longitude };
    while (remaining.length > 0) {
      remaining.sort((a, b) => {
        const da = locationService.calculateDistance(cursor.latitude, cursor.longitude, a.latitude!, a.longitude!);
        const db = locationService.calculateDistance(cursor.latitude, cursor.longitude, b.latitude!, b.longitude!);
        return da - db;
      });
      const next = remaining.shift()!;
      ordered.push(next);
      cursor = { latitude: next.latitude!, longitude: next.longitude! };
    }
    return ordered;
  }, [fields, myOpenTasks, recommended, currentLocation]);

  useEffect(() => {
    if (!producerId || !isMockMode()) return;
    demoStore.ensureSeeded();
    const state = demoStore.getRouteState(producerId);
    setRouteMode(state.active);
    setCurrentStopIndex(state.currentIndex || 0);
    setCompletedStops(state.completedFieldIds || []);
  }, [producerId]);

  const persistRoute = (patch: Partial<{ active: boolean; currentIndex: number; completedFieldIds: string[] }>) => {
    if (!producerId || !isMockMode()) return;
    const current = demoStore.getRouteState(producerId);
    const next = {
      ...current,
      ...patch,
      startedAt: patch.active && !current.active ? new Date().toISOString() : current.startedAt,
    };
    demoStore.setRouteState(producerId, next);
  };

  const startRoute = () => {
    setRouteMode(true);
    setCurrentStopIndex(0);
    setCompletedStops([]);
    persistRoute({ active: true, currentIndex: 0, completedFieldIds: [] });
    if (isMockMode() && routeFields[0]) {
      demoStore.addEvent({
        type: 'task_status_changed',
        timestamp: new Date().toISOString(),
        fieldId: routeFields[0].id,
        actorUserId: producerId,
        message: `Route started. First stop: ${routeFields[0].name}`,
      });
    }
  };

  const stopRoute = () => {
    setRouteMode(false);
    persistRoute({ active: false });
  };

  const markStopDone = (fieldId: string, fieldName: string) => {
    const next = Array.from(new Set([...completedStops, fieldId]));
    setCompletedStops(next);
    persistRoute({ completedFieldIds: next });
    if (isMockMode()) {
      demoStore.addEvent({
        type: 'task_status_changed',
        timestamp: new Date().toISOString(),
        fieldId,
        actorUserId: producerId,
        message: `Route stop completed: ${fieldName}`,
      });
    }
  };

  const goToStop = (idx: number) => {
    const clamped = Math.max(0, Math.min(idx, Math.max(0, routeFields.length - 1)));
    setCurrentStopIndex(clamped);
    persistRoute({ currentIndex: clamped });
  };

  const center: [number, number] = useMemo(() => {
    if (currentLocation) return [currentLocation.latitude, currentLocation.longitude];
    if (routeFields[0]?.latitude && routeFields[0]?.longitude) return [routeFields[0].latitude, routeFields[0].longitude];
    return [37.7749, -122.4194];
  }, [currentLocation, routeFields]);

  if (loading) {
    return (
      <PageContainer>
        <div className="today-page">
          <Breadcrumbs />
          <div className="today-header">
            <div>
              <h1>{t('today:title')}</h1>
              <p className="today-subtitle">{t('today:subtitle')}</p>
            </div>
          </div>
          <LoadingSpinner className="page-inline-loading" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="today-page">
        <Breadcrumbs />

        {isMockMode() && user?.userId && (() => {
          const progress = demoStore.getDemoProgress(user.userId, user.role || 'Producer');
          return !progress.dismissed ? (
            <div className="today-onboarding">
              <DemoTourPanel userId={user.userId} role={user.role || 'Producer'} />
            </div>
          ) : null;
        })()}

        <div className="today-header">
          <div>
            <h1>{t('today:title')}</h1>
            <p className="today-subtitle">{t('today:subtitle')}</p>
          </div>
          <div className="today-header-right">
            {locationError ? (
              <Badge variant="warning" size="sm">{locationError}</Badge>
            ) : currentLocation ? (
              <Badge variant="success" size="sm">Location ready</Badge>
            ) : null}

            {routeFields.length > 0 ? (
              routeMode ? (
                <Button size="sm" variant="outline" onClick={stopRoute}>
                  {t('today:endRoute')}
                </Button>
              ) : (
                <Button size="sm" variant="primary" onClick={startRoute}>
                  {t('today:startRoute')}
                </Button>
              )
            ) : null}
          </div>
        </div>

        <div className="today-grid">
          <Card title={t('today:recommendedTasks')} subtitle={t('today:recommendedSubtitle')}>
            {recommended.length === 0 ? (
              <EmptyState title={t('today:noTasksTitle')} description={t('today:noTasksDescription')} />
            ) : (
              <div className="today-task-list">
                {recommended.map((task) => (
                  <div key={task.id} className="today-task">
                    <div className="today-task-main">
                      <div className="today-task-title">{task.title}</div>
                      <div className="today-task-meta">
                        <Badge size="sm" variant={task.status === 'in_progress' ? 'info' : 'warning'}>
                          {t(`common:taskStatus.${task.status}`)}
                        </Badge>
                        {task.scheduledEnd ? (
                          <span>
                            {t('today:due')}: {formatDate(task.scheduledEnd)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="today-task-actions">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/fields/${task.fieldId}`)}>
                        {t('today:viewField')}
                      </Button>
                      <Button size="sm" variant="primary" onClick={() => navigate(`/tasks/${task.id}`)}>
                        {t('today:openTask')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Today’s route" subtitle={t('today:routeSubtitle')}>
            {routeFields.length === 0 ? (
              <EmptyState title={t('today:noRouteTitle')} description={t('today:noRouteDescription')} />
            ) : (
              <div className="today-route">
                <div className="today-route-list">
                  {routeFields.map((f, idx) => {
                    const dist =
                      currentLocation && f.latitude && f.longitude
                        ? locationService.calculateDistance(
                            currentLocation.latitude,
                            currentLocation.longitude,
                            f.latitude,
                            f.longitude
                          )
                        : null;
                    const fieldTasks = myOpenTasks.filter((t) => t.fieldId === f.id);
                    const nextDue = fieldTasks
                      .filter((t) => t.scheduledEnd)
                      .slice()
                      .sort((a, b) => new Date(a.scheduledEnd!).getTime() - new Date(b.scheduledEnd!).getTime())[0];

                    return (
                      <div
                        key={f.id}
                        className={`today-route-item ${routeMode && idx === currentStopIndex ? 'active' : ''} ${completedStops.includes(f.id) ? 'done' : ''}`}
                      >
                        <div className="today-route-left">
                          <div className="today-route-order">{idx + 1}</div>
                          <div>
                            <div className="today-route-name">{f.name}</div>
                            <div className="today-route-meta">
                              {dist != null ? <span>{Math.round(dist * 10) / 10} km</span> : <span>Distance n/a</span>}
                              {nextDue?.scheduledEnd ? (
                                <span>Next due: {new Date(nextDue.scheduledEnd).toLocaleDateString()}</span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        <div className="today-route-actions">
                          {routeMode ? (
                            <>
                              <Button size="sm" variant="outline" onClick={() => goToStop(idx)}>
                                Go
                              </Button>
                              <Button
                                size="sm"
                                variant={completedStops.includes(f.id) ? 'outline' : 'success'}
                                onClick={() => markStopDone(f.id, f.name)}
                                disabled={completedStops.includes(f.id)}
                              >
                                {completedStops.includes(f.id) ? 'Done' : 'Mark done'}
                              </Button>
                            </>
                          ) : null}
                          <Button size="sm" variant="outline" onClick={() => navigate(`/fields/${f.id}`)}>
                            Open
                          </Button>
                          {f.latitude && f.longitude ? (
                            <Button size="sm" variant="ghost" onClick={() => openDirections(f.latitude!, f.longitude!)}>
                              Directions
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="today-route-map">
                  <MapContainer center={center} zoom={12} scrollWheelZoom className="today-leaflet">
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {currentLocation ? (
                      <Marker position={[currentLocation.latitude, currentLocation.longitude]}>
                        <Popup>Your location</Popup>
                      </Marker>
                    ) : null}
                    {routeFields.map((f, idx) => (
                      <Marker
                        key={f.id}
                        position={[f.latitude!, f.longitude!]}
                        icon={numberedIcon(idx + 1)}
                        eventHandlers={{
                          click: () => navigate(`/fields/${f.id}`),
                        }}
                      >
                        <Popup>
                          <strong>{idx + 1}. {f.name}</strong>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </PageContainer>
  );
};

export default TodayPage;

