# grafana
Demo Environment Grafana Instance

## File: Dockerfile 
Creates a custom grafana container, augmenting the stock container with the dashboards and datasources sub-directories within this directory. 

## File: grafana.k8s.yml 

Specifies the container run-time parameters.

### k8s deployment includes
* PersistentVolumeClaim - 10GB
* Deployment
	* initContainer - pre-creates the directory structure on the persistent volume, setting permissions as grafana expects them.
	* container - the actual grafana container, mounting the persistent volume prepared by the initContainer, and running Grafana.
* Service - LoadBalancer tye, as grafana is a user facing service, on port 3000