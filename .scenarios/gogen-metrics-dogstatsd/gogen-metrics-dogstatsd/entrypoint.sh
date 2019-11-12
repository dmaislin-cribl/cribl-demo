#!/bin/sh
if [ "$1" = "start" ]; then
    gogen -v -cd /etc/gogen -o tcp --url ${CRIBL_STATSD} -lj gen -s metrics
fi

exec "$@"
