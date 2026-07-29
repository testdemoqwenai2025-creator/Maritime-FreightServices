#!/usr/bin/env python3
import json,random,datetime
random.seed(42)
O=[]
def w(s=''):O.append(s)
def jo(d):
 r=[]
 for k,v in d.items():
  if isinstance(v,bool):r.append(f'"{k}":{"true" if v else "false"}')
  elif isinstance(v,str):r.append(f'"{k}":{json.dumps(v)}')
  elif v is None:r.append(f'"{k}":null')
  else:r.append(f'"{k}":{v}')
 return '{'+','.join(r)+'}'

# Port fields: name,cc,region,lat,lon,uloc,hsz,depth,cargo,tr,tz,pop,area,teu,dwt,mvd,berth,crane,tug,bunk,fw,mf,rep,whs,cold,haz,cong,aw,ash,own,op,web
PD=[
("Shanghai","CN","East Asia",31.23,121.47,"CNSHA","Very Large",17.5,"Container, Bulk, Break Bulk, Ro-Ro, Reefer",2.8,"Asia/Shanghai",24870000,6340.5,47300000,78500000,250000,342,680,45,1,1,1,1,850000,1,"Full","High",18.0,36.0,"Shanghai Port Authority","SIPG","www.portshanghai.com.cn"),
("Singapore","SG","Southeast Asia",1.27,103.84,"SGSIN","Very Large",22.0,"Container, Bulk, Break Bulk, Ro-Ro, Reefer",1.8,"Asia/Singapore",5640000,733.1,39400000,62000000,300000,66,205,35,1,1,1,1,420000,1,"Full","Medium",12.0,24.0,"MPA Singapore","PSA International","www.mpa.gov.sg"),
("Shenzhen","CN","East Asia",22.53,114.07,"CNSZX","Very Large",18.0,"Container, Bulk, Ro-Ro, Reefer",2.2,"Asia/Shanghai",17560000,1997.5,30200000,55000000,220000,172,410,32,1,1,1,1,680000,1,"Full","High",16.0,30.0,"Shenzhen Port Group","Yantian Port / Chiwan Wharf","www.szport.cn"),
("Ningbo-Zhoushan","CN","East Asia",29.87,121.73,"CNNGB","Very Large",22.5,"Container, Bulk Liquid, Bulk Dry, Break Bulk, Ro-Ro",3.5,"Asia/Shanghai",9400000,9816.0,35300000,132000000,400000,620,450,55,1,1,1,1,920000,0,"Full","Medium",14.0,32.0,"Ningbo Zhoushan Port Group","NZP Group","www.nbport.com.cn"),
("Busan","KR","East Asia",35.10,129.04,"KRPUS","Very Large",16.5,"Container, Bulk, Ro-Ro, Break Bulk, Reefer",1.2,"Asia/Seoul",3400000,770.0,23400000,38000000,200000,82,186,22,1,1,1,1,350000,1,"Full","Medium",10.0,26.0,"Busan Port Authority","BPA","www.busanpa.com"),
("Qingdao","CN","East Asia",36.07,120.38,"CNTAO","Large",21.0,"Container, Bulk Dry, Bulk Liquid, Break Bulk, Reefer",4.0,"Asia/Shanghai",10200000,11293.0,26200000,65000000,300000,120,210,28,1,1,1,1,580000,1,"Full","Medium",12.0,28.0,"Qingdao Port Group","Qingdao Port International","www.qdport.com"),
("Guangzhou","CN","East Asia",23.13,113.26,"CNGUZ","Large",15.5,"Container, Bulk, Break Bulk, Ro-Ro, Reefer",2.0,"Asia/Shanghai",18680000,7434.4,24200000,42000000,150000,360,290,30,1,1,1,1,520000,1,"Full","High",14.0,30.0,"Guangzhou Port Group","GZ Port","www.gzport.com"),
("Tianjin","CN","East Asia",38.98,117.72,"CNTXG","Large",18.0,"Container, Bulk Dry, Bulk Liquid, Break Bulk, Ro-Ro",3.2,"Asia/Shanghai",13700000,11917.0,21000000,48000000,250000,210,175,25,1,1,1,1,480000,1,"Full","Medium",14.0,28.0,"Tianjin Port Group","Tianjin Port Holdings","www.ptacn.com"),
("Rotterdam","NL","North Europe",51.92,4.48,"NLRTM","Very Large",24.0,"Container, Bulk Dry, Bulk Liquid, Break Bulk, Ro-Ro, Reefer",1.8,"Europe/Amsterdam",655000,105.0,14600000,469000000,400000,95,240,40,1,1,1,1,890000,1,"Full","Low",8.0,22.0,"Port of Rotterdam Authority","Rotterdam Port Authority","www.portofrotterdam.com"),
("Hamburg","DE","North Europe",53.55,9.99,"DEHAM","Large",16.5,"Container, Bulk Dry, Break Bulk, Ro-Ro, Reefer",3.6,"Europe/Berlin",1845000,755.3,8700000,125000000,200000,68,165,28,1,1,1,1,620000,1,"Full","Low",6.0,20.0,"Hamburg Port Authority","HHLA","www.hafen-hamburg.de"),
("Antwerp-Bruges","BE","North Europe",51.22,4.42,"BEANR","Large",17.5,"Container, Bulk Dry, Bulk Liquid, Break Bulk, Ro-Ro, Reefer",4.5,"Europe/Brussels",520000,120.0,12100000,215000000,220000,72,155,22,1,1,1,1,540000,1,"Full","Low",7.0,22.0,"Port of Antwerp-Bruges","Antwerp Port Authority","www.portofantwerpenbruges.be"),
("Dubai (Port Rashid)","AE","Middle East",25.27,55.27,"AEDXB","Medium",11.0,"Container, Break Bulk, Ro-Ro, Passenger",1.2,"Asia/Dubai",3550000,4114.0,3200000,18000000,80000,35,52,12,1,1,1,1,180000,1,"Limited","Low",6.0,18.0,"DP World","DP World Dubai","www.dpworld.com"),
("Los Angeles","US","North America",33.73,-118.27,"USLAX","Large",16.5,"Container, Break Bulk, Ro-Ro, Reefer",1.8,"America/Los_Angeles",3970000,1302.0,9380000,85000000,185000,62,120,18,1,1,1,1,320000,1,"Full","High",24.0,36.0,"City of Los Angeles","Port of Los Angeles","www.portoflosangeles.org"),
("Long Beach","US","North America",33.76,-118.22,"USLGB","Large",16.8,"Container, Break Bulk, Ro-Ro, Reefer",1.7,"America/Los_Angeles",466000,171.0,8700000,78000000,185000,55,108,16,1,1,1,1,280000,1,"Full","High",22.0,34.0,"City of Long Beach","Port of Long Beach","www.polb.com"),
("New York/New Jersey","US","North America",40.68,-74.03,"USNYC","Very Large",15.5,"Container, Break Bulk, Ro-Ro, Bulk Dry, Reefer",1.5,"America/New_York",8340000,783.8,9200000,95000000,180000,85,145,35,1,1,1,1,420000,1,"Full","Medium",12.0,28.0,"Port Authority of NY & NJ","PANYNJ","www.panynj.gov"),
("Savannah","US","North America",32.12,-81.10,"USSAV","Medium",14.3,"Container, Break Bulk, Bulk Dry, Ro-Ro",2.4,"America/New_York",148000,281.0,5600000,35000000,140000,42,38,10,1,1,1,0,210000,1,"Limited","Medium",16.0,30.0,"Georgia Ports Authority","GPA","www.gaports.com"),
("Jebel Ali","AE","Middle East",25.01,55.03,"AEJEA","Very Large",17.0,"Container, Bulk Dry, Bulk Liquid, Break Bulk, Ro-Ro, Reefer",1.0,"Asia/Dubai",3550000,4114.0,14500000,88000000,250000,78,98,20,1,1,1,1,560000,1,"Full","Medium",10.0,24.0,"DP World","DP World Jebel Ali","www.jebelaliport.ae"),
("Tokyo","JP","East Asia",35.65,139.77,"JPTYO","Large",15.0,"Container, Break Bulk, Ro-Ro, Bulk Dry, Reefer",2.0,"Asia/Tokyo",13960000,2194.0,4800000,72000000,120000,190,85,24,1,1,1,1,380000,1,"Full","Low",8.0,22.0,"Tokyo Port Authority","Tokyo Port Terminal","www.kouwan.metro.tokyo.lg.jp"),
("Yokohama","JP","East Asia",35.44,139.64,"JPYOK","Large",16.0,"Container, Break Bulk, Ro-Ro, Bulk Dry, Reefer",1.8,"Asia/Tokyo",3760000,437.4,2900000,52000000,150000,90,62,18,1,1,1,1,290000,1,"Full","Low",6.0,20.0,"Yokohama Port Authority","Yokohama Kawasaki International Port","www.yokohama-port.or.jp"),
("Kaohsiung","TW","East Asia",22.61,120.29,"TWKHH","Very Large",16.5,"Container, Bulk Dry, Break Bulk, Ro-Ro, Reefer",0.8,"Asia/Taipei",2770000,2947.0,9400000,48000000,200000,118,135,22,1,1,1,1,420000,1,"Full","Low",8.0,22.0,"Taiwan International Ports","Kaohsiung Port Corp","www.khb.gov.tw"),
("Port Klang","MY","Southeast Asia",3.00,101.39,"MYPKG","Large",15.5,"Container, Bulk Dry, Break Bulk, Ro-Ro, Reefer",4.2,"Asia/Kuala_Lumpur",860000,573.0,13700000,28000000,180000,62,88,15,1,1,1,1,320000,1,"Full","Medium",10.0,24.0,"Ministry of Transport Malaysia","Northport / Westports","www.pka.gov.my"),
("Tanjung Pelepas","MY","Southeast Asia",1.35,103.55,"MYTPP","Large",19.0,"Container, Break Bulk, Bulk Dry",2.8,"Asia/Kuala_Lumpur",65000,468.0,9500000,18000000,220000,38,72,10,1,1,1,1,210000,1,"Limited","Low",6.0,18.0,"APM Terminals","APM Terminals PTP","www.ptp.com.my"),
("Jakarta","ID","Southeast Asia",-6.10,106.85,"IDJKT","Large",14.0,"Container, Bulk Dry, Break Bulk, Ro-Ro, Reefer",1.2,"Asia/Jakarta",10560000,661.5,7800000,22000000,120000,85,55,14,1,1,1,0,260000,1,"Limited","High",18.0,32.0,"Pelindo II","Jakarta International Container Terminal","www.pelindo.co.id"),
("Mumbai","IN","South Asia",18.95,72.84,"INBOM","Large",14.5,"Container, Bulk Dry, Bulk Liquid, Break Bulk, Reefer",4.4,"Asia/Kolkata",20670000,603.4,6300000,85000000,125000,62,48,16,1,1,1,0,240000,1,"Limited","High",20.0,34.0,"Mumbai Port Authority","MbPT","www.mumbaiport.gov.in"),
("Colombo","LK","South Asia",6.96,79.85,"LKCMB","Medium",15.0,"Container, Bulk Dry, Break Bulk, Reefer",0.5,"Asia/Colombo",750000,37.3,7300000,52000000,150000,48,42,12,1,1,1,1,180000,1,"Limited","Medium",10.0,24.0,"Sri Lanka Ports Authority","SLPA","www.slpa.lk"),
]
print(f"Ports part1: {len(PD)}")
