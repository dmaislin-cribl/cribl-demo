This demo environment uses Kubernetes. To run this locally, we recommend minikube. Additionally, this environment uses `skaffold` to orchestrate building the requisite containers and deploying into Kubernetes. On a Mac with homebrew:

    brew install minikube
    brew install skaffold

To run the demo (again, on a Mac):

    minikube start --driver=hyperkit --cpus=4 --memory=16GB
    skaffold dev --port-forward=true

Now, you can access Cribl at http://localhost:9000 with username `admin` password `cribldemo`. More documentation coming soon.
