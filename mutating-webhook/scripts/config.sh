#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

WEBHOOK_APP=scope-webhook
INIT_APP=scope-init
K8S_NAMESPACE=scope
DOCKER_REPO_NAME=cribl

# The folder where the GitHub repository was cloned into.
PROJECT_HOME=${DIR}/..
# Other folders we need for this script
CONF_DIR=${PROJECT_HOME}/conf
SCRIPTS_DIR=${PROJECT_HOME}/scripts 
CERTS_DIR=${PROJECT_HOME}/certs 
YAML_DIR=${PROJECT_HOME}/yaml
WEBHOOK_DIR=${PROJECT_HOME}/webhook 
SCOPE_DIR=${PROJECT_HOME}/scope 

# Create certificates and secrets
## Determine the OS type - https://stackoverflow.com/a/3466183/919480
unameOut="$(uname -s)"
case "${unameOut}" in
    Linux*)     OS_TYPE=linux;;
    Darwin*)    OS_TYPE=macos;;
    *)          OS_TYPE=unsupported;;
esac
