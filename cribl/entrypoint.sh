#!/bin/bash

# Add a signal trap to allow the container to kill itself (used for the SA datacollection instance
trap "exit" SIGTERM


# Assumed to be an s3 location
if [ -n "$CRIBL_CONFIG_LOCATION" ]; then
    # Trim s3://
    CRIBL_CONFIG_LOCATION=$(echo ${CRIBL_CONFIG_LOCATION} | sed -e 's*s3://**')
    CRIBL_SCRIPTS_LOCATION=$(echo ${CRIBL_SCRIPTS_LOCATION} | sed -e 's*s3://**')
    if [ -z "$S3_REGION" ]; then
        if [ -n "$AWS_DEFAULT_REGION" ]; then
            export RCLONE_S3_REGION=${AWS_DEFAULT_REGION}
        else
            export RCLONE_S3_REGION=$(curl http://169.254.169.254/latest/dynamic/instance-identity/document | jq .region -r)
        fi
    else
        export RCLONE_S3_REGION=${S3_REGION}
    fi
    # Ensure region is set
    if [ -n "$RCLONE_S3_REGION" ]; then
        env
        rclone copy -v :s3:${CRIBL_CONFIG_LOCATION} /opt/cribl/local/cribl
        mkdir -p /opt/cribl/scripts
        rclone copy -v :s3:${CRIBL_SCRIPTS_LOCATION} /opt/cribl/scripts
        chmod -R 755 /opt/cribl/scripts
    else
        echo "CRIBL_CONFIG_LOCATION set but S3_REGION is not set and cannot be discovered."
        exit 1
    fi
fi

# Make sure all these directories are in the top layer
mkdir -p /opt/cribl/local/_system
mkdir -p /opt/cribl/local/cribl
mkdir -p /opt/cribl/data
mkdir -p /opt/cribl/state
mv /opt/cribl/data /opt/cribl/data.tmp && mv /opt/cribl/data.tmp /opt/cribl/data
mv /opt/cribl/state /opt/cribl/state.tmp && mv /opt/cribl/state.tmp /opt/cribl/state

for n in {1..30}; do
    if [[ -n $(eval echo \$\{CRIBL_BEFORE_START_CMD_${n}\}) ]]; then
        sh -c "$(eval echo \$\{CRIBL_BEFORE_START_CMD_${n}\})"
    else
        break
    fi
done

if [ "$1" = "cribl" ]; then
    touch /opt/cribl/log/cribl.log
    /opt/cribl/bin/cribl start
    tail -n 0 -f /opt/cribl/log/cribl.log &
    for n in {1..30}; do
        if [[ -n $(eval echo \$\{CRIBL_AFTER_START_CMD_${n}\}) ]]; then
            sh -c "$(eval echo \$\{CRIBL_AFTER_START_CMD_${n}\})"
        else
            break
        fi
    done
    wait 
else 
    exec "$@"
fi

