FROM alpine:latest

ARG PB_VERSION=0.25.9

RUN apk add --no-cache \
    unzip \
    ca-certificates

# Download and unzip PocketBase
ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb/ && rm /tmp/pb.zip

# Create data directory
RUN mkdir -p /pb/pb_data

# Copy schema file for auto-import
COPY pb_schema.json /pb/pb_schema.json

# Copy and set up entrypoint script
COPY entrypoint.sh /pb/entrypoint.sh
RUN chmod +x /pb/entrypoint.sh

EXPOSE 8090

# Use entrypoint script for automatic setup
ENTRYPOINT ["/pb/entrypoint.sh"]
