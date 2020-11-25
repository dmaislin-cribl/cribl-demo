#!/bin/bash

if [ -z "${WEBHOOK_DIR}" ]; then
    DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    source ${DIR}/config.sh
fi

# Docker image for webhook server
# Only public Docker hub is supported!
echo 'Building image for webhook server'
cd ${WEBHOOK_DIR}

IMAGE_NAME=${WEBHOOK_APP}
IMAGE_TAG=0.0.1
docker build --no-cache -t ${DOCKER_REPO_NAME}/${IMAGE_NAME}:${IMAGE_TAG} .
docker push ${DOCKER_REPO_NAME}/${IMAGE_NAME}:${IMAGE_TAG}
# echo 'Loading ${DOCKER_REPO_NAME}/${IMAGE_NAME}:${IMAGE_TAG} in kind cluster scopetest'
# kind load docker-image --name scopetest ${DOCKER_REPO_NAME}/${IMAGE_NAME}:${IMAGE_TAG}

echo 'Building image for init container'
cd ${SCOPE_DIR}
IMAGE_NAME=${INIT_APP}
IMAGE_TAG=0.0.1
docker build --no-cache -t ${DOCKER_REPO_NAME}/${IMAGE_NAME}:${IMAGE_TAG} .
docker push ${DOCKER_REPO_NAME}/${IMAGE_NAME}:${IMAGE_TAG}
