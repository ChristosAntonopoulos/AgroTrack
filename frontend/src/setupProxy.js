const { createProxyMiddleware } = require('http-proxy-middleware');

const backendTarget = process.env.REACT_APP_PROXY_TARGET || 'http://localhost:5149';

module.exports = function setupProxy(app) {
  app.use(
    ['/api', '/uploads', '/health'],
    createProxyMiddleware({
      target: backendTarget,
      changeOrigin: true,
      secure: false,
    })
  );
};
