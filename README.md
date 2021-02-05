
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
