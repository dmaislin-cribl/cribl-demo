# gogen

This pod deploys multiple gogen containers, effectively 1 for each sub directory (though anything new needs to be added to gogen.k8s.yml). Each container therein runs an instance of gogen generating a specific type of data and sending to a specific port on one of the logstream workers.

### gogen.k8s.yml

Defines each container, and injects environment variables for the gogen container to use to execute. Each subdirectory contains a `Dockerfile` to build that specific container

### K8s Deployment
* Deployment, containing the following containers:
  * flowlogs-syslog - generates vpc flowlogs for the aws workergroup
  * accesscombined-forwarder - sends accesscombined logs via the splunk universal forwarder to the dc1-logs workergroup
  * authfailed-filebeat - generates auth failed logs, and feeds them to the dc1-logs group via filebeats
  * metrics-dogstatsd - generates metrics sent to the dc1-metrics workergroup. 
  * bigjson-webhook - generates the lambda json events for the aws workergroup, via the http bulk endpoint.
  * pantraffic-syslog - generates the "live" PAN logs for the dc1-logs workergroup, via syslog. 
  * businessevent-hec - generates the business event source type for the dc1-logs workergroup, via the HEC endpoint. 
  * statechange-syslog - generates nagios state change logs for the dc1-logs workergroup, via syslog
  * datacollection-syslog - feeds the cribl-sa instance 10 days worth of logs at startup. 