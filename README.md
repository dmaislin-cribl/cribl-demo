<<<<<<< HEAD

**This demo environment now runs only on Kubernetes**. If you still need to run the old docker-compose version, the `docker-legacy` branch will be available until April 1, 2021. In your local repo, simply run `git checkout docker-legacy` and you can continue to run the docker-compose version. 

## Running Locally

To run this locally, we recommend minikube. Additionally, this environment uses `skaffold` to orchestrate building the requisite containers and deploying into Kubernetes. 

_**NOTE**_ - due to some problems with different k8s engines, it's recommended that you use version 1.17.2 of skaffold - the directions below reflect that.  

## Pre-Requisites

### On a Mac with homebrew

```
sudo brew install minikube
sudo brew install kubectl
sudo brew install helm
curl -Lo skaffold https://storage.googleapis.com/skaffold/releases/v1.17.2/skaffold-darwin-amd64 && chmod +x skaffold && sudo mv skaffold /usr/local/bin
```

### On a Mac with MacPorts
```
sudo port install minikube kubectl-1.20 helm-3.5
sudo port select --set helm helm3.5
sudo port select --set kubectl kubectl1.20
curl -Lo skaffold https://storage.googleapis.com/skaffold/releases/v1.17.2/skaffold-darwin-amd64 && chmod +x skaffold && sudo mv skaffold /usr/local/bin
```

If you don't have homebrew or MacPorts, check out the following links for install instructions:
    * Minikube: https://minikube.sigs.k8s.io/docs/start/
    * Skaffold: https://skaffold.dev/docs/install/



### On Linux:
```
     curl -Lo skaffold https://storage.googleapis.com/skaffold/releases/v1.17.2/skaffold-linux-amd64 && chmod +x skaffold && sudo mv skaffold /usr/local/bin

    curl -LO https://storage.googleapis.com/kubernetes-release/release/$(curl -s https://storage.googleapis.com/kubernetes-release/release/stable.txt)/bin/linux/amd64/kubectl \
    && sudo install kubectl /usr/local/bin && rm kubectl

    curl https://baltocdn.com/helm/signing.asc | sudo apt-key add - && \
    sudo apt-get install apt-transport-https --yes && \
    echo "deb https://baltocdn.com/helm/stable/debian/ all main" | sudo tee /etc/apt/sources.list.d/helm-stable-debian.list && \
    sudo apt-get update && \
    sudo apt-get install helm

    curl https://raw.githubusercontent.com/helm/helm/master/scripts/get-helm-3 | bash

    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add - && \
    sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu focal stable" && \
    sudo apt update && \
    sudo apt install docker-ce && \
    sudo usermod -aG docker ${USER}

    curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64 \
    && sudo install minikube-linux-amd64 /usr/local/bin/minikube && rm minikube-linux-amd64
```

## Running

To run the demo LOCALLY on minikube (again, on a Mac):

    ./start.sh local
    skaffold dev --port-forward=true -p dev

If you already have minikube running, you can omit the "local" argument to `start.sh`. The `-p dev` argument to skaffold invokes the "dev" profile, which uses kube-proxy redirection for service deployment. If that's omitted, the services for cribl, splunk and grafana will all attempt to create load balancers and require significantly more horsepower from the hosting machine.

Now, you can access Cribl at http://localhost:9000 with username `admin` password `cribldemo`. 


## Profiles

We have two alternate profiles in the skaffold.yaml file:

* dev - this reduced the memory load of the environment by reducing the resource allocations for each pod. 
* minimal - this also reduces the memory load through reduced resource allocations, as well as a lower number of pods.


## EKS Deployment

At Cribl, we run our standard demo environments on an AWS EKS cluster. If you would like to deploy this on EKS, see the [EKS-DEPLOY.md](EKS-DEPLOY.md) file. 

## Contributing to the cribl-demo project

If you want to contribute to the repo, see the [CONTRIBUTING.md](CONTRIBUTING.md) file.

# Reference Material

* [Minikube Tutorial](https://kubernetes.io/docs/tutorials/hello-minikube/) on kubernetes.io
* [Minikube Github Project](https://github.com/kubernetes/minikube)
=======
# Cribl Demo

This repo is used for building and running Cribl demos. All demos contained within utilize [Docker](https://docs.docker.com/install/). To get started, all you need to do is:

    git clone https://github.com/criblio/cribl-demo.git
    cd cribl-demo
    docker-compose up -d

This will launch a Cribl demo environment with a number of sources and destinations. Several of these systems expose their own interfaces, like Cribl, Splunk and Elasticsearch (Kibana):

| System                 | URL                                                                                                    | Username | Password  |
|------------------------|--------------------------------------------------------------------------------------------------------|----------|-----------|
| Cribl                  | http://localhost:9000/login?username=admin&password=cribldemo                                          | admin    | cribldemo |
| Splunk                 | http://localhost:8000/en-US/account/insecurelogin?loginType=splunk&username=admin&password=cribldemo-  | admin    | cribldemo |
| Elasticsearch (Kibana) | http://localhost:9200                                                                                  |          |           |
| Grafana                | http://localhost:8200                                                                                  | admin    | cribldemo |
| Graphite               | http://localhost:8100                                                                                  |          |           |

## How to start data flowing into demo systems

1. Under Worker Groups: click on Commit for each worker to commit the configuration changes to git (local)
2. Click on Deploy to deploy the changes to each worker. Workers that belong to the group will start pulling updated configurations on their next check-in.
3. Wait a few seconds for changes to take effect

## What to see first

The Cribl UI shows you all the sources, routes and pipelines and will give you a good overview of the types of data flowing in real time.

The Splunk environment contains a number of dashboards which shows off use cases for Cribl. It's a nice overview of the capabilities, and it contains easy links to the pipelines which are reshaping the data.

## Data Sources & Destinations

Data for this demo comes from two sources: [Gogen](https://github.com/coccyx/gogen) and [Filebeat](https://github.com/elastic/beats). Gogen generates data through a number of different protocols, like HTTP, Splunk Universal Forwarder, TCP JSON, Syslog, and onto a Kafka bus. Cribl is configured to receive or pull from all of those particular protocols. Gogen is configured to generate fake data like Weblogs, Transaction logs, etc. It will backfill one hour's worth of data on startup, which you will see as a spike in the graphs. Secondly, Filebeat is configured to grab logs from Docker.

    Gogen
    `- HTTP -> cribl:10001
    `- Splunk Universal Forwarder -> cribl:9999
    `- TCP -> cribl:10001
    `- Syslog -> cribl:10003
    `- Kafka - topic cribl
    `- Dogstatsd -> cribl:8125
      `- Cribl
        `- S2S -> splunk:9997
        `- Elastic Bulk Ingestion -> elastic:9200
        `- S3 -> minio:80
        `- Graphite -> graphite:2003

On the output side, Cribl is outputting to Splunk, Elasticsearch, Graphite, and S3 (Minio). Data can be found in the following locations:

| System        | Data Location        |
|---------------|----------------------|
| Splunk        | index=cribl          |
| Splunk        | index=cribl-modified |
| Elasticsearch | filebeat-*           |
| Elasticsearch | bigjson              |
| Elasticsearch | bigjson-trimmed      |
| Minio         | ./data               |


## Stopping the demo

Stop the demo through `docker-compose`:

    docker-compose down

## Errata

We use Elastic Filebeat to pick up logs from the docker container. This may require you to run docker as root in order to access `/var/run/docker.sock`. In that case you may need to run `sudo docker-compose up -d` to run the demo. 

If you have docker in a non-standard location, we may need to find a different root directory. If Filebeat still isn't picking up logs, you can try running: `DOCKER_LIB_CONTAINERS=$(docker info -f '{{.DockerRootDir}}')/containers && sudo DOCKER_LIB_CONTAINERS=${DOCKER_LIB_CONTAINERS} docker-compose up -d`.
# Metrics Demo

This scenario adds support for metrics use cases to the LogStream demo. We open a metrics input on dogstatsd and graphite protocols. We add pipelines for processing that data. We add pipelines for processing weblog data, aggregating it into metric events and then outputting to Influxdb. This scenario also adds InfluxDB as a datastore and Grafana as a visualization engine.

## Notable URLs

| Description                | URL                                                                                                    | Username | Password  |
|----------------------------|--------------------------------------------------------------------------------------------------------|----------|-----------|
| Cribl                      | http://localhost:9000                                                                                  | admin    | cribldemo |
| Grafana                    | http://localhost:8200                                                                                  | admin    | cribldemo |


## Network monitoring notable URLs
| Description                | URL                                                                                                    | Username | Password  |
|----------------------------|--------------------------------------------------------------------------------------------------------|----------|-----------|
| MTR Pipeline               | http://localhost:9000/pipelines/mtr                                                                    | admin    | cribldemo |
| Logs To Metrics Pipeline   | http://localhost:9000/pipelines/logs_to_metrics                                                        | admin    | cribldemo |

## Network Dashboard

In [Grafana](http://localhost:8200), we ship a dashboard which shows the output of [MTR](https://github.com/traviscross/mtr) which is kind of a combination of ping and traceroute. We have `mtr` output JSON, and use `nc` to send the data to a Cribl TCPJSON input. The [MTR Pipeline](http://localhost:9000/pipelines/mtr) takes the JSON from `mtr` and explodes it into an event for every hop along the network path. It then resolves the host IP from DNS and publishes each of the hops as a metric to InfluxDB.

This shows a practical use case for taking data output by standard utilities and munging it easily into a format expected by another downstream datastore, in this case InfluxDB.
>>>>>>> master
