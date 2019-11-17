#!/bin/sh
if [ "$1" = "start" ]; then
    gogen -v -cd /etc/gogen -o http --url ${CRIBL_HEC} -ot splunkhec -at -lj gen -s businessevent
fi

exec "$@"
