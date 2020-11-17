#!/bin/bash
set -e

sleep 10 && influx apply -o cribl -f /templates &

if [ "${1:0:1}" = '-' ]; then
    set -- influxd "$@"
fi

exec "$@"