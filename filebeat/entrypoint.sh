#!/bin/sh

mkdir -p /var/log/beats

if [ "$1" = "start" ]; then
    gogen -v -cd /etc/gogen -o file --filename /var/log/authfailed.log -lj gen 2>/var/log/gogen.log &
    filebeat -c /etc/filebeat/filebeat.yml run
fi

exec "$@"
