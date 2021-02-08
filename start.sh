#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

cd ${DIR}

[ "$1" = "local" ] && minikube start $*

source ${DIR}/mutating-webhook/scripts/install.sh
# cd ${DIR} && exec skaffold dev --port-forward=true
