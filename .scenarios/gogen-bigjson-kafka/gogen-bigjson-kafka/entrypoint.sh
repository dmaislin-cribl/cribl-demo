#!/bin/sh
if [ "$1" = "start" ]; then
    gogen -v -cd /etc/gogen -o kafka --url ${CRIBL_KAFKA} --topic cribl -ot json -at -lj gen -s bigjson
fi

exec "$@"
