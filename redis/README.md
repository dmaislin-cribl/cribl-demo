# redis

## File Dockerfile


Builds upon the base redis container, replacing the entrypoint.sh with one that pre-loads the data in the CSV files in the directory. 

## Adding Data
To add new data, you'll need to:

1. Add a csv file to the directory.
1. Add that csv file add an "ADD" statement in the Dockerfile (see the others)
1. Add a line to loaddata.sh to add the data to redis (see the other lines)


## File redis.k8s.yml
* Deployment - runs redis, mapping point 6379.
* Service - ClusterIP based service.



