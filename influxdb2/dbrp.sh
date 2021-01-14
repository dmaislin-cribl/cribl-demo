#!/bin/sh
TOKEN=sKvQsRYB9OTwG53QszRyoEYd6t99Xp_HlG29GxDs1sfxep7XHkMPWrqKroMs8mSoGPokIvUlJuptcESe_X8uig==
BASE_URL=http://localhost:8086/api/v2
ORG=cribl
DB=cribl
BUCKET=cribl
BUCKET_ID=$(curl -s -H "Authorization: Token ${TOKEN}" -H "Content-Type: application/json" ${BASE_URL}/buckets?name=${BUCKET} | jq -r .buckets[0].id)
ORG_ID=$(curl -s -H "Authorization: Token ${TOKEN}" -H "Content-Type: application/json" ${BASE_URL}/orgs?org=${ORG} | jq -r .orgs[0].id)
curl -X POST -H "Authorization: Token ${TOKEN}" -H "Content-Type: application/json" ${BASE_URL}/dbrps -d @- <<EOF
{ 
    "bucket_id": "${BUCKET_ID}",
    "database": "${DB}",
    "default": true,
    "organization": "${ORG}",
    "organization_id": "${ORG_ID}",
    "retention_policy": "forever"
}
EOF