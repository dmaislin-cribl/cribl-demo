# Troubleshooting cribl-demo deployment

## Minikube

### Insufficient cpu notices

* if you're trying to run on minikube without a profile, this is likely an error that will lead to
  failure. Instead, try running skaffold dev with the `-p dev` or `-p minimal` options to reduce the 
  cpu and memory requirements.

* if you're running with one of the profiles, and minikube does not have at least 2 cpus allocated for it, you'll need to recreate your minikube runtime. To do this:

  ```
  minikube stop
  minikube delete
  minikube start --cpus=2 --memory=8192mb
  ```
  
  you should be able to re-run your skaffold command line, and have it run successfully. 
  

* if you're running with one of the profiles AND minikube does have at least 2 cpus, this most likely is a warning, and the containers will schedule and run given a little wait time. 


### Influxdb "exceeded progress deadline"

This issue seems to appear sporadically when running on minikube, and appears to be due to one of the helm charts jobs running for too long.  While we're still trying to figure out why this happens, more often then not, just re-running the `skaffold dev` command fixes it. 