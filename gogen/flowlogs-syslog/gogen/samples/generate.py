#!/usr/bin/env python3

import csv
from random import randint

destports = [80, 443, 22, 9000, 8080, 53]
extips = [
  "103.125.191.136",
  "103.226.248.72",
  "104.197.230.188",
  "108.161.138.152",
  "111.223.73.130",
  "117.52.87.230",
  "129.144.62.179",
  "13.80.137.40",
  "134.119.193.57",
  "142.105.57.15",
  "188.146.131.155",
  "205.185.123.210",
  "34.216.163.39",
  "34.216.78.37",
  "34.217.108.226",
  "34.218.47.231",
  "40.70.134.175",
  "51.15.82.93",
  "52.88.186.130",
  "54.202.255.47",
  "54.245.68.218",
  "76.102.124.169",
  "87.251.74.56"
]

with open("output.csv", "w") as fw:
  fieldnames = [ "account", "sourceip", "destip", "sourceport", "destport"] 
  outwriter = csv.DictWriter(fw, fieldnames=fieldnames)
  outwriter.writeheader()
  with open ('f.p') as f:
    reader = csv.DictReader(f)
    for row in reader:
      # Local Traffic
      for i in range(randint(1,20)):
        local1 = randint(11,254)
        local2 = randint(11,254)
        local3 = randint(11,254)
        local4 = randint(11,254)

        outwriter.writerow({
          "account": row['account'],
          "sourceip": "%s.%d.%d" % (row['cidr'], local1, local2), 
          "destip": "%s.%d.%d" % (row['cidr'], local3, local4), 
          "sourceport": randint(10000,65335),
          "destport": destports[randint(0,5)]
        })
      
      # Remote Source Traffic
      for i in range(randint(1,20)):
        local1 = randint(11,254)
        local2 = randint(11,254)

        outwriter.writerow({
          "account": row['account'],
          "sourceip": extips[randint(0, len(extips) - 1)],
          "destip": "%s.%d.%d" % (row['cidr'], local3, local4), 
          "sourceport": randint(10000,65335),
          "destport": destports[randint(0,5)]
        })
      
      # Remote Dest Traffic
      for i in range(randint(1,20)):
        local1 = randint(11,254)
        local2 = randint(11,254)

        outwriter.writerow({
          "account": row['account'],
          "destip": extips[randint(0, len(extips) - 1)],
          "sourceip": "%s.%d.%d" % (row['cidr'], local3, local4), 
          "sourceport": randint(10000,65335),
          "destport": destports[randint(0,5)]
        })
      
