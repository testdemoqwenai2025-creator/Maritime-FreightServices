#!/usr/bin/env python3
"""Generate massive maritime seed data. Outputs .ts file."""
import json, random, os

random.seed(42)
OUT = "/home/z/my-project/scripts/seed-maritime.ts"

lines = []
def w(s=""):
    lines.append(s)

# Write the file header
w("import { db } from '@/lib/db'")
w("")
w("export async function seedRichMaritimeData() {")
w("  console.log('Seeding MASSIVE Global Maritime & Freight Database...')")
w("  const t0 = Date.now()")
w("")
w("  // 0. CLEAR ALL TABLES")
w("  await db.booking.deleteMany()")
w("  await db.charter.deleteMany()")
w("  await db.tradeData.deleteMany()")
w("  await db.vesselDeparture.deleteMany()")
w("  await db.vesselArrival.deleteMany()")
w("  await db.shipmentEvent.deleteMany()")
w("  await db.shipmentDocument.deleteMany()")
w("  await db.container.deleteMany()")
w("  await db.shipment.deleteMany()")
w("  await db.vessel.deleteMany()")
w("  await db.cargoType.deleteMany()")
w("  await db.port.deleteMany()")
w("  await db.tradeRoute.deleteMany()")
w("  await db.carrier.deleteMany()")
w("  console.log('Tables cleared')")
w("")

# 1. CARRIERS (20)
carriers_raw = [
    ("Maersk","MAEU","Denmark","Copenhagen","www.maersk.com",1904,730,4100000,"2M",True,78.2,8.2,"World largest container line"),
    ("MSC","MSCU","Switzerland","Geneva","www.msc.com",1970,830,5100000,"Independent",True,75.8,9.1,"Largest by TEU capacity"),
    ("CMA CGM","CMDU","France","Marseille","www.cma-cgm.com",1978,620,3500000,"Ocean Alliance",True,76.5,8.8,"French global shipping giant"),
    ("COSCO Shipping","COSU","China","Shanghai","www.coscoshipping.com",1961,510,3100000,"Ocean Alliance",True,80.1,7.5,"Chinese state-owned"),
    ("Hapag-Lloyd","HLCU","Germany","Hamburg","www.hapag-lloyd.com",1847,265,2000000,"THE Alliance",True,82.3,7.8,"German legacy carrier"),
    ("ONE","ONEY","Japan","Tokyo","www.one-line.com",2017,240,1800000,"THE Alliance",True,83.5,7.2,"K Line + MOL + NYK merger"),
    ("Evergreen","EGLV","Taiwan","Taipei","www.evergreen-marine.com",1968,210,1700000,"Ocean Alliance",True,77.1,8.0,"Taiwan container giant"),
    ("Yang Ming","YMLU","Taiwan","Keelung","www.yangming.com",1972,95,700000,"THE Alliance",True,79.4,8.3,"THE Alliance member"),
    ("PIL","PILS","Singapore","Singapore","www.pilship.com",1967,120,350000,"Independent",False,71.2,10.5,"SE Asia specialist"),
    ("ZIM","ZIMU","Israel","Haifa","www.zim.com",1945,85,400000,"Independent",True,81.0,8.6,"Reefer specialist"),
    ("HMM","HDMU","South Korea","Seoul","www.hmm21.com",1976,78,820000,"THE Alliance",True,84.2,7.0,"Hyundai Merchant Marine"),
    ("Wan Hai Lines","WHLC","Taiwan","Taipei","www.wanhai.com",1965,72,280000,"Independent",False,80.5,9.2,"Intra-Asia specialist"),
    ("KMTC","KMTC","South Korea","Seoul","www.kmtc.co.kr",1951,68,180000,"Independent",False,76.8,10.1,"Korea Marine Transport"),
    ("X-Press Feeders","XPFE","Malta","Valletta","www.x-pressfeeders.com",2002,110,220000,"Independent",False,74.3,11.2,"Feeder specialist"),
    ("Frontline","FROO","Bermuda","Hamilton","www.frontline.bm",1985,85,0,"Independent",False,0,0,"Tanker giant"),
    ("Grimaldi","GRIM","Italy","Naples","www.grimaldi.napoli.it",1947,120,95000,"Independent",False,73.5,11.8,"Ro-Ro and short sea"),
    ("Matson","MATU","US","Honolulu","www.matson.com",1882,22,45000,"Independent",False,88.0,15.0,"US Pacific trade"),
    ("Crowley","CROW","US","Jacksonville","www.crowley.com",1892,35,60000,"Independent",False,79.0,13.5,"US Americas specialist"),
    ("Euronav","EURV","Belgium","Antwerp","www.euronav.com",1995,48,0,"Independent",False,0,0,"VLCC tanker specialist"),
    ("Star Bulk","STBK","Marshall Is","Marshall Is","www.starbulk.com",1998,128,0,"Independent",False,0,0,"Dry bulk specialist"),
]

w("  // 1. CARRIERS (20)")
w("  console.log('Seeding 20 carriers...')")
w("  const carriersData = [")
for c in carriers_raw:
    name,code,country,hq,web,fy,fs,teu,ally,top20,rel,co2,rem = c
    w(f"    {{name:{json.dumps(name)},code:{json.dumps(code)},country:{json.dumps(country)},headquarters:{json.dumps(hq)},website:{json.dumps(web)},foundedYear:{fy},fleetSize:{fs},totalTEUCapacity:{teu},alliance:{json.dumps(ally)},isTop20:{str(top20).lower()},isFCL:true,isLCL:true,isBreakBulk:true,isReefer:true,isDG:true,transitTimeDays:28,reliability:{rel},co2PerTeu:{co2},contactEmail:{json.dumps(f'info@{code.lower()}.com')},contactPhone:'+1 555 0000',remarks:{json.dumps(rem)}}},")
w("  ]")
w("  const carriers = []")
w("  for (const c of carriersData) carriers.push(await db.carrier.create({ data: c }))")
w(f"  console.log('  Created {len(carriers_raw)} carriers')")
w("  const carrierMap = new Map(carriers.map((c: any) => [c.code, c.id]))")
w("")

# 2. TRADE ROUTES (15)
routes_raw = [
    ("Asia-Europe (Suez)","AE1","East Asia","North Europe","CNSHA,CNYTN,CNNGB,HKGKG","NLRTM,DEHAM,BEANR,GBFXT",10500,30,1200,"Container",45,"Suez","Low",55),
    ("Asia-N.Am West Coast","TP6","East Asia","North America WC","CNSHA,CNYTN,HKGKG,JPTYO","USLAX,USOAK,USSEA",6000,14,2800,"Container",38,"None","Low",62),
    ("Asia-N.Am East Coast","TP7","East Asia","North America EC","CNSHA,CNYTN,SGSIN","USNYC,USsav",12000,28,3500,"Container",18,"Panama","Low",58),
    ("Trans-Atlantic W/B","TAW","North Europe","North America EC","NLRTM,DEHAM,GBFXT","USNYC,USMSY",3500,10,1800,"Container",15,"None","Low",40),
    ("Trans-Atlantic E/B","TAE","North America EC","North Europe","USNYC,USMSY","NLRTM,DEHAM,GBFXT",3500,10,1100,"Container",15,"None","Low",38),
    ("Intra-Asia","IAX","East/Southeast Asia","East/Southeast Asia","CNSHA,HKGKG,SGSIN,JPTYO","SGSIN,MYTPP,VNSGN,THLCH",1800,5,350,"Container,Ro-Ro",85,"None","Low",45),
    ("Asia-Middle East","AME","East Asia","Middle East","CNSHA,CNYTN,JPTYO","AEJEA,SAJED,KWKWT",5500,14,600,"Container,Tanker",20,"None","Medium",35),
    ("Asia-Africa","AAF","East Asia","Africa","CNSHA,HKGKG,SGSIN","ZADUR,NGTIN,KEMLS",7000,18,1500,"Container,Bulk",8,"Suez","High",50),
    ("Europe-South America","ESS","North Europe","South America EC","NLRTM,DEHAM,GBFXT","BRSSZ,ARBAI,UYMVD",5500,16,2200,"Container",5,"None","Low",30),
    ("Europe-Africa","EAF","North Europe","West Africa","NLRTM,DEHAM,GBFXT","NGTIN,GHLBP,SNDKR",3000,10,1900,"Container,Ro-Ro",6,"None","Low",32),
    ("Intra-Europe/Med","IEM","North Europe","Mediterranean","NLRTM,DEHAM,GBFXT","ITGOA,GRTPI,ESVLC,PTRNS",2000,5,400,"Container,Ro-Ro",55,"None","Low",42),
    ("Trans-Pacific (JP-US)","TPC","Japan","North America WC","JPTYO,JPYOK,JPNGO","USLAX,USOAK,USSEA",4500,11,2500,"Container,Ro-Ro",25,"None","Low",48),
    ("Oceania-Asia","OAX","Australia/NZ","East Asia","AUSYD,AUMEL,NZAKL","CNSHA,HKGKG,SGSIN",4500,12,900,"Container,Bulk",10,"None","Low",25),
    ("Caribbean-Americas","CAR","North America","Caribbean/Central Am","USMIA,USJAX","PASXJ,JMKIN,DOHAI",1200,4,1800,"Container,Ro-Ro",22,"Panama","Low",28),
    ("Middle East-Americas","MEA","Middle East","North America","SAJED,AEJEA,KWKWT","USLAX,USHOU",8500,22,550,"Container,Tanker",12,"Suez","Low",33),
]

w("  // 2. TRADE ROUTES (15)")
w("  console.log('Seeding 15 trade routes...')")
w("  const tradeRoutesData = [")
for r in routes_raw:
    nm,cd,oR,dR,oP,dP,dist,days,fr,vt,wf,can,pir,cx = r
    w(f"    {{name:{json.dumps(nm)},code:{json.dumps(cd)},originRegion:{json.dumps(oR)},destRegion:{json.dumps(dR)},originPorts:{json.dumps(oP)},destPorts:{json.dumps(dP)},distanceNm:{dist},avgTransitDays:{days},avgFreightPerTEU:{fr},vesselTypes:{json.dumps(vt)},weeklyFrequency:{wf},canalTransit:{json.dumps(can)},piracyRisk:{json.dumps(pir)},congestionIndex:{cx}}},")
w("  ]")
w("  const tradeRoutes = []")
w("  for (const r of tradeRoutesData) tradeRoutes.push(await db.tradeRoute.create({ data: r }))")
w(f"  console.log('  Created {len(routes_raw)} routes')")
w("")

# 3. CARGO TYPES (30)
cargo_raw = [
    ("8471","84","Computers & Electronics","Desktops, laptops, servers","Containerized",False,False,"Manufactured",45000000,8500),
    ("8542","85","Semiconductors","Integrated circuits, wafers","Containerized",False,True,"Manufactured",18000000,420000),
    ("8703","87","Motor Vehicles","Passenger cars, SUVs","Break Bulk",False,False,"Manufactured",65000000,3200),
    ("6108","61","Textiles & Garments","Cotton shirts, knitwear","Containerized",False,False,"Manufactured",32000000,12),
    ("1006","10","Rice","Milled, semi-milled rice","Bulk Dry",False,False,"Agriculture",48000000,450),
    ("2709","27","Crude Petroleum","Crude oil blends","Bulk Liquid",True,False,"Energy",2800000000,520),
    ("2711","27","LNG & LPG","Liquefied natural gas","Bulk Liquid",True,False,"Energy",380000000,480),
    ("2601","26","Iron Ore","Hematite, magnetite","Bulk Dry",False,False,"Minerals",2500000000,95),
    ("2804","28","Coal (Bituminous)","Thermal and coking coal","Bulk Dry",False,False,"Energy",1200000000,110),
    ("3105","31","Fertilizers","NPK, urea, potash","Bulk Dry",False,False,"Agriculture",180000000,320),
    ("7207","72","Steel Products","Hot-rolled coils, billets","Break Bulk",False,False,"Manufactured",95000000,650),
    ("0203","02","Frozen Meat","Beef, pork, poultry","Reefer",False,False,"Agriculture",22000000,3500),
    ("0304","03","Frozen Fish","Fillets, whole frozen fish","Reefer",False,False,"Agriculture",28000000,2800),
    ("0405","04","Dairy Products","Butter, cheese, milk powder","Reefer",False,False,"Agriculture",15000000,2200),
    ("2204","22","Wine","Still wine bulk/bottles","Containerized",False,False,"Agriculture",12000000,1800),
    ("3004","30","Pharmaceuticals","Medicaments packed form","Containerized",False,True,"Manufactured",8000000,28000),
    ("3304","33","Cosmetics","Beauty products, skincare","Containerized",False,False,"Manufactured",9500000,1500),
    ("9403","94","Furniture","Wooden, metal furniture","Containerized",False,False,"Manufactured",35000000,250),
    ("9503","95","Toys & Games","Plastic toys, games","Containerized",False,False,"Manufactured",18000000,35),
    ("4407","44","Timber & Wood","Sawn wood, plywood","Break Bulk",False,False,"Agriculture",45000000,380),
    ("0901","09","Coffee","Green/roasted coffee beans","Bulk Dry",False,True,"Agriculture",10000000,4200),
    ("4001","40","Natural Rubber","Latex, RSS, TSR rubber","Bulk Dry",False,False,"Agriculture",14000000,1500),
    ("1511","15","Palm Oil","Crude/refined palm oil","Bulk Liquid",False,False,"Agriculture",75000000,950),
    ("8411","84","Turbojets","Aircraft engines","Break Bulk",False,False,"Manufactured",500000,850000),
    ("8429","84","Heavy Machinery","Excavators, loaders","Break Bulk",False,False,"Manufactured",12000000,45000),
    ("8481","84","Industrial Valves","Valves, pipe fittings","Containerized",False,False,"Manufactured",6000000,1200),
    ("2523","25","Cement & Clinker","Portland cement","Bulk Dry",False,False,"Minerals",420000000,85),
    ("2517","25","Construction Aggregates","Sand, gravel, stone","Bulk Dry",False,False,"Minerals",180000000,25),
    ("8708","87","Auto Parts","OEM and aftermarket","Containerized",False,False,"Manufactured",15000000,800),
    ("5201","52","Raw Cotton","Cotton not carded","Bulk Dry",False,True,"Agriculture",9500000,2100),
    ("7601","76","Aluminium Ingots","Unwrought aluminium","Break Bulk",False,False,"Minerals",32000000,2400),
]

w("  // 3. CARGO TYPES (30)")
w("  console.log('Seeding 30 cargo types...')")
w("  const cargoTypesData = [")
for c in cargo_raw:
    hs,hsc,name,desc,cat,dg,hum,grp,vol,val = c
    w(f"    {{hsCode:{json.dumps(hs)},hsChapter:{json.dumps(hsc)},name:{json.dumps(name)},description:{json.dumps(desc)},category:{json.dumps(cat)},dangerous:{str(dg).lower()},humidityControl:{str(hum).lower()},stackingAllowed:true,commodityGroup:{json.dumps(grp)},tradeVolume:{vol},unitValue:{val}}},")
w("  ]")
w("  await db.cargoType.createMany({ data: cargoTypesData })")
w(f"  console.log('  Created {len(cargo_raw)} cargo types')")
w("")

# 4. PORTS (50) - compact but complete
ports_raw = [
    ("Shanghai","CN","East Asia",31.2304,121.4737,"CNSHA","Very Large",16.5,"Container, Bulk, Liquid","Asia/Shanghai",24870000,47000000,750000000,400000,620,850,"Medium",18,48,"SIPG"),
    ("Singapore","SG","Southeast Asia",1.3521,103.8198,"SGSIN","Very Large",22.0,"Container, Bunkering","Asia/Singapore",5850000,39500000,620000000,350000,210,310,"Low",8,24,"PSA International"),
    ("Shenzhen","CN","East Asia",22.5431,114.0579,"CNSZX","Very Large",18.0,"Container, Bulk, Ro-Ro","Asia/Shanghai",17560000,32500000,520000000,220000,240,380,"Medium",14,36,"Shenzhen Port Group"),
    ("Ningbo-Zhoushan","CN","East Asia",29.8683,121.544,"CNNGB","Very Large",17.5,"Container, Bulk, Liquid","Asia/Shanghai",8900000,35300000,1100000000,400000,350,520,"Low",10,42,"Ningbo Port Group"),
    ("Busan","KR","East Asia",35.1796,129.0756,"KRPUS","Very Large",16.0,"Container, Bulk, Ro-Ro","Asia/Seoul",3400000,23500000,380000000,200000,185,290,"Low",8,28,"Busan Port Authority"),
    ("Qingdao","CN","East Asia",36.0671,120.3826,"CNTAO","Very Large",15.5,"Container, Bulk, Liquid","Asia/Shanghai",9500000,26500000,620000000,300000,180,260,"Low",10,32,"Qingdao Port Group"),
    ("Guangzhou","CN","East Asia",23.1291,113.2644,"CNGZG","Very Large",15.0,"Container, Bulk, Ro-Ro","Asia/Shanghai",18680000,24200000,450000000,180000,260,320,"Medium",16,34,"Guangzhou Port Group"),
    ("Tianjin","CN","East Asia",38.9836,117.7447,"CNTJN","Very Large",18.0,"Container, Bulk, Liquid","Asia/Shanghai",13700000,21000000,580000000,300000,175,240,"Medium",12,38,"Tianjin Port Group"),
    ("Rotterdam","NL","North Europe",51.9244,4.4777,"NLRTM","Very Large",24.0,"Container, Bulk, Liquid, Ro-Ro","Europe/Amsterdam",650000,14500000,470000000,400000,165,220,"Low",6,22,"Port of Rotterdam"),
    ("Hamburg","DE","North Europe",53.5511,9.9937,"DEHAM","Very Large",16.5,"Container, Bulk, Ro-Ro","Europe/Berlin",1850000,8700000,140000000,200000,130,185,"Low",8,24,"HHLA"),
    ("Antwerp-Bruges","BE","North Europe",51.2194,4.4025,"BEANR","Very Large",17.0,"Container, Bulk, Liquid","Europe/Brussels",520000,13800000,250000000,250000,105,165,"Low",7,20,"Port of Antwerp-Bruges"),
    ("Jebel Ali (Dubai)","AE","Middle East",25.0196,55.0816,"AEJEA","Very Large",17.0,"Container, Bulk, Liquid","Asia/Dubai",3500000,14500000,320000000,250000,115,170,"Low",6,22,"DP World"),
    ("Los Angeles","US","North America",33.9425,-118.408,"USLAX","Very Large",16.0,"Container, Break Bulk, Ro-Ro","America/Los_Angeles",3900000,9630000,180000000,220000,95,140,"High",48,36,"City of Los Angeles"),
    ("Long Beach","US","North America",33.7833,-118.1896,"USLGB","Very Large",16.5,"Container, Break Bulk","America/Los_Angeles",470000,9400000,160000000,220000,80,125,"High",42,30,"City of Long Beach"),
    ("New York/New Jersey","US","North America",40.6892,-74.0445,"USNYC","Very Large",15.5,"Container, Break Bulk, Ro-Ro","America/New_York",8300000,8300000,150000000,180000,85,110,"Medium",18,28,"PANYNJ"),
    ("Savannah","US","North America",32.0835,-81.0998,"USSAV","Large",14.5,"Container, Break Bulk, Ro-Ro","America/New_York",150000,5600000,85000000,140000,48,78,"Medium",14,22,"Georgia Ports Authority"),
    ("Tokyo","JP","East Asia",35.6762,139.6503,"JPTYO","Very Large",15.0,"Container, Bulk, Ro-Ro","Asia/Tokyo",13960000,5200000,95000000,120000,120,175,"Low",6,18,"Port of Tokyo"),
    ("Yokohama","JP","East Asia",35.4437,139.638,"JPYOK","Very Large",16.0,"Container, Bulk, Ro-Ro","Asia/Tokyo",3760000,2800000,62000000,140000,85,120,"Low",5,16,"Yokohama Port Authority"),
    ("Kaohsiung","TW","East Asia",22.6273,120.3014,"TWKHH","Very Large",16.0,"Container, Bulk","Asia/Taipei",2770000,9600000,160000000,220000,110,155,"Low",7,20,"Kaohsiung Harbor Bureau"),
    ("Port Klang","MY","Southeast Asia",3.0,101.4,"MYPKG","Very Large",16.5,"Container, Bulk, Liquid","Asia/Kuala_Lumpur",1700000,13200000,280000000,250000,95,145,"Low",6,18,"Port Klang Authority"),
    ("Tanjung Pelepas","MY","Southeast Asia",1.358,103.545,"MYTPP","Very Large",18.0,"Container","Asia/Kuala_Lumpur",800000,9500000,180000000,250000,65,100,"Low",5,16,"PTP"),
    ("Jakarta","ID","Southeast Asia",-6.1,106.85,"IDJKT","Very Large",14.0,"Container, Bulk, Liquid","Asia/Jakarta",10560000,7800000,350000000,150000,75,95,"High",36,42,"Pelindo II"),
    ("Mumbai (JNPT)","IN","South Asia",18.95,72.84,"INNSA","Very Large",14.5,"Container, Bulk, Liquid","Asia/Kolkata",20670000,6300000,180000000,150000,55,82,"High",48,52,"JNPT Authority"),
    ("Colombo","LK","South Asia",6.9271,79.8612,"LKCMB","Very Large",20.0,"Container, Bulk, Bunkering","Asia/Colombo",750000,7200000,150000000,240000,52,78,"Low",5,16,"SLPA"),
    ("Lagos (Tin Can)","NG","West Africa",6.44,3.39,"NGTIN","Large",13.5,"Container, Bulk, Liquid","Africa/Lagos",15000000,1200000,45000000,80000,28,32,"Critical",96,72,"Nigerian Ports Authority"),
    ("Durban","ZA","Southern Africa",-29.8579,31.0218,"ZADUR","Very Large",15.0,"Container, Bulk, Ro-Ro","Africa/Johannesburg",3600000,2900000,95000000,200000,58,65,"Medium",24,38,"Transnet"),
    ("Tanger Med","MA","North Africa",35.7873,-5.7833,"MATNG","Very Large",18.0,"Container, Ro-Ro","Africa/Casablanca",450000,5600000,85000000,250000,42,68,"Low",4,12,"Tanger Med SA"),
    ("Mombasa","KE","East Africa",-4.0435,39.6682,"KEMSA","Large",15.0,"Container, Bulk, Liquid","Africa/Nairobi",1200000,1400000,32000000,100000,22,18,"Medium",18,28,"Kenya Ports Authority"),
    ("Jeddah","SA","Middle East",21.4858,39.1925,"SAJED","Very Large",16.0,"Container, Bulk, Liquid","Asia/Riyadh",4700000,5100000,120000000,200000,62,85,"Medium",12,24,"Saudi Ports Authority"),
    ("Santos","BR","South America",-23.9608,-46.3336,"BRSSZ","Very Large",15.0,"Container, Bulk, Liquid","America/Sao_Paulo",430000,2300000,180000000,200000,65,48,"Medium",14,32,"Codesp"),
    ("Sydney","AU","Oceania",-33.8688,151.2093,"AUSYD","Large",13.5,"Container, Bulk, Ro-Ro","Australia/Sydney",5300000,2800000,65000000,120000,45,55,"Low",6,18,"NSW Ports"),
    ("Melbourne","AU","Oceania",-37.8136,144.9631,"AUMEL","Large",14.5,"Container, Bulk, Ro-Ro","Australia/Melbourne",5100000,3100000,72000000,140000,38,50,"Low",5,16,"Port of Melbourne"),
    ("Auckland","NZ","Oceania",-36.8485,174.7633,"NZAKL","Medium",12.5,"Container, Bulk, Ro-Ro","Pacific/Auckland",1700000,1100000,22000000,80000,22,28,"Low",4,14,"Ports of Auckland"),
    ("Felixstowe","GB","North Europe",51.9486,1.3453,"GBFXT","Large",16.0,"Container","Europe/London",24000,3500000,58000000,220000,38,52,"Medium",8,20,"Hutchison Ports"),
    ("Le Havre","FR","North Europe",49.4944,0.1079,"FRLEH","Very Large",16.0,"Container, Bulk, Ro-Ro","Europe/Paris",170000,2500000,65000000,220000,42,58,"Low",6,18,"GPMH"),
    ("Algeciras","ES","Southern Europe",36.1379,-5.4535,"ESALG","Very Large",18.0,"Container, Bunkering, Ro-Ro","Europe/Madrid",120000,5200000,110000000,250000,35,62,"Low",4,14,"APBA"),
    ("Piraeus","GR","Southern Europe",37.9379,23.6471,"GRPIR","Very Large",17.5,"Container, Ro-Ro","Europe/Athens",660000,4700000,85000000,240000,28,42,"Low",5,14,"OLP/COSCO"),
    ("Ho Chi Minh City","VN","Southeast Asia",10.8231,106.6297,"VNSGN","Large",14.0,"Container, Bulk","Asia/Ho_Chi_Minh",8900000,8400000,160000000,120000,55,72,"High",24,30,"VPA"),
    ("Buenos Aires","AR","South America",-34.6037,-58.3816,"ARBUE","Large",12.0,"Container, Bulk, Grain","America/Buenos_Aires",3100000,1100000,55000000,80000,42,28,"Medium",16,34,"AGP"),
    ("Dammam","SA","Middle East",26.3927,49.9777,"SADMM","Large",14.5,"Container, Bulk, Liquid","Asia/Riyadh",1250000,1800000,65000000,150000,38,42,"Low",6,18,"Mawani"),
    ("Brisbane","AU","Oceania",-27.4698,153.0251,"AUBNE","Large",15.0,"Container, Bulk, Liquid","Australia/Brisbane",2600000,1400000,42000000,120000,30,38,"Low",5,16,"Brisbane Ports"),
    ("Kuwait (Shuwaikh)","KW","Middle East",29.3375,47.9606,"KWKWT","Large",12.5,"Container, Bulk, Liquid","Asia/Kuwait_City",4300000,1200000,45000000,120000,22,25,"Low",8,20,"KPA"),
    ("Callao","PE","South America",-12.0432,-77.0282,"PECLL","Large",14.0,"Container, Bulk, Liquid","America/Lima",10500000,2200000,55000000,120000,28,32,"Medium",12,24,"APN"),
    ("Cartagena","CO","South America",10.391,-75.5364,"COCTG","Large",14.5,"Container, Bulk, Liquid","America/Bogota",1100000,1800000,48000000,130000,25,30,"Low",6,18,"SPRC"),
    ("Constanta","RO","Eastern Europe",44.1807,28.6343,"ROCND","Large",18.0,"Container, Bulk, Liquid","Europe/Bucharest",310000,1200000,65000000,180000,28,22,"Low",8,22,"CN APM"),
    ("Gdansk","PL","Northern Europe",54.352,18.6464,"PLGDN","Large",16.5,"Container, Bulk, Ro-Ro","Europe/Warsaw",470000,2100000,55000000,220000,32,35,"Low",5,16,"ZMPG"),
    ("Montreal","CA","North America",45.5017,-73.5673,"CAMTR","Large",14.5,"Container, Bulk, Grain","America/Montreal",1800000,1600000,42000000,80000,35,28,"Low",8,20,"MPA"),
    ("Chittagong","BD","South Asia",22.3353,91.8344,"BDCGP","Large",11.0,"Container, Bulk, Grain","Asia/Dhaka",5200000,3200000,85000000,60000,22,15,"High",36,48,"CPA"),
    ("Abidjan","CI","West Africa",5.3167,-4.0167,"CIABJ","Large",13.0,"Container, Bulk, Liquid","Africa/Abidjan",5100000,900000,28000000,70000,18,15,"Medium",18,28,"PAbidjan"),
    ("Amsterdam","NL","North Europe",52.3676,4.9041,"NLAMS","Medium",15.0,"Container, Bulk, Liquid","Europe/Amsterdam",870000,800000,55000000,120000,22,25,"Low",4,14,"Port of Amsterdam"),
]

w("  // 4. PORTS (50)")
w("  console.log('Seeding 50 ports...')")
w("  const portsData = [")
for p in ports_raw:
    nm,cc,rg,lat,lon,ul,hs,dp,ct,tz,pop,teu,dwt,mvd,bc,cr,cl,aw,ah,ow = p
    w(f"    {{name:{json.dumps(nm)},countryCode:{json.dumps(cc)},region:{json.dumps(rg)},latitude:{lat},longitude:{lon},unlocode:{json.dumps(ul)},harborSize:{json.dumps(hs)},depth:{dp},cargoTypes:{json.dumps(ct)},timezone:{json.dumps(tz)},population:{pop},annualTEU:{teu},annualDWT:{dwt},maxVesselDWT:{mvd},berthCount:{bc},craneCount:{cr},congestionLevel:{json.dumps(cl)},avgWaitHours:{aw},avgStayHours:{ah},owner:{json.dumps(ow)},pilotage:'Compulsory',tugsAvailable:{random.randint(4,30)},bunkering:true,freshWater:true,medicalFacility:true,repairFacility:{str(random.random()>0.3).lower()},warehouseSpace:{random.randint(50000,500000)},coldStorage:{str(random.random()>0.4).lower()},hazardousHandling:'Full IMDG'}},")
w("  ]")
w("  const ports = []")
w("  for (const p of portsData) ports.push(await db.port.create({ data: p }))")
w(f"  console.log('  Created {len(ports_raw)} ports')")
w("  const portMap = new Map(ports.map((p: any) => [p.unlocode, p.id]))")
w("")

# 5. VESSELS (80) - generate programmatically
w("  // 5. VESSELS (80)")
w("  console.log('Seeding 80 vessels...')")
w("  const vesselsData: any[] = []")

prefixes = ["Pacific","Atlantic","Indian","Southern","Northern","Eastern","Western","Global","Ocean","Sea","Star","Fortune","Glory","Horizon","Meridian","Pioneer","Venture","Endeavour","Discovery","Explorer","Crown","Victory","Triumph","Spirit","Cyclone","Thunder","Eagle","Falcon","Hawk","Phoenix","Dragon","Lion","Tiger","Swan","Jade","Amber","Onyx","Titan","Atlas","Orion","Neptune","Poseidon","Atlas"]
suffixes = ["Fortune","Star","Pioneer","Venture","Horizon","Glory","Meridian","Endeavour","Discovery","Explorer","King","Queen","Prince","Princess","Champion","Victory","Triumph","Spirit","Cyclone","Hurricane","Tornado","Eagle","Falcon","Hawk"]
class_socs = ["DNV GL","Lloyd's Register","Bureau Veritas","ClassNK","ABS","RINA","Korean Register","CCS"]
pandi = ["Britannia P&I","North of England P&I","Standard P&I","Skuld P&I","Gard P&I","Steamship Mutual","Sweden P&I","London P&I"]
flags = ["Panama","Liberia","Marshall Islands","Hong Kong","Singapore","Greece","China","Norway","Bahamas","Malta","United Kingdom","Cyprus","Isle of Man"]
statuses = ["Active","Active","Active","Active","Active","In Port","In Port","At Anchor","Underway","Underway","Moored"]

used_mmsi = set()
used_imo = set()

for i in range(80):
    if i < 35: vtype = "Container Ship"
    elif i < 50: vtype = "Bulk Carrier"
    elif i < 62: vtype = "Tanker"
    elif i < 70: vtype = "LNG Carrier"
    elif i < 77: vtype = "Ro-Ro"
    else: vtype = "General Cargo"

    # Dimensions
    if vtype == "Container Ship":
        teu = random.choice([500,800,1200,1800,2500,3600,4800,6500,8500,10000,13000,15000,20000,24000])
        gt = round(teu * random.uniform(10,14))
        dwt = round(teu * random.uniform(12,18))
        length = round(max(120, teu * random.uniform(0.015, 0.025)),1)
        breadth = round(max(20, length * random.uniform(0.1, 0.14)),1)
        draft = round(max(8, length * random.uniform(0.03, 0.05)),1)
        vc = "ULCS" if teu>18000 else "Post-Panamax" if teu>5000 else "Panamax" if teu>3000 else "Sub-Panamax" if teu>1500 else "Feeder"
        ms = round(random.uniform(18, 25),1)
        ep = round(random.uniform(40000, 80000))
        fc = round(random.uniform(2000, 12000))
        ft = random.choice(["VLSFO","VLSFO","LNG Dual-Fuel","MGO"])
        rp = int(teu * random.uniform(0.05, 0.1))
        cc = random.choice([6,7,8,9,10])
        cr = random.choice([0,0,0,2,3])
    elif vtype == "Bulk Carrier":
        dwt = random.choice([18000,28000,35000,45000,58000,72000,82000,95000,180000])
        gt = round(dwt * random.uniform(0.5, 0.6))
        length = round(dwt * random.uniform(0.0015, 0.0035),1)
        breadth = round(max(20, length * random.uniform(0.12, 0.16)),1)
        draft = round(max(9, length * random.uniform(0.04, 0.065)),1)
        vc = "Capesize" if dwt>100000 else "Panamax" if dwt>65000 else "Supramax" if dwt>50000 else "Handymax" if dwt>35000 else "Handysize"
        ms = round(random.uniform(12, 16),1); ep = round(random.uniform(5000, 12000)); fc = round(random.uniform(1500, 4000)); ft = "VLSFO"
        teu = 0; rp = 0; cc = random.choice([5,6,7,9]); cr = random.choice([4,4,0])
    elif vtype == "Tanker":
        dwt = random.choice([30000,50000,75000,100000,150000,250000,300000])
        gt = round(dwt * random.uniform(0.5, 0.6))
        length = round(dwt * random.uniform(0.0012, 0.003),1)
        breadth = round(max(22, length * random.uniform(0.12, 0.17)),1)
        draft = round(max(10, length * random.uniform(0.04, 0.065)),1)
        vc = "VLCC" if dwt>200000 else "Suezmax" if dwt>120000 else "Aframax" if dwt>80000 else "Panamax"
        ms = round(random.uniform(12, 17),1); ep = round(random.uniform(6000, 20000)); fc = round(random.uniform(2000, 6000)); ft = random.choice(["VLSFO","LNG Dual-Fuel"])
        teu = 0; rp = 0; cc = random.choice([8,10,12,15]); cr = 0
    elif vtype == "LNG Carrier":
        dwt = random.choice([50000,65000,80000,95000,100000])
        gt = round(dwt * random.uniform(0.9, 1.1))
        length = round(random.uniform(270, 320),1); breadth = round(random.uniform(42, 52),1); draft = round(random.uniform(11, 13),1)
        vc = random.choice(["Moss Type LNG","Membrane LNG"]); ms = round(random.uniform(17, 21),1); ep = round(random.uniform(25000, 45000)); fc = round(random.uniform(80000, 180000)); ft = "LNG"
        teu = 0; rp = 0; cc = random.choice([4,5,6]); cr = 0
    elif vtype == "Ro-Ro":
        dwt = random.choice([12000,18000,25000,35000,55000])
        gt = round(dwt * random.uniform(1.5, 2.5))
        length = round(random.uniform(150, 230),1); breadth = round(random.uniform(24, 34),1); draft = round(random.uniform(8, 11),1)
        vc = random.choice(["PCTC","ConRo"]); ms = round(random.uniform(16, 22),1); ep = round(random.uniform(8000, 20000)); fc = round(random.uniform(1500, 4000)); ft = "VLSFO"
        teu = 0; rp = 0; cc = random.choice([8,10,12]); cr = 0
    else:
        dwt = random.choice([5000,8000,12000,18000,28000])
        gt = round(dwt * random.uniform(0.7, 1.0)); teu = random.choice([0,0,0,50,100,200])
        length = round(random.uniform(90, 170),1); breadth = round(random.uniform(14, 25),1); draft = round(random.uniform(6, 10),1)
        vc = random.choice(["MPP","General Cargo"]); ms = round(random.uniform(12, 18),1); ep = round(random.uniform(2000, 8000)); fc = round(random.uniform(400, 2000)); ft = "VLSFO"
        rp = 0; cc = random.choice([3,4,5]); cr = random.choice([2,3,4])

    while True:
        mid = random.randint(200000000, 779999999)
        if mid not in used_mmsi: break
    used_mmsi.add(mid)
    while True:
        imo_val = random.randint(1000000, 9999999)
        if imo_val not in used_imo: break
    used_imo.add(imo_val)

    status = random.choice(statuses)
    yr = random.randint(1995, 2024)
    name = f"MV {random.choice(prefixes)} {random.choice(suffixes)}"
    cs = ''.join(random.choices("ABCDEFGHIJKLMNOPQRSTUVWXYZ", k=2)) + str(random.randint(1000,9999))
    flag = random.choice(flags)
    speed = round(random.uniform(0.5, ms*0.85),1) if status in ["Active","Underway"] else 0
    heading = random.randint(0, 359) if speed > 0 else 0
    dest_val = random.choice([p[5] for p in ports_raw]) if speed > 0 else None
    eta_days = random.randint(1,15) if speed > 0 else None

    carrier_code = carriers_raw[i % len(carriers_raw)][1]

    w(f"    vesselsData.push({{")
    w(f"      mmsi:{mid},imo:{imo_val},name:{json.dumps(name)},callSign:{json.dumps(cs)},vesselType:{json.dumps(vtype)},flagCountry:{json.dumps(flag)},")
    w(f"      grossTonnage:{gt},deadweight:{dwt},length:{length},breadth:{breadth},draft:{draft},yearBuilt:{yr},status:{json.dumps(status)},")
    w(f"      latitude:{round(random.uniform(-60,65),4)},longitude:{round(random.uniform(-180,180),4)},speed:{speed},heading:{heading},destination:{json.dumps(dest_val) if dest_val else 'null'},")
    w(f"      eta:{f'new Date(Date.now() + {eta_days} * 86400000)' if eta_days else 'null'},")
    w(f"      classificationSociety:{json.dumps(random.choice(class_socs))},vesselClass:{json.dumps(vc)},iceClass:{json.dumps(random.choice(['None','None','ICE-1A','ICE-1B']))},")
    w(f"      engineType:{json.dumps(random.choice(['Diesel','Diesel','LNG Dual-Fuel','Steam Turbine']))},enginePower:{ep},maxSpeed:{ms},fuelCapacity:{fc},fuelType:{json.dumps(ft)},")
    w(f"      teuCapacity:{teu if teu>0 else 'null'},reeferPoints:{rp if rp>0 else 'null'},cargoHoldCount:{cc},craneCount:{cr},")
    w(f"      doubleHull:true,bulbousBow:true,crewCapacity:{random.randint(15,35)},")
    w(f"      shipManager:{json.dumps(random.choice(['V Ships','Bernhard Schulte','Wallem','Synergy Marine','Anglo-Eastern','Fleet Management']) + ' ' + random.choice(['HK','Singapore','Monaco','Athens','Cyprus','London','Manila','Hamburg']))},")
    w(f"      registeredOwner:{json.dumps(name.split(' ',1)[-1] + ' Maritime Ltd')},beneficialOwner:{json.dumps(random.choice(['Global Maritime Holdings','Pacific Shipping Corp','Atlantic Ventures Inc','Ocean Trade SA','Continental Cargo GmbH']))},")
    w(f"      insurancePandI:{json.dumps(random.choice(pandi))},imoCertExpiry:new Date('{random.randint(2026,2031)}-{random.randint(1,12):02d}-{random.randint(1,28):02d}'),")
    w(f"      solasCompliant:true,marpolCompliant:true,ballastWater:{json.dumps(random.choice(['BWMS Treatment','BWMS Treatment','Ballast Exchange']))},")
    w(f"      emissionRating:{json.dumps(random.choice(['A','B','C','C','D']))},totalVoyages:{random.randint(50,500)},totalDistanceNm:{random.randint(200000,1500000)},")
    w(f"      ownerCountry:{json.dumps(flag)},carrierId:carrierMap.get({json.dumps(carrier_code)})!")
    w(f"    }})")

w("  const vessels = []")
w("  for (const v of vesselsData) vessels.push(await db.vessel.create({ data: v }))")
w("  console.log('  Created 80 vessels')")
w("")

print(f"Phase 1-5 complete: {len(carriers_raw)} carriers, {len(routes_raw)} routes, {len(cargo_raw)} cargo types, {len(ports_raw)} ports, 80 vessels")

# Save part 1
with open(OUT, 'w') as f:
    f.write('\n'.join(lines) + '\n')
print(f"Written {len(lines)} lines to {OUT}")
