#!/bin/sh
echo "Out - ${CRIBL_SA_SYSLOG}"
if [ "$1" = "start" ]; then
    gogen -v -c /etc/gogen/samples/pan.yml -o tcp --url ${CRIBL_SA_SYSLOG} -ot rfc5424 -at -lj gen -s pan
fi

exec "$@"
