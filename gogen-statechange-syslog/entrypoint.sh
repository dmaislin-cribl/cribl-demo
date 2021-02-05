#!/bin/sh
if [ "$1" = "start" ]; then
    gogen -v -cd /etc/gogen -o tcp --url ${CRIBL_SYSLOG} -ot rfc5424 -at -lj gen -s statechange
fi

exec "$@"
