# Use nginx alpine as base image (lightweight)
FROM nginx:alpine

LABEL org.opencontainers.image.title="FortiGate Debug Command Generator" \
      org.opencontainers.image.version="1.1.0" \
      org.opencontainers.image.description="Web-based FortiGate debug CLI command generator"

# Copy all static files to nginx html directory
COPY index.html /usr/share/nginx/html/
COPY styles.css /usr/share/nginx/html/
COPY app.js /usr/share/nginx/html/
COPY fortigate_debug_cheatsheet.txt /usr/share/nginx/html/

# Copy custom nginx configuration (optional, for better defaults)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

