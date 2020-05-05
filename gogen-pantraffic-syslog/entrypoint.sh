#!/bin/sh
echo "Out - ${CRIBL_PAN_SYSLOG}"
if [ "$1" = "start" ]; then
    gogen -v -c /etc/gogen/samples/pan.yml -o tcp --url ${CRIBL_PAN_SYSLOG} -ot rfc5424 -at -lj gen -s pan
fi

exec "$@"
