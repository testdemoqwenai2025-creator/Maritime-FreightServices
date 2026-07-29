#!/usr/bin/env python3
"""Generate seed script part 2: shipments, containers, documents, events, etc."""
import json, random, os

random.seed(123)
OUT = "/home/z/my-project/scripts/seed-maritime.ts"

lines = []
def w(s=""):
    lines.append(s)

shippers = ["Hanjin Logistics","Mitsui & Co","Sumitomo Corp","Toyota Tsusho","Itochu","Marubeni","Cargill","Bunge","ADM","Louis Dreyfus","Trafigura","Glencore","Vitol","Gunvor","Mercuria","Wilmar","Olam","Noble Group","COSCO Logistics","SITC","Kintetsu","Yusen","DSV","Kuehne+Nagel","DB Schenker","DHL Global","Expeditors","C.H. Robinson","Flexport","SEKO"]
consignees = ["Walmart","Target","Costco","Home Depot","Amazon","Lowe's","IKEA","Carrefour","Tesco","Aldi","Lidl","Metro AG","AEON","7-Eleven","Sainsbury's","Unilever","P&G","Nestle","Coca-Cola","PepsiCo","Samsung","Sony","Panasonic","LG","Apple","Dell","HP","Lenovo","Cisco","Bosch","Siemens","ABB","Schneider Electric","Caterpillar","Komatsu","Volvo","John Deere","Ford","GM","Tesla","Toyota","Honda","Hyundai","BMW","Mercedes-Benz","VW","Nissan","BYD"]
cargo_cats = ["Electronics","Machinery","Vehicles","Textiles","Agricultural","Chemicals","Energy","Minerals","Manufactured","Pharmaceuticals","Cosmetics","Furniture","Toys","Seafood","Meat","Dairy","Wine","Rubber","Coffee","Timber","Steel","Cement"]
hs_codes = ["8471","8542","8703","6108","1006","2709","2711","2601","2804","3105","7207","0203","0304","0405","2204","3004","3304","9403","9503","4407","0901","4001","1511","8411","8429","8481","2523","2517","8708","5201","7601"]
incoterms = ["FOB","CIF","CFR","EXW","DDP","FCA","FAS","DAP","CPT","CIP"]
payment_terms = ["L/C","T/T","CAD","Net 30","Net 60","Net 90","Open Account","Advance Payment"]
freight_terms = ["Prepaid","Collect","Prepaid at Destination"]
service_levels = ["FCL","FCL","FCL","LCL","Break Bulk","Project Cargo"]
priorities = ["Standard","Standard","Standard","Express","Priority","Economy"]
customs_status = ["Pending","Pending","Cleared","Cleared","Cleared","Held","Rejected"]
container_types = ["20GP","40GP","40HC","20RF","40RF","20OT","40OT","20FR","40FR"]
container_owners = ["MAEU","MSCU","CMDU","COSU","HLCU","ONEY","EGLV","YMLU","ZIMU","TRITON","Textainer","Seaco","CAI","Beacon","Touax"]
seal_types = ["Bolt","Cable","Wire","High-Security"]
agents = ["Maersk Broker","Kerry Logistics","Sinotrans","CJ Logistics","Damco","CEVA Logistics","Geodis","Nippon Express","Kintetsu","Sankyu","Hankyu","Bollore","C.H. Robinson","C.H. Powell"]
forwarders = ["DSV","Kuehne+Nagel","DB Schenker","DHL","Expeditors","Flexport","SEKO","Crane Worldwide","BDP","SEKO","Crane"]
berths = ["B1","B2","B3","B4","B5","B6","B7","B8","B9","B10","B12","B15","B17","B20","B25","P1","P2","P3","P4","P5","T1","T2","T3","T4"]
pilots = ["Capt. Smith","Capt. Chen","Capt. Rossi","Capt. Müller","Capt. Yamamoto","Capt. Park","Capt. Singh","Capt. Hassan","Capt. Johnson","Capt. Costa","Capt. Petrov","Capt. Lee","Capt. Ahmed","Capt. Brown"]
trade_route_codes = ["AE1","TP6","TP7","TAW","TAE","IAX","AME","AAF","ESS","EAF","IEM","TPC","OAX","CAR","MEA"]

# 6. SHIPMENTS (80)
w("  // 6. SHIPMENTS (80)")
w("  console.log('Seeding 80 shipments...')")
w("  const shipmentsData: any[] = []")

port_unlocodes = ["CNSHA","SGSIN","CNSZX","CNNGB","KRPUS","CNTAO","CNGZG","CNTJN","NLRTM","DEHAM","BEANR","AEJEA","USLAX","USLGB","USNYC","USSAV","JPTYO","JPYOK","TWKHH","MYPKG","MYTPP","IDJKT","INNSA","LKCMB","NGTIN","ZADUR","MATNG","KEMSA","SAJED","BRSSZ","AUSYD","AUMEL","NZAKL","GBFXT","FRLEH","ESALG","GRPIR","VNSGN","ARBUE","SADMM","AUBNE","KWKWT","PECLL","COCTG","ROCND","PLGDN","CAMTR","BDCGP","CIABJ","NLAMS"]

for i in range(80):
    bl = f"{random.choice(['MAEU','MSCU','CMDU','COSU','HLCU','ONEY','EGLV','YMLU','ZIMU','HDMU'])}{random.randint(100000000,999999999)}"
    booking_ref = f"BR{random.randint(1000000,9999999)}"
    status = random.choice(["Booked","Customs Clearance","In Transit","In Transit","In Transit","Arrived","Arrived","Discharging","Delivered","Delivered","Cancelled"])
    cargo_cat = random.choice(cargo_cats)
    cargo_weight = random.randint(5000, 50000)
    cargo_value = round(random.uniform(50000, 5000000), 2)
    cargo_desc = f"{random.choice(['Premium','Grade A','Industrial','Standard','Custom'])} {cargo_cat.lower()}"
    hs_code = random.choice(hs_codes)
    vessel_idx = i % 80
    origin = random.choice(port_unlocodes)
    while True:
        dest = random.choice(port_unlocodes)
        if dest != origin: break
    days_ago = random.randint(1, 60)
    days_future = random.randint(5, 40)
    inc = random.choice(incoterms)
    pt = random.choice(payment_terms)
    ft = random.choice(freight_terms)
    sl = random.choice(service_levels)
    pri = random.choice(priorities)
    cs = random.choice(customs_status)
    cnc = random.choice([consignees[i % len(consignees)], consignees[(i+5) % len(consignees)]])
    shp = random.choice(shippers)
    fwd = random.choice(forwarders)
    agt = random.choice(agents)
    dg = random.random() < 0.15
    tc = random.random() < 0.2
    fc = round(random.uniform(2500, 45000), 2)
    cc = random.randint(1, 12)
    teu = cc * random.choice([1,2])
    feu = cc / 2
    vol = round(cc * random.uniform(28, 67), 1)
    trade_route = random.choice(trade_route_codes)
    carrier_idx = i % 20
    carrier_codes = ["MAEU","MSCU","CMDU","COSU","HLCU","ONEY","EGLV","YMLU","PILS","ZIMU","HDMU","WHLC","KMTC","XPFE","FROO","GRIM","MATU","CROW","EURV","STBK"]

    w(f"  shipmentsData.push({{")
    w(f"    billOfLading:{json.dumps(bl)},bookingRef:{json.dumps(booking_ref)},status:{json.dumps(status)},")
    w(f"    cargoType:{json.dumps(cargo_cat)},cargoWeight:{cargo_weight},cargoValue:{cargo_value},cargoDesc:{json.dumps(cargo_desc)},hsCode:{json.dumps(hs_code)},")
    w(f"    vesselId:vessels[{vessel_idx}].id,originPortId:portMap.get({json.dumps(origin)})!,destPortId:portMap.get({json.dumps(dest)})!,")
    w(f"    departureDate:new Date(Date.now() - {days_ago} * 86400000),arrivalDate:new Date(Date.now() + {days_future} * 86400000),")
    w(f"    etd:new Date(Date.now() - {days_ago} * 86400000),eta:new Date(Date.now() + {days_future} * 86400000),")
    w(f"    transitDays:{days_ago + days_future},freightCost:{fc},currency:'USD',")
    w(f"    shipper:{json.dumps(shp)},consignee:{json.dumps(cnc)},notifyParty:{json.dumps(cnc)},forwarder:{json.dumps(fwd)},agent:{json.dumps(agt)},")
    w(f"    incoterms:{json.dumps(inc)},paymentTerms:{json.dumps(pt)},freightTerms:{json.dumps(ft)},")
    w(f"    containerCount:{cc},totalTEU:{teu},totalFEU:{feu},weightUnit:'KG',volumeCbm:{vol},")
    w(f"    dangerousGoods:{str(dg).lower()},dgClass:{json.dumps('Class '+str(random.randint(1,9))) if dg else 'null'},unNumber:{json.dumps('UN'+str(random.randint(1000,3999))) if dg else 'null'},")
    w(f"    temperatureCtrl:{str(tc).lower()},tempMin:{random.randint(-25,2) if tc else 'null'},tempMax:{random.randint(5,25) if tc else 'null'},")
    w(f"    insurancePolicy:{json.dumps(f'INS-{random.randint(100000,999999)}')},insuranceValue:{round(cargo_value * 1.1, 2)},")
    w(f"    certificateNo:{json.dumps(f'CERT-{random.randint(10000,99999)}')},customsStatus:{json.dumps(cs)},customsRef:{json.dumps(f'CR-{random.randint(1000000,9999999)}')},")
    w(f"    clearedAt:new Date(Date.now() + {random.randint(-10,5)} * 86400000),inspectionRequired:{str(random.random()<0.4).lower()},")
    w(f"    demurrage:{round(random.uniform(0, 5000),2)},detention:{round(random.uniform(0, 3000),2)},storageCharges:{round(random.uniform(0, 1500),2)},")
    w(f"    priority:{json.dumps(pri)},serviceLevel:{json.dumps(sl)},")
    w(f"    carrierId:carriers[{carrier_idx}].id,tradeRouteId:tradeRoutes[{i % 15}].id")
    w(f"  }})")

w("  const shipments = []")
w("  for (const s of shipmentsData) shipments.push(await db.shipment.create({ data: s }))")
w("  console.log('  Created 80 shipments')")
w("")

# 7. CONTAINERS (400+)
w("  // 7. CONTAINERS (400+)")
w("  console.log('Seeding 400+ containers...')")
w("  const containersData: any[] = []")
w("  let containerCounter = 1")

for i in range(420):
    owner = random.choice(container_owners)
    container_no = f"{owner}U{random.randint(1000000,9999999)}"
    iso_type = random.choice(container_types)
    size = iso_type[:2] + "FT"
    status = random.choice(["Empty","Loaded","Loaded","In Transit","In Transit","Arrived","Stripped","Returned","Repositioning"])
    weight = random.randint(2000, 28000)
    ship_idx = i % 80
    cont_ship_idx = i % 80
    origin = random.choice(port_unlocodes)
    dest = random.choice(port_unlocodes)
    is_reefer = iso_type.endswith("RF")
    is_damaged = random.random() < 0.05
    in_yard = random.random() < 0.4

    w(f"  containersData.push({{")
    w(f"    containerNo:{json.dumps(container_no)},isoType:{json.dumps(iso_type)},size:{json.dumps(size)},status:{json.dumps(status)},weight:{weight},")
    w(f"    vesselId:vessels[{cont_ship_idx}].id,shipmentId:shipments[{i % 80}].id,")
    w(f"    originPort:{json.dumps(origin)},destPort:{json.dumps(dest)},")
    w(f"    owner:{json.dumps(owner)},lessee:{json.dumps(random.choice(['Maersk','MSC','CMA CGM','COSCO','Hapag-Lloyd','ONE','Evergreen']))},")
    w(f"    maxPayload:{random.choice([24000,26500,28000,30000])},tareWeight:{random.choice([2200,3700,4000,4300])},cubicCapacity:{random.choice([33,67,76])},")
    w(f"    manufacturer:{json.dumps(random.choice(['CIMC','Singamas','Maersk Container Industry','Charleston Marine']))},yearManufactured:{random.randint(2010,2024)},")
    w(f"    lastInspection:new Date(Date.now() - {random.randint(1,365)} * 86400000),nextInspection:new Date(Date.now() + {random.randint(30,365)} * 86400000),")
    w(f"    cscExpiry:new Date(Date.now() + {random.randint(-30,730)} * 86400000),")
    w(f"    damaged:{str(is_damaged).lower()},damageDesc:{json.dumps(random.choice(['Dented side panel','Floor damage','Door hinge bent','None']) if is_damaged else 'null')},")
    seal_prefix = random.choice(['BOLT','CABLE'])
    seal_num = random.randint(10000,99999)
    w(f"    sealNo:{json.dumps(seal_prefix + str(seal_num))},sealType:{json.dumps(random.choice(seal_types))},")
    w(f"    commodityCode:{json.dumps(random.choice(hs_codes))},commodityDesc:{json.dumps(random.choice(cargo_cats))},")
    w(f"    temperature:{random.randint(-25,5) if is_reefer else 'null'},humidity:{random.randint(60,90) if is_reefer else 'null'},ventSetting:{json.dumps('Open 25%' if is_reefer else 'Closed')},")
    w(f"    isInYard:{str(in_yard).lower()},yardLocation:{json.dumps(f'A{random.randint(1,9)}.{random.randint(1,50)}.{random.randint(1,6)}') if in_yard else 'null'},")
    w(f"    yardEntryDate:{'new Date(Date.now() - ' + str(random.randint(1,30)) + ' * 86400000)' if in_yard else 'null'},")
    w(f"    freeDays:{random.randint(3,21)},demurrageStart:{'new Date(Date.now() + ' + str(random.randint(1,30)) + ' * 86400000)' if random.random() > 0.5 else 'null'}")
    w(f"  }})")

w("  // Batch insert in chunks of 100")
w("  for (let i = 0; i < containersData.length; i += 100) {")
w("    await db.container.createMany({ data: containersData.slice(i, i + 100) })")
w("  }")
w("  console.log('  Created ' + containersData.length + ' containers')")
w("")

# 8. SHIPMENT DOCUMENTS (300+)
w("  // 8. SHIPMENT DOCUMENTS (300+)")
w("  console.log('Seeding 300+ shipment documents...')")
w("  const documentsData: any[] = []")
docTypes_list = ['BOL','Commercial Invoice','Packing List','Customs Declaration','Certificate of Origin','Insurance Certificate','Phytosanitary','BL Amendment','VGM','Dangerous Goods Declaration']

for i in range(360):
    ship_idx = i % 80
    doc_type = random.choice(docTypes_list)
    w(f"  documentsData.push({{")
    w(f"    shipmentId:shipments[{ship_idx}].id,vesselId:shipments[{ship_idx}].vesselId,")
    w(f"    docType:{json.dumps(doc_type)},docName:{json.dumps(f'{doc_type}_{ship_idx+1}_{random.randint(100,999)}.pdf')},")
    w(f"    docRef:{json.dumps(f'DOC-{random.randint(100000,999999)}')},status:{json.dumps(random.choice(['Pending','Approved','Approved','Approved','Rejected']))},")
    w(f"    issuedBy:{json.dumps(random.choice(['Maersk Broker','Kerry Logistics','Sinotrans','Customs Agent']))},")
    w(f"    issuedAt:new Date(Date.now() - {random.randint(1,60)} * 86400000),expiryDate:new Date(Date.now() + {random.randint(30,365)} * 86400000),")
    w(f"    fileSize:{random.randint(50000,5000000)},fileFormat:'PDF',remarks:{json.dumps(random.choice(['Verified','Under review','Auto-generated','Manual upload']))}")
    w(f"  }})")

w("  for (let i = 0; i < documentsData.length; i += 100) {")
w("    await db.shipmentDocument.createMany({ data: documentsData.slice(i, i + 100) })")
w("  }")
w("  console.log('  Created ' + documentsData.length + ' documents')")
w("")

# 9. SHIPMENT EVENTS (600+)
w("  // 9. SHIPMENT EVENTS (600+)")
w("  console.log('Seeding 600+ shipment events...')")
w("  const eventsData: any[] = []")
w("  const eventTypes = ['Booked','CustomsFiled','GateIn','Loaded','Departed','AtSea','Arrived','Discharging','GateOut','Delivered','Exception','Held','Released']")

for i in range(640):
    ship_idx = i % 80
    evt = random.choice(event_types := ['Booked','CustomsFiled','GateIn','Loaded','Departed','AtSea','Arrived','Discharging','GateOut','Delivered','Exception','Held','Released'])
    loc = random.choice(port_unlocodes)
    w(f"  eventsData.push({{")
    w(f"    shipmentId:shipments[{ship_idx}].id,eventType:{json.dumps(evt)},")
    w(f"    eventDesc:{json.dumps(f'Shipment {evt.lower()} event for shipment {ship_idx+1}')},")
    w(f"    location:{json.dumps(loc)},countryCode:{json.dumps(loc[:2])},")
    w(f"    latitude:{round(random.uniform(-60,65),4)},longitude:{round(random.uniform(-180,180),4)},")
    w(f"    vesselName:shipments[{ship_idx}].billOfLading,performedBy:{json.dumps(random.choice(['Carrier','Agent','Port Authority','Customs','Forwarder']))},")
    w(f"    createdAt:new Date(Date.now() - {random.randint(0,60)} * 86400000 + {i} * 60000)")
    w(f"  }})")

w("  for (let i = 0; i < eventsData.length; i += 100) {")
w("    await db.shipmentEvent.createMany({ data: eventsData.slice(i, i + 100) })")
w("  }")
w("  console.log('  Created ' + eventsData.length + ' events')")
w("")

# 10. VESSEL ARRIVALS (40)
w("  // 10. VESSEL ARRIVALS (40)")
w("  console.log('Seeding 40 vessel arrivals...')")
w("  const arrivalsData: any[] = []")

for i in range(40):
    v_idx = i % 80
    p_idx = i % 50
    purpose = random.choice(["Cargo","Cargo","Cargo","Bunkering","Repair","Crew Change","Customs","Pilotage"])
    w(f"  arrivalsData.push({{")
    w(f"    vesselId:vessels[{v_idx}].id,portId:ports[{p_idx}].id,")
    w(f"    arrivalAt:new Date(Date.now() - {random.randint(1,30)} * 86400000),purpose:{json.dumps(purpose)},")
    w(f"    berth:{json.dumps(random.choice(berths))},pilotName:{json.dumps(random.choice(pilots))},")
    w(f"    agent:{json.dumps(random.choice(agents))},cargoDesc:{json.dumps(random.choice(cargo_cats))},")
    w(f"    dischargeTonnage:{round(random.uniform(0,50000),1)},loadTonnage:{round(random.uniform(0,50000),1)},")
    w(f"    stayHours:{random.randint(8,72)}")
    w(f"  }})")

w("  await db.vesselArrival.createMany({ data: arrivalsData })")
w("  console.log('  Created 40 arrivals')")
w("")

# 11. VESSEL DEPARTURES (30)
w("  // 11. VESSEL DEPARTURES (30)")
w("  console.log('Seeding 30 vessel departures...')")
w("  const departuresData: any[] = []")

for i in range(30):
    v_idx = i % 80
    p_idx = i % 50
    dest = random.choice(port_unlocodes)
    w(f"  departuresData.push({{")
    w(f"    vesselId:vessels[{v_idx}].id,portId:ports[{p_idx}].id,")
    w(f"    departedAt:new Date(Date.now() - {random.randint(1,30)} * 86400000),destination:{json.dumps(dest)},")
    w(f"    berth:{json.dumps(random.choice(berths))},nextPortETA:new Date(Date.now() + {random.randint(5,40)} * 86400000),")
    w(f"    draft:{round(random.uniform(5,16),1)},cargoOnboard:{json.dumps(random.choice(cargo_cats))}")
    w(f"  }})")

w("  await db.vesselDeparture.createMany({ data: departuresData })")
w("  console.log('  Created 30 departures')")
w("")

# 12. TRADE DATA (80)
w("  // 12. TRADE DATA (80)")
w("  console.log('Seeding 80 trade data records...')")
w("  const tradeDataRaw = [")
reporters = [("156","China"),("842","United States"),("276","Germany"),("392","Japan"),("410","South Korea"),("826","United Kingdom"),("792","Turkey"),("682","Saudi Arabia"),("360","Indonesia"),("356","India"),("566","Nigeria"),("710","South Africa"),("76","Brazil"),("36","Australia"),("528","Netherlands")]
partners = reporters
hs_list = [("8471","84","Computers"),("8542","85","Semiconductors"),("8703","87","Motor Vehicles"),("6108","61","Textiles"),("1006","10","Rice"),("2709","27","Crude Petroleum"),("2711","27","LNG"),("2601","26","Iron Ore"),("2804","28","Coal"),("3105","31","Fertilizers"),("7207","72","Steel"),("0203","02","Frozen Meat"),("0304","03","Frozen Fish"),("0405","04","Dairy"),("2204","22","Wine"),("3004","30","Pharmaceuticals"),("3304","33","Cosmetics"),("9403","94","Furniture"),("9503","95","Toys"),("4407","44","Timber"),("0901","09","Coffee"),("4001","40","Rubber"),("1511","15","Palm Oil"),("8411","84","Turbojets"),("8429","84","Machinery"),("8481","84","Valves"),("2523","25","Cement"),("2517","25","Aggregates"),("8708","87","Auto Parts"),("5201","52","Cotton"),("7601","76","Aluminium")]
years = [2020, 2021, 2022, 2023, 2024]
routes_td = ["Asia-Europe","Trans-Pacific","Trans-Atlantic","Intra-Asia","Asia-Middle East","Asia-Africa","Europe-South America","Europe-Africa","Intra-Europe","Oceania-Asia","Caribbean-Americas","Middle East-Americas"]

for i in range(80):
    rep = reporters[i % len(reporters)]
    par = partners[(i + 5) % len(partners)]
    flow = random.choice(["Import","Export","Re-export"])
    hs = hs_list[i % len(hs_list)]
    year = random.choice(years)
    month = random.randint(1, 12)
    gw = random.randint(1000000, 900000000)
    nw = int(gw * random.uniform(0.95, 0.99))
    tv = round(gw * random.uniform(0.5, 50), 2)
    q = gw
    uv = round(tv / q, 2)
    route = random.choice(routes_td)
    vtype = "Container" if hs[1] in ["8471","8542","6108","3004","3304","9403","9503","8481","8708","5201"] else "Bulk" if hs[1] in ["1006","2601","2804","3105","2523","2517","4001","0901"] else "Tanker" if hs[1] in ["2709","2711","1511"] else "Ro-Ro" if hs[1] == "8703" else "Container"
    co2 = round(gw * random.uniform(0.005, 0.05) / 1000, 1)
    fr = round(random.uniform(0.005, 0.06), 4)
    w(f"    {{reporterCode:{json.dumps(rep[0])},reporterName:{json.dumps(rep[1])},partnerCode:{json.dumps(par[0])},partnerName:{json.dumps(par[1])},year:{year},month:{month},tradeFlow:{json.dumps(flow)},commodityCode:{json.dumps(hs[0])},commodityChapter:{json.dumps(hs[1])},commodityDesc:{json.dumps(hs[2])},grossWeightKg:{gw},netWeightKg:{nw},tradeValueUsd:{tv},quantity:{q},qtyUnit:'kg',unitValueUsd:{uv},transportMode:'Sea',vesselType:{json.dumps(vtype)},estimatedVoyages:{random.randint(10,1000)},co2EmissionsT:{co2},freightRateUsd:{fr},transshipment:{str(random.random()<0.2).lower()},tradeRoute:{json.dumps(route)}}},")

w("  ]")
w("  await db.tradeData.createMany({ data: tradeDataRaw })")
w("  console.log('  Created 80 trade data records')")
w("")

# 13. CHARTERS (20)
w("  // 13. CHARTERS (20)")
w("  console.log('Seeding 20 charters...')")
w("  const chartersData = [")

for i in range(20):
    ct = random.choice(["Voyage","Voyage","Time","Time","Bareboat"])
    start_offset = random.randint(-180, 30)
    duration = random.randint(15, 365)
    end_offset = start_offset + duration
    rate = round(random.uniform(8000, 80000), 2)
    total = round(rate * duration, 2)
    dp = random.choice(port_unlocodes)
    rp = random.choice(port_unlocodes)
    status = random.choice(["Active","Active","Completed","Pending","Terminated"])
    w(f"    {{vesselId:vessels[{i % 80}].id,carrierId:carriers[{i % 20}].id,charterer:{json.dumps(random.choice(['Maersk','MSC','CMA CGM','COSCO','Hapag-Lloyd','Bunge','Cargill','Glencore','Vitol','Trafigura']))},charterType:{json.dumps(ct)},startDate:new Date(Date.now() + {start_offset} * 86400000),endDate:new Date(Date.now() + {end_offset} * 86400000),durationDays:{duration},ratePerDay:{rate},currency:'USD',totalValue:{total},deliveryPort:{json.dumps(dp)},redeliveryPort:{json.dumps(rp)},offHireAllowed:{str(random.random()<0.3).lower()},bunkers:{json.dumps(random.choice(['Owner','Charterer','Shared']))},status:{json.dumps(status)},remarks:{json.dumps(random.choice(['Standard terms','Direct charter','Through broker']))}}},")

w("  ]")
w("  await db.charter.createMany({ data: chartersData })")
w("  console.log('  Created 20 charters')")
w("")

# 14. BOOKINGS (50)
w("  // 14. BOOKINGS (50)")
w("  console.log('Seeding 50 bookings...')")
w("  const bookingsData = [")

for i in range(50):
    bn = f"BR{random.randint(10000000,99999999)}"
    ship_idx = i % 80
    v_idx = i % 80
    op_idx = i % 50
    dp_idx = (i + 7) % 50
    cut_offset = random.randint(1, 14)
    w(f"    {{bookingNumber:{json.dumps(bn)},shipmentId:shipments[{ship_idx}].id,carrierId:carriers[{i % 20}].id,vesselId:vessels[{v_idx}].id,originPortId:ports[{op_idx}].id,destPortId:ports[{dp_idx}].id,bookingDate:new Date(Date.now() - {random.randint(1,30)} * 86400000),cutoffDate:new Date(Date.now() + {cut_offset} * 86400000),siCutoffDate:new Date(Date.now() + {cut_offset + 1} * 86400000),docCutoffDate:new Date(Date.now() + {cut_offset + 2} * 86400000),status:{json.dumps(random.choice(['Pending','Confirmed','Confirmed','Confirmed','Cancelled','No-Show','Rolled']))},containerCount:{random.randint(1,12)},teuBooked:{round(random.uniform(1,24),1)},weightBookedKg:{random.randint(5000,300000)},commodity:{json.dumps(random.choice(cargo_cats))},specialInstructions:{json.dumps(random.choice(['Handle with care','Reefer required','Stack max 3 high','No stack']))},equipmentType:{json.dumps(random.choice(container_types))},rate:{round(random.uniform(800,5000),2)},rateCurrency:'USD',rateType:{json.dumps(random.choice(['FAK','Contract','Spot']))}}},")

w("  ]")
w("  await db.booking.createMany({ data: bookingsData })")
w("  console.log('  Created 50 bookings')")
w("")

# Summary
w("  const t1 = Date.now()")
w("  console.log()")
w("  console.log('========================================')")
w("  console.log('✅ DATABASE SEEDED SUCCESSFULLY')")
w("  console.log('========================================')")
w("  console.log(`⏱  Time: ${((t1 - t0) / 1000).toFixed(1)}s`)")
w("  console.log('📊 Summary:')")
w("  console.log(`   ${carriers.length} Carriers`)")
w("  console.log(`   ${tradeRoutes.length} Trade Routes`)")
w("  console.log(`   ${cargoTypesData.length} Cargo Types`)")
w("  console.log(`   ${ports.length} Ports`)")
w("  console.log(`   ${vessels.length} Vessels`)")
w("  console.log(`   ${shipments.length} Shipments`)")
w("  console.log(`   ${containersData.length} Containers`)")
w("  console.log(`   ${documentsData.length} Documents`)")
w("  console.log(`   ${eventsData.length} Events`)")
w("  console.log(`   ${arrivalsData.length} Arrivals`)")
w("  console.log(`   ${departuresData.length} Departures`)")
w("  console.log(`   ${tradeDataRaw.length} Trade Records`)")
w("  console.log(`   ${chartersData.length} Charters`)")
w("  console.log(`   ${bookingsData.length} Bookings`)")
w("  console.log('========================================')")
w("}")
w("")
w("seedRichMaritimeData()")
w("  .catch((e) => { console.error('Seed failed:', e); process.exit(1) })")
w("  .finally(() => process.exit(0))")

# Append to file
with open(OUT, 'a') as f:
    f.write('\n'.join(lines) + '\n')

print(f"Phase 6-14 complete: 80 shipments, 420 containers, 360 docs, 640 events, 40 arrivals, 30 departures, 80 trade, 20 charters, 50 bookings")
print(f"Appended {len(lines)} lines to {OUT}")
