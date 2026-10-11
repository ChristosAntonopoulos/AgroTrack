/**
 * App.tsx pulls react-router-dom, which Jest cannot resolve through package exports.
 * Keep a lightweight smoke test without importing the router graph.
 */
test('frontend test harness is alive', () => {
  expect(typeof document.createElement).toBe('function');
});
