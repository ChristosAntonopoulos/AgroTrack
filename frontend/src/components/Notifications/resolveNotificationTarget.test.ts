import { resolveNotificationTarget } from './resolveNotificationTarget';

describe('resolveNotificationTarget', () => {
  it('builds a task detail path from related entity', () => {
    expect(
      resolveNotificationTarget({
        relatedEntityType: 'Task',
        relatedEntityId: 'abc-1',
        actionUrl: '/tasks',
      })
    ).toBe('/tasks/abc-1');
  });

  it('uses actionUrl when no related entity id', () => {
    expect(
      resolveNotificationTarget({
        relatedEntityType: 'Task',
        actionUrl: '/tasks',
      })
    ).toBe('/tasks');
  });

  it('returns null when there is no target', () => {
    expect(resolveNotificationTarget({})).toBeNull();
    expect(resolveNotificationTarget({ actionUrl: 'https://example.com' })).toBeNull();
  });

  it('builds a field path', () => {
    expect(
      resolveNotificationTarget({
        relatedEntityType: 'Field',
        relatedEntityId: 'f1',
      })
    ).toBe('/fields/f1');
  });

  it('builds a partner request path with id', () => {
    expect(
      resolveNotificationTarget({
        relatedEntityType: 'ServiceContactRequest',
        relatedEntityId: 'req-9',
      })
    ).toBe('/partners/requests?requestId=req-9');
  });
});
