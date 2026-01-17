# Development stage with live reload
FROM nginx:alpine AS development
COPY index.html /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# Production stage with optimizations
FROM nginx:alpine AS production
COPY index.html /usr/share/nginx/html/
COPY nginx.prod.conf /etc/nginx/conf.d/default.conf
RUN rm -rf /usr/share/nginx/html/*.map 2>/dev/null || true
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
