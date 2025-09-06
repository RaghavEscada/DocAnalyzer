# Use nginx to serve static files
FROM nginx:alpine

# Copy the static files to nginx html directory
COPY . /usr/share/nginx/html/

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create a script to inject environment variables
RUN echo '#!/bin/sh' > /usr/share/nginx/html/inject-env.sh && \
    echo 'envsubst < /usr/share/nginx/html/config.js.template > /usr/share/nginx/html/config.js' >> /usr/share/nginx/html/inject-env.sh && \
    chmod +x /usr/share/nginx/html/inject-env.sh

# Expose port 80
EXPOSE 80

# Start nginx with environment injection
CMD ["/bin/sh", "-c", "/usr/share/nginx/html/inject-env.sh && nginx -g 'daemon off;'"]
