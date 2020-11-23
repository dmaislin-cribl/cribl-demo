This demo environment uses Kubernetes. To run this locally, we recommend minikube. Additionally, this environment uses `skaffold` to orchestrate building the requisite containers and deploying into Kubernetes. On a Mac with homebrew:

    brew install minikube
    brew install skaffold

If you don't have homebrew, check out the following links for install instructions:
    * Minikube: https://minikube.sigs.k8s.io/docs/start/
    * Skaffold: https://skaffold.dev/docs/install/

To run the demo (again, on a Mac):

    ./start.sh
    skaffold dev --port-forward=true

Now, you can access Cribl at http://localhost:9000 with username `admin` password `cribldemo`. More documentation coming soon.
