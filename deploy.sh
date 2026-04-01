#!/usr/bin/env bash

set -euo pipefail

########################################
# Config – adjust to match your server
########################################

# SSH destination (user@host or just host if you rely on default user)
REMOTE_HOST="10.12.0.96"

# Path on the remote server where the app source will live
# Use a directory in your user home to avoid needing sudo.
# Change this if your username or desired path is different on the server.
REMOTE_APP_DIR="/home/nelson/fortigate-troubleshooting-command-generator"

# Docker image + container naming
IMAGE_NAME="fortigate-troubleshooting-command-generator"
CONTAINER_NAME="fortigate-troubleshooting-command-generator"

# Port mapping (host:container)
HOST_PORT="8081"
CONTAINER_PORT="80"

########################################
# Helper
########################################

run_remote() {
  ssh "${REMOTE_HOST}" "$@"
}

########################################
# 1) Sync project to remote
########################################

echo ">>> Syncing project to ${REMOTE_HOST}:${REMOTE_APP_DIR}"
run_remote "mkdir -p \"${REMOTE_APP_DIR}\""

# rsync ignores .git and typical junk; adjust includes/excludes as needed
rsync -az --delete \
  --exclude=".git" \
  --exclude=".cursor" \
  --exclude="node_modules" \
  ./ "${REMOTE_HOST}:${REMOTE_APP_DIR}/"

########################################
# 2) Rebuild Docker image on remote
########################################

echo ">>> Building Docker image '${IMAGE_NAME}' on ${REMOTE_HOST}"
run_remote "cd \"${REMOTE_APP_DIR}\" && docker build -t \"${IMAGE_NAME}\" ."

########################################
# 3) Stop previous container (if any)
########################################

echo ">>> Stopping old container '${CONTAINER_NAME}' (if running)"
run_remote "docker ps -q -f name=\"^${CONTAINER_NAME}\$\" | xargs -r docker stop"
run_remote "docker ps -aq -f name=\"^${CONTAINER_NAME}\$\" | xargs -r docker rm"

echo ">>> Releasing port ${HOST_PORT} from any other containers (if in use)"
run_remote "docker ps --format '{{.ID}} {{.Ports}}' | awk '/:${HOST_PORT}->/ {print \$1}' | xargs -r docker stop"

########################################
# 4) Start new container
########################################

echo ">>> Starting new container '${CONTAINER_NAME}' on port ${HOST_PORT}"
run_remote "docker run -d --name \"${CONTAINER_NAME}\" -p ${HOST_PORT}:${CONTAINER_PORT} \"${IMAGE_NAME}\""

echo ">>> Deployment complete."
echo "App should be reachable on http://${REMOTE_HOST}:${HOST_PORT}/"

