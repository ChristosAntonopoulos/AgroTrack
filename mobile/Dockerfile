# Browser build of the Expo app (static web export) served by nginx.
FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG EXPO_PUBLIC_API_URL=https://api.theolivelot.com
ARG EXPO_PUBLIC_SHOW_DEMO_LOGIN=true
ARG EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
ARG EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
ARG EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_SHOW_DEMO_LOGIN=$EXPO_PUBLIC_SHOW_DEMO_LOGIN
ENV EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=$EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
ENV EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=$EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
ENV EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=$EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
ENV EXPO_PUBLIC_USE_MOCK_DATA=false
ENV EXPO_NO_TELEMETRY=1
ENV CI=1

RUN npx expo export --platform web

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
