#!/bin/sh
if [ "$1" = "start" ]; then
    gogen -v -cd /etc/gogen -o http --url ${CRIBL_HEC} -ot splunkhec -at -lj gen -s businessevent 2>&1 ${CRIBL_GOGEN_NC_LOG}
fi

exec "$@"
