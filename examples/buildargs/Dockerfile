FROM nginx:latest

ARG GREETING

# Fail if build arg is missing
RUN test -n "$GREETING" || (echo "GREETING ARG not set" && false)
RUN echo ${GREETING} > /usr/share/nginx/html/index.html
