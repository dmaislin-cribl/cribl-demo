# minio

Demo instance of MinIO. We use the stock container from MinIO instead of building a custom one. 

## File: minio.k8s.yml

Runtime configuration settings.

### K8s Deployment Contents
* PersistentVolumeClaim. - 20Gi
* Service - NodePort by default
* Deployment
	* initContainer - simple container that builds the bucket structure for the minio environment on the persistent volume.
	* container - the stock minio container.
