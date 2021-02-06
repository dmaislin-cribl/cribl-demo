#!/bin/sh
awk -F, 'NR > 1{ print "SET", "\"session_"$2"\"", "\""$1"\"" }' /data/session.csv | redis-cli --pipe
awk -F, 'NR > 1{ print "SET", "\"acctid_"$1"\"", "\""$2"\"" }' /data/aws_accounts.csv | redis-cli --pipe
