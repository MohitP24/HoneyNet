FROM python:3.11-alpine

# Install Glastopf dependencies
RUN apk add --no-cache \
    build-base \
    libffi-dev \
    openssl-dev \
    python3-dev \
    libxml2-dev \
    libxslt-dev

# Create non-root user
RUN adduser -D -u 1000 -s /bin/sh glasthoney

# Install Glastopf (pinned version)
RUN pip install --no-cache-dir \
    glastopf==3.1.3 \
    gevent==22.10.2

# Set working directory
WORKDIR /app

# Copy configuration
COPY glastopf.cfg /app/glastopf.cfg

# Create log directory
RUN mkdir -p /var/log/glastopf && \
    chown glasthoney:glasthoney /var/log/glastopf

# Switch to non-root user
USER glasthoney

# Healthcheck: Test HTTP port
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD wget --spider -q http://localhost:8080 || exit 1

# Run Glastopf
CMD ["glastopf-runner", "--config", "/app/glastopf.cfg"]
