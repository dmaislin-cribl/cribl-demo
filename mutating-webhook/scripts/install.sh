#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

source ${DIR}/config.sh
source ${DIR}/certs.sh

# Create image for webhook server
# [ $? -eq 0 ] && source ${DIR}/image.sh   || exit $?

# Create k8s objects
[ $? -eq 0 ] && source ${DIR}/objects.sh || exit $? 
