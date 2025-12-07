FROM python:3.11-alpine

# Install minimal dependencies
RUN apk add --no-cache curl

# Install Python packages
RUN pip install --no-cache-dir \
    watchdog==3.0.0 \
    requests==2.31.0

# Create non-root user
RUN adduser -D -u 1000 -s /bin/sh logforwarder

# Set working directory
WORKDIR /app

# Copy forwarder script
COPY log_forwarder.py /app/log_forwarder.py

# Ensure permissions
RUN chown logforwarder:logforwarder /app/log_forwarder.py

# Switch to non-root user
USER logforwarder

# Healthcheck: Verify process is running
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD pgrep -f log_forwarder.py || exit 1

# Run forwarder
CMD ["python", "-u", "/app/log_forwarder.py"]
