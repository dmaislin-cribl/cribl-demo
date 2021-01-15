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

try:
    from yaml import CLoader as Loader, CDumper as Dumper
except ImportError:
    from yaml import Loader, Dumper

#config objects
services = [ "cribl",  "grafana", "influxdb2", "splunk" ]
allowed_ports = [ 3000, 8000, 8086, 9000 ]

def docker_login(options, acct):
  client = docker.from_env()
  ecr = boto3.client('ecr')
  token = ecr.get_authorization_token()

  username, password = base64.b64decode(token['authorizationData'][0]['authorizationToken']).decode().split(':')
  registry = token['authorizationData'][0]['proxyEndpoint']
  print("Token: %s - %s - %s" % (username,password,registry))
  resp = client.login(username, password, registry=registry)
  print(resp['Status'])


# Functions
# Set up ECR Repos for all the images in the skaffold.yaml file.
def setup_ecr(options,acct):
  ecr = boto3.client('ecr') 

  print("Ensuring ECR Repo is Setup...")
  with open('skaffold.yaml') as skf:
    skafcfg = load(skf, Loader=Loader)
    #print (json.dumps(skafcfg['build']['artifacts']))
    for art in skafcfg['build']['artifacts']:

      try:
        ecr.create_repository(repositoryName="%s/%s" % (options.repohead, art['image']))
      except botocore.exceptions.ClientError as error:
        if error.response['Error']['Code'] == "RepositoryAlreadyExistsException":
          #print("Repo Exists")
          pass
        else:
          print("Unhandled Error: %s" % error.response['Error']['Code'])

  print("Done")
  docker_login(options,acct)

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
  
  patch = {'metadata': { 
          'annotations': {'description': options.description}}}
  kubeclient.patch_namespace(options.ns, patch)

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
parser.add_option("-a", "--description", dest="description", default="Demo Environment")
parser.add_option("-c", "--container-repo-head", dest="repohead", default="cribl-demo", help="ECR Repo top level")
parser.add_option("-p", "--profile", dest="profile", help="Skaffold Profile to run with")
(options, args) = parser.parse_args()

# Set default env variables
if "CRIBL_TAG" not in os.environ:
  os.environ['CRIBL_TAG'] = "latest"

# Set up AWS objects
s3 = boto3.client('s3')
sts = boto3.client('sts')
r53 = boto3.client("route53")


# get acct id and hosted zone id
acct = sts.get_caller_identity()
options.description += "<br>Created by %s" % acct['UserId']
zoneid = get_hosted_zone(options)

# Make sure the ECR repos are setup.
setup_ecr(options,acct)

# Setup the K8s API Client
config.load_kube_config()
kubeclient = client.CoreV1Api()

# ensure that the specified namespace is set up
check_namespace(options, kubeclient)

# Set up the SKAFFOLD env var
os.environ['SKAFFOLD_DEFAULT_REPO'] = "%s.dkr.ecr.%s.amazonaws.com/%s" % (acct['Account'], options.region, options.repohead)

# Run skaffold build with the namespace as the tag (this allows us to have different images for different deployments/namespaces)
skaffbuildcall = "/usr/local/bin/skaffold build --tag=%s" % options.ns
skaffdeploycall = "/usr/local/bin/skaffold deploy --status-check --tag=%s -n %s" % (options.ns, options.ns)
if (options.profile):
  skaffbuildcall = "/usr/local/bin/skaffold build --tag=%s --profile=%s" % (options.ns, options.profile)
  skaffdeploycall = "/usr/local/bin/skaffold deploy --status-check --tag=%s --profile=%s -n %s" % (options.ns, options.profile, options.ns)

rval = subprocess.call(skaffbuildcall,  shell=True)
if rval == 0:
  print("Skaffold Build Succeeded")
else:
  print("Skaffold Build Failed")
  sys.exit(rval)

# Run Skaffold Deploy with the namespace as tag and namespace to deploy in
rval = subprocess.call(skaffdeploycall,  shell=True)
if rval == 0:
  print("Skaffold Deploy Succeeded")
else:
  print("Skaffold Deploy Failed")
  sys.exit(rval)

time.sleep(60)

# Setup the R53 JSON
chgbatch = { "Comment": "Upserting for the %s.%s domain" % (options.ns, options.domain), "Changes": []}



# Reverse the specified domain to make the bucket name
domrev = options.domain.split('.')
domrev.reverse()
revhost = ".".join(domrev)

print("Creating HTML Service View")
# Get the Service info, and generate an index.html to post for the namespace.
htmlout = """
<HTML>
  <HEAD>
    <TITLE>Services in %s</TITLE>
    <link rel='stylesheet' href='https://cribl.io/wp-content/themes/cribl/assets/css/main.css?ver=1608242659'>
  </HEAD>
  <BODY>
    <H2>Services in %s</H2>
    <p>%s</p>
    <ul>
""" % (options.ns, options.ns, options.description)

for svc in services:
  ret = kubeclient.read_namespaced_service(svc, options.ns)
  for host in ret.status.load_balancer.ingress:
    chg = { "Action": "UPSERT", "ResourceRecordSet": { "Name": "%s.%s.%s" % ( svc, options.ns, options.domain ), "Type": "CNAME", "TTL": 300, "ResourceRecords": [ { "Value": host.hostname } ] } }
    chgbatch['Changes'].append(chg)
    for port in ret.spec.ports:
      if port.port in allowed_ports:
        htmlout += "<LI>Service: <A HREF=http://%s.%s.%s:%d/>%s</A></LI>" % ( svc, options.ns, options.domain, port.port, svc )

htmlout += "</ul></body></HTML>"

htmlb = htmlout.encode("utf8")

# put the index.html file up.
resp = s3.put_object(Bucket=revhost, Body=htmlb, Key="ns-%s/index.html" % options.ns, ACL='public-read', ContentType='text/html')
tagset = {
  'TagSet': [
    {
      'Key': 'namespace-description',
      'Value': options.description
    }
  ]
}
print("Tagset: %s" % json.dumps(tagset))
#tagresp = s3.put_object_tagging(Bucket=revhost, Key="ns-%s/index.html" % options.ns, Tagging=tagset)
print("Done")

print ("Updating R53")
response = r53.change_resource_record_sets(HostedZoneId=zoneid, ChangeBatch = chgbatch)
print("%s - %s" % (response['ChangeInfo']['Status'], response['ChangeInfo']['Comment']))
