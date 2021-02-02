# cribl

As most demo work ends up being in the cribl config, the most important subdirectory for you to be familiar with is the cribl sub-directory.


```
cribl
├── charts
│   ├── logstream-master
│   └── logstream-workergroup
├── master
│   ├── groups
│   │   ├── aws
│   │   ├── dc1-logs
│   │   └── dc1-metrics
│   ├── local
│   │   ├── _system
│   │   └── cribl
│   │       └── auth
│   └── scripts
├── sa
└── worker
```

## charts subdirectory

This directory contains a static copy of the cribl helm charts. For the first roll out of the skaffold based approach, all helm charts are copied locally, as we customize them a little bit. In the future, this will be replaced by a process that renders the helm templates, customizing them on the fly, to minimize the maintenance load of keeping a local copy up to date.

## master subdirectory

This directory includes the Dockerfile for for building a customized image for the master helm chart, as well as the tree that gets copied to it. The Dockerfile copies the contents of the master directory to $CRIBL_VOLUME_DIR (in the demos case, that would be the persistent volume mounted at /opt/cribl/config-volume. Also in this subdirectory:

* groups - the configuration tree that is used to configure the workers. Any changes to a worker groups pipelines, routes, functions, etc., get done in this directory. Each directory under groups represents a worker group. 

* local - this is the local configuration for the master node itself.

* sa - this is the configuration for the standalone kubernetes job “cribl-sa”, which is used to see the data collection demo bucket with data. It also contains a Dockerfile used to build the image for that job. 

* worker - this contains a Dockerfile that is used to build a special image to override the helm workergroup chart (mostly to pre-install tools that will be needed for the workers for the demo, like speedtest or python). 