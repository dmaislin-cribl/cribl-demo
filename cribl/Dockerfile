FROM cribl/cribl:latest
# copy cli- script(s) to /opt/cribl/demo-scripts
COPY demo-scripts /opt/cribl/demo-scripts
# Install expect as a workaround for CRIBL-2603 - will remove once that's resolved
RUN sh -c 'echo dash dash/sh boolean false | debconf-set-selections' && \
    sh -c 'DEBIAN_FRONTEND=noninteractive dpkg-reconfigure dash' && \
    apt-get update && \
    ln -fs /usr/share/zoneinfo/Etc/UTC /etc/localtime && \
    apt-get install -y expect && \
    rm -rf /var/lib/apt/lists/*
ADD entrypoint.sh /sbin/entrypoint.sh
