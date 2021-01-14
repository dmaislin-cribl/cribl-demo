#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd ${DIR}/../yaml
kind create cluster --config kind.yaml --name scopetest
kubectl config use-context kind-scopetest
source ${DIR}/install.sh
