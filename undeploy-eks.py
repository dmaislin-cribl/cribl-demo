#!/usr/bin/env python3

from optparse import OptionParser
from kubernetes import client, config
from yaml import load, dump
import sys
import boto3
import json
import botocore.exceptions
import subprocess
import os
import time
import docker
import base64
import urllib3
from urllib.parse import quote_plus

try:
    from yaml import CLoader as Loader, CDumper as Dumper
except ImportError:
    from yaml import Loader, Dumper

#config objects
services = [ "cribl",  "grafana", "influxdb2", "splunk" ]
allowed_ports = [ 3000, 8000, 8086, 9000 ]

# Check that the specified namespace exists, and create it if it doesn't
def check_namespace(options, kubeclient):
  nslist = kubeclient.list_namespace()
  found = 0
  for ns in nslist.items:
    if (ns.metadata.name == options.ns):
      found = 1
      print (ns.metadata.name)
  
  if found == 0:
    print("Need to create the namespace")
    kubeclient.create_namespace(client.V1Namespace(metadata=client.V1ObjectMeta(name=options.ns)))
  
  

# Lookup the zoneid of the hosted zone - die if it doesn't exist.
def get_hosted_zone(options):
  r53 = boto3.client("route53")

  print ("Finding Domain %s" % options.domain)
  retzones = r53.list_hosted_zones_by_name(DNSName=options.domain)
  for zone in retzones['HostedZones']:
    print ("Name; %s" % zone['Name'])
    if (zone['Name'] == "%s." % options.domain):
      return zone['Id']  
  
    print("No Zone Found - Not Continuing")
    sys.exit(0)

# Set up Command Line Parsing
parser = OptionParser()
parser.add_option("-n", "--namespace", dest="ns", default="default", help="Namespace to Interrogate")
parser.add_option("-d", "--domain", dest="domain", default="demo.cribl.io", help="Hosted Zone to Use")
parser.add_option("-r", "--region", dest="region", default="us-west-2", help="AWS Region to deploy to")
parser.add_option("-c", "--container-repo-head", dest="repohead", default="cribl-demo", help="ECR Repo top level")
(options, args) = parser.parse_args()

# Set up AWS objects
s3 = boto3.client('s3')
sts = boto3.client('sts')
r53 = boto3.client("route53")


# get acct id and hosted zone id
acct = sts.get_caller_identity()
zoneid = get_hosted_zone(options)


# Setup the K8s API Client
config.load_kube_config()
kubeclient = client.CoreV1Api()

# ensure that the specified namespace is set up
check_namespace(options, kubeclient)

# Set up the SKAFFOLD env var
os.environ['SKAFFOLD_DEFAULT_REPO'] = "%s.dkr.ecr.%s.amazonaws.com/%s" % (acct['Account'], options.region, options.repohead)
# Setup the R53 JSON
chgbatch = { "Comment": "Deleting for the %s.%s domain" % (options.ns, options.domain), "Changes": []}



# Reverse the specified domain to make the bucket name
domrev = options.domain.split('.')
domrev.reverse()
revhost = ".".join(domrev)

for svc in services:
  ret = kubeclient.read_namespaced_service(svc, options.ns)
  for host in ret.status.load_balancer.ingress:
    chg = { "Action": "DELETE", "ResourceRecordSet": { "Name": "%s.%s.%s" % ( svc, options.ns, options.domain ), "Type": "CNAME", "TTL": 300, "ResourceRecords": [ { "Value": host.hostname } ] } }
    chgbatch['Changes'].append(chg)

# put the index.html file up.
try:
  resp = s3.delete_object(Bucket=revhost, Key="ns-%s/index.html" % options.ns)
except Exception as e:
  print("Couldn't Delete Manifest (index) file. Continuing")
  pass

#tagset = {
#  'TagSet': [
#    {
#      'Key': 'namespace-description',
#      'Value': options.description
#    }
#  ]
#}
#print("Tagset: %s" % json.dumps(tagset))
#tagresp = s3.put_object_tagging(Bucket=revhost, Key="ns-%s/index.html" % options.ns, Tagging=tagset)
#print("TAGRESP: %s" % tagresp)
print("Done")

print ("Updating R53")
try:
  response = r53.change_resource_record_sets(HostedZoneId=zoneid, ChangeBatch = chgbatch)
  print("%s - %s" % (response['ChangeInfo']['Status'], response['ChangeInfo']['Comment']))

except Exception as e:
  print("Error managing route53 - records are likely still present. Continuing...")
  pass


skaffdeletecall = "skaffold delete -n %s" % options.ns

rval = subprocess.call(skaffdeletecall,  shell=True)
if rval == 0:
  print("Skaffold Delete Succeeded")
else:
  print("Skaffold Delete Failed")
  sys.exit(rval)
