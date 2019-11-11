#!/bin/sh
if [ "$1" = "start" ]; then
    gogen -v -cd /etc/gogen -o http --url http://cribl:10088/services/collector/event -ot splunkhec -at -lj gen -s businessevent 2>| nc cribl 10001
fi

exec "$@"
