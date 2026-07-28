#!/usr/bin/env python3
"""
Generate the massive seed-maritime.ts file with proliferated data.
This generates realistic maritime data across all models.
"""

import json
import random
import os

random.seed(42)

OUTPUT = "/home/z/my-project/scripts/seed-maritime.ts"

lines = []
def w(s=""):
    lines.append(s)

w("""import { db } from '@/lib/db'

// ═══════════════════════════════════════════════════════════════
// Global Maritime & Freight Analytics Platform — MASSIVE Seed Script
// ═══════════════════════════════════════════════════════════════

export async function seedRichMaritimeData() {
  console.log('🌍 Seeding MASSIVE Global Maritime & Freight Database...')
  const t0 = Date.now()

  // 0. CLEAR EXISTING DATA
  console.log('🗑️  Clearing existing data...')
  await db.booking.deleteMany()
  await db.charter.deleteMany()
  await db.tradeData.deleteMany()
  await db.vesselDeparture.deleteMany()
  await db.vesselArrival.deleteMany()
  await db.shipmentEvent.deleteMany()
  await db.shipmentDocument.deleteMany()
  await db.container.deleteMany()
  await db.shipment.deleteMany()
  await db.vessel.deleteMany()
  await db.cargoType.deleteMany()
  await db.port.deleteMany()
  await db.tradeRoute.deleteMany()
  await db.carrier.deleteMany()
  console.log('   ✓ All tables cleared')
""")

# ═══════════════════════════════════════════════════
# 1. CARRIERS (20)
# ═══════════════════════════════════════════════════
carriers = [
    {"name":"Maersk","code":"MAEU","country":"Denmark","headquarters":"Copenhagen","website":"www.maersk.com","foundedYear":1904,"fleetSize":730,"totalTEUCapacity":4100000,"alliance":"2M","isTop20":True,"isFCL":True,"isLCL":True,"isBreakBulk":True,"isReefer":True,"isDG":True,"serviceRoutes":"AE1,AE2,AE5,AE6,AE10,TP6,TP7,TP9","transitTimeDays":28,"reliability":78.2,"co2PerTeu":8.2,"contactEmail":"booking@maersk.com","contactPhone":"+45 3363 3363","remarks":"World largest container shipping line"},
    {"name":"MSC","code":"MSCU","country":"Switzerland","headquarters":"Geneva","website":"www.msc.com","foundedYear":1970,"fleetSize":830,"totalTEUCapacity":5100000,"alliance":"Independent","isTop20":True,"isFCL":True,"isLCL":True,"isBreakBulk":True,"isReefer":True,"isDG":True,"serviceRoutes":"ALBATROS,DRAGON,JADE,LION,PHOENIX,SILK,TIGER","transitTimeDays":30,"reliability":75.8,"co2PerTeu":9.1,"contactEmail":"info@msc.com","contactPhone":"+41 22 703 8888","remarks":"Largest by TEU capacity"},
    {"name":"CMA CGM","code":"CMDU","country":"France","headquarters":"Marseille","website":"www.cma-cgm.com","foundedYear":1978,"fleetSize":620,"totalTEUCapacity":3500000,"alliance":"Ocean Alliance","isTop20":True,"isFCL":True,"isLCL":True,"isBreakBulk":True,"isReefer":True,"isDG":True,"serviceRoutes":"FAL1,FAL2,FAL3,FAL5,MEX1,AAC1,AAS1","transitTimeDays":29,"reliability":76.5,"co2PerTeu":8.8,"contactEmail":"contact@cma-cgm.com","contactPhone":"+33 4 88 91 90 00","remarks":"French global shipping giant"},
    {"name":"COSCO Shipping","code":"COSU","country":"China","headquarters":"Shanghai","website":"www.coscoshipping.com","foundedYear":1961,"fleetSize":510,"totalTEUCapacity":3100000,"alliance":"Ocean Alliance","isTop20":True,"isFCL":True,"isLCL":True,"isBreakBulk":False,"isReefer":True,"isDG":True,"serviceRoutes":"AAS1,AAS2,AAE1,AWE1,AWE2","transitTimeDays":27,"reliability":80.1,"co2PerTeu":7.5,"contactEmail":"cs@coscoshipping.com","contactPhone":"+86 21 6596 6104","remarks":"Chinese state-owned"},
    {"name":"Hapag-Lloyd","code":"HLCU","country":"Germany","headquarters":"Hamburg","website":"www.hapag-lloyd.com","foundedYear":1847,"fleetSize":265,"totalTEUCapacity":2000000,"alliance":"THE Alliance","isTop20":True,"isFCL":True,"isLCL":True,"isBreakBulk":False,"isReefer":True,"isDG":True,"serviceRoutes":"FE1,FE2,FE3,FE4,FE5,AA1,AA2","transitTimeDays":26,"reliability":82.3,"co2PerTeu":7.8,"contactEmail":"info@hapag-lloyd.com","contactPhone":"+49 40 3001 0","remarks":"German legacy carrier"},
    {"name":"ONE","code":"ONEY","country":"Japan","headquarters":"Tokyo","website":"www.one-line.com","foundedYear":2017,"fleetSize":240,"totalTEUCapacity":1800000,"alliance":"THE Alliance","isTop20":True,"isFCL":True,"isLCL":True,"isBreakBulk":False,"isReefer":True,"isDG":True,"serviceRoutes":"PS1,PS2,PS3,PS4,PS5,FE1,FE2","transitTimeDays":25,"reliability":83.5,"co2PerTeu":7.2,"contactEmail":"info@one-line.com","contactPhone":"+81 3 6832 3111","remarks":"K Line + MOL + NYK merger"},
    {"name":"Evergreen","code":"EGLV","country":"Taiwan","headquarters":"Taipei","website":"www.evergreen-marine.com","foundedYear":1968,"fleetSize":210,"totalTEUCapacity":1700000,"alliance":"Ocean Alliance","isTop20":True,"isFCL":True,"isLCL":True,"isBreakBulk":False,"isReefer":True,"isDG":True,"serviceRoutes":"CES,CPN,CWA,CTN,FE2,FE3","transitTimeDays":28,"reliability":77.1,"co2PerTeu":8.0,"contactEmail":"cs@evergreen.com","contactPhone":"+886 2 2505 7766","remarks":"Taiwan container giant"},
    {"name":"Yang Ming","code":"YMLU","country":"Taiwan","headquarters":"Keelung","website":"www.yangming.com","foundedYear":1972,"fleetSize":95,"totalTEUCapacity":700000,"alliance":"THE Alliance","isTop20":True,"isFCL":True,"isLCL":True,"isBreakBulk":False,"isReefer":True,"isDG":True,"serviceRoutes":"AUE,PE1,PE2,PS3,AA1","transitTimeDays":27,"reliability":79.4,"co2PerTeu":8.3,"contactEmail":"info@yangming.com","contactPhone":"+886 2 2455 9988","remarks":"Taiwan carrier, THE Alliance member"},
    {"name":"PIL","code":"PILS","country":"Singapore","headquarters":"Singapore","website":"www.pilship.com","foundedYear":1967,"fleetSize":120,"totalTEUCapacity":350000,"alliance":"Independent","isTop20":False,"isFCL":True,"isLCL":True,"isBreakBulk":True,"isReefer":True,"isDG":False,"serviceRoutes":"ASA,FE3,WSS,ISS,JSR","transitTimeDays":32,"reliability":71.2,"co2PerTeu":10.5,"contactEmail":"cs@pilship.com","contactPhone":"+65 6277 6888","remarks":"Pacific International Lines, SE Asia specialist"},
    {"name":"ZIM","code":"ZIMU","country":"Israel","headquarters":"Haifa","website":"www.zim.com","foundedYear":1945,"fleetSize":85,"totalTEUCapacity":400000,"alliance":"Independent","isTop20":True,"isFCL":True,"isLCL":True,"isBreakBulk":False,"isReefer":True,"isDG":True,"serviceRoutes":"ZCA,ZCP,ZEA,ZBA,ZSA","transitTimeDays":24,"reliability":81.0,"co2PerTeu":8.6,"contactEmail":"info@zim.com","contactPhone":"+972 4 865 2111","remarks":"Israeli carrier, reefer specialist"},
    {"name":"HMM","code":"HDMU","country":"South Korea","headquarters":"Seoul","website":"www.hmm21.com","foundedYear":1976,"fleetSize":78,"totalTEUCapacity":820000,"alliance":"THE Alliance","isTop20":True,"isFCL":True,"isLCL":True,"isBreakBulk":False,"isReefer":True,"isDG":True,"serviceRoutes":"FE3,FE4,FE5,PS1,PS2,PS3,PA1,PA2","transitTimeDays":25,"reliability":84.2,"co2PerTeu":7.0,"contactEmail":"info@hmm21.com","contactPhone":"+82 2 3770 6114","remarks":"Hyundai Merchant Marine"},
    {"name":"Wan Hai Lines","code":"WHLC","country":"Taiwan","headquarters":"Taipei","website":"www.wanhai.com","foundedYear":1965,"fleetSize":72,"totalTEUCapacity":280000,"alliance":"Independent","isTop20":False,"isFCL":True,"isLCL":True,"isBreakBulk":False,"isReefer":True,"isDG":True,"serviceRoutes":"CNA,CT1,CT2,NAS,ASS,ASA","transitTimeDays":14,"reliability":80.5,"co2PerTeu":9.2,"contactEmail":"cs@wanhai.com","contactPhone":"+886 2 2758 6688","remarks":"Intra-Asia specialist"},
    {"name":"KMTC","code":"KMTC","country":"South Korea","headquarters":"Seoul","website":"www.kmtc.co.kr","foundedYear":1951,"fleetSize":68,"totalTEUCapacity":180000,"alliance":"Independent","isTop20":False,"isFCL":True,"isLCL":True,"isBreakBulk":False,"isReefer":False,"isDG":True,"serviceRoutes":"KTC,ICX,JPW,JCS,JHK","transitTimeDays":10,"reliability":76.8,"co2PerTeu":10.1,"contactEmail":"info@kmtc.co.kr","contactPhone":"+82 2 3770 6500","remarks":"Korea Marine Transport, intra-Asia"},
    {"name":"X-Press Feeders","code":"XPFE","country":"Malta","headquarters":"Valletta","website":"www.x-pressfeeders.com","foundedYear":2002,"fleetSize":110,"totalTEUCapacity":220000,"alliance":"Independent","isTop20":False,"isFCL":True,"isLCL":True,"isBreakBulk":False,"isReefer":False,"isDG":False,"serviceRoutes":"EFS,NWS,ISS,BAS,WMS","transitTimeDays":8,"reliability":74.3,"co2PerTeu":11.2,"contactEmail":"ops@x-pressfeeders.com","contactPhone":"+356 2133 8400","remarks":"Feeder specialist"},
    {"name":"IRISL","code":"IRIS","country":"Iran","headquarters":"Tehran","website":"www.irisl.com","foundedYear":1967,"fleetSize":55,"totalTEUCapacity":120000,"alliance":"Independent","isTop20":False,"isFCL":True,"isLCL":True,"isBreakBulk":True,"isReefer":True,"isDG":True,"serviceRoutes":"IRG,IRC,IRW,PG1,PG2","transitTimeDays":18,"reliability":65.0,"co2PerTeu":12.0,"contactEmail":"info@irisl.com","contactPhone":"+98 21 6670 2101","remarks":"Islamic Republic of Iran Shipping Lines"},
    {"name":"Matson","code":"MATU","country":"US","headquarters":"Honolulu","website":"www.matson.com","foundedYear":1882,"fleetSize":22,"totalTEUCapacity":45000,"alliance":"Independent","isTop20":False,"isFCL":True,"isLCL":True,"isBreakBulk":True,"isReefer":True,"isDG":True,"serviceRoutes":"Hawaii,Guam,China,SSA","transitTimeDays":14,"reliability":88.0,"co2PerTeu":15.0,"contactEmail":"info@matson.com","contactPhone":"+1 808 843 7000","remarks":"US Pacific trade specialist"},
    {"name":"Grimaldi","code":"GRIM","country":"Italy","headquarters":"Naples","website":"www.grimaldi.napoli.it","foundedYear":1947,"fleetSize":120,"totalTEUCapacity":95000,"alliance":"Independent","isTop20":False,"isFCL":True,"isLCL":True,"isBreakBulk":True,"isReefer":True,"isDG":True,"serviceRoutes":"MRS,AMS,WAF,CMR,NAS","transitTimeDays":20,"reliability":73.5,"co2PerTeu":11.8,"contactEmail":"info@grimaldi.napoli.it","contactPhone":"+39 081 496 1111","remarks":"Ro-Ro and short sea specialist"},
    {"name":"ACL","code":"ACLU","country":"UK","headquarters":"Southampton","website":"www.aclcargo.com","foundedYear":1965,"fleetSize":5,"totalTEUCapacity":12000,"alliance":"Independent","isTop20":False,"isFCL":True,"isLCL":True,"isBreakBulk":True,"isReefer":True,"isDG":True,"serviceRoutes":"ACL1,ACL2","transitTimeDays":15,"reliability":82.0,"co2PerTeu":14.5,"contactEmail":"info@aclcargo.com","contactPhone":"+44 23 8033 3333","remarks":"Atlantic Container Line, ConRo specialist"},
    {"name":"Crowley","code":"CROW","country":"US","headquarters":"Jacksonville","website":"www.crowley.com","foundedYear":1892,"fleetSize":35,"totalTEUCapacity":60000,"alliance":"Independent","isTop20":False,"isFCL":True,"isLCL":True,"isBreakBulk":True,"isReefer":True,"isDG":True,"serviceRoutes":"Caribbean,CentralAm,USP1","transitTimeDays":8,"reliability":79.0,"co2PerTeu":13.5,"contactEmail":"info@crowley.com","contactPhone":"+1 904 353 1000","remarks":"US Americas specialist"},
    {"name":"Frontline","code":"FROO","country":"Bermuda","headquarters":"Hamilton","website":"www.frontline.bm","foundedYear":1985,"fleetSize":85,"totalTEUCapacity":0,"alliance":"Independent","isTop20":False,"isFCL":False,"isLCL":False,"isBreakBulk":False,"isReefer":False,"isDG":True,"serviceRoutes":"TD3,RT1,WAF,USGC","transitTimeDays":0,"reliability":0,"co2PerTeu":0,"contactEmail":"info@frontline.bm","contactPhone":"+1 441 295 5273","remarks":"Tanker giant (VLCC/Suezmax)"},
]

w("  // ═══════════════════════════════════════════════════════")
w("  // 1. SEED CARRIERS (20)")
w("  // ═══════════════════════════════════════════════════════")
w("  console.log('🚢 Seeding Carriers...')")
w("  const carriersData = [")
for c in carriers:
    w(f"    {json.dumps(c)},")
w("  ]")
w("  const carriers = []")
w("  for (const c of carriersData) {")
w("    carriers.push(await db.carrier.create({ data: c }))")
w("  }")
w(f"  console.log(`   ✓ {len(carriers)} carriers created`)")
w()

# ═══════════════════════════════════════════════════
# 2. TRADE ROUTES (15)
# ═══════════════════════════════════════════════════
routes = [
    {"name":"Asia-Europe (via Suez)","code":"AE1","originRegion":"East Asia","destRegion":"North Europe","originPorts":"CNSHA,CNYTN,CNNGB,HKGKG,SGSIN","destPorts":"NLRTM,DEHAM,BEANR,GBFXT","distanceNm":10500,"avgTransitDays":30,"avgFreightPerTEU":1200,"majorCarriers":"MAEU,CMDU,COSU,ONEY,EGLV","vesselTypes":"Container","weeklyFrequency":45,"seasonalPeak":"Q4 Pre-Holiday","canalTransit":"Suez","piracyRisk":"Low","congestionIndex":55},
    {"name":"Asia-N. America West Coast","code":"TP6","originRegion":"East Asia","destRegion":"North America WC","originPorts":"CNSHA,CNYTN,HKGKG,JPTYO,KRPUS","destPorts":"USLAX,USOAK,USSEA,USVAN,CAROB","distanceNm":6000,"avgTransitDays":14,"avgFreightPerTEU":2800,"majorCarriers":"MAEU,CMDU,COSU,ONEY,EGLV,HLCU","vesselTypes":"Container","weeklyFrequency":38,"seasonalPeak":"Q3 Peak","canalTransit":"None","piracyRisk":"Low","congestionIndex":62},
    {"name":"Asia-N. America East Coast","code":"TP7","originRegion":"East Asia","destRegion":"North America EC","originPorts":"CNSHA,CNYTN,HKGKG,SGSIN","destPorts":"USNYC,USsav,NYSGN","distanceNm":12000,"avgTransitDays":28,"avgFreightPerTEU":3500,"majorCarriers":"MAEU,CMDU,COSU,EGLV,HLCU","vesselTypes":"Container","weeklyFrequency":18,"seasonalPeak":"Q4 Pre-Holiday","canalTransit":"Panama","piracyRisk":"Low","congestionIndex":58},
    {"name":"Trans-Atlantic Westbound","code":"TAW","originRegion":"North Europe","destRegion":"North America EC","originPorts":"NLRTM,DEHAM,GBFXT","destPorts":"USNYC,USMSY","distanceNm":3500,"avgTransitDays":10,"avgFreightPerTEU":1800,"majorCarriers":"MAEU,HLCU,ONEY,EGLV","vesselTypes":"Container","weeklyFrequency":15,"seasonalPeak":"Q3-Q4","canalTransit":"None","piracyRisk":"Low","congestionIndex":40},
    {"name":"Trans-Atlantic Eastbound","code":"TAE","originRegion":"North America EC","destRegion":"North Europe","originPorts":"USNYC,USMSY","destPorts":"NLRTM,DEHAM,GBFXT","distanceNm":3500,"avgTransitDays":10,"avgFreightPerTEU":1100,"majorCarriers":"MAEU,HLCU,ONEY,EGLV","vesselTypes":"Container","weeklyFrequency":15,"seasonalPeak":"Q1-Q2","canalTransit":"None","piracyRisk":"Low","congestionIndex":38},
    {"name":"Intra-Asia","code":"IAX","originRegion":"East/Southeast Asia","destRegion":"East/Southeast Asia","originPorts":"CNSHA,CNYTN,HKGKG,SGSIN,JPTYO,KRPUS","destPorts":"SGSIN,MYTPP,IDJKT,VNSGN,THLCH,PNSHI,PHMNL","distanceNm":1800,"avgTransitDays":5,"avgFreightPerTEU":350,"majorCarriers":"WHLC,KMTC,PILS,XPFE,COSU","vesselTypes":"Container, Ro-Ro","weeklyFrequency":85,"seasonalPeak":"Q1 Post-CNY","canalTransit":"None","piracyRisk":"Low","congestionIndex":45},
    {"name":"Asia-Middle East","code":"AME","originRegion":"East Asia","destRegion":"Middle East","originPorts":"CNSHA,CNYTN,HKGKG,JPTYO","destPorts":"AEJEA,SAJED,AEDBX,KWKWT","distanceNm":5500,"avgTransitDays":14,"avgFreightPerTEU":600,"majorCarriers":"MAEU,CMDU,COSU,ONEY","vesselTypes":"Container, Tanker","weeklyFrequency":20,"seasonalPeak":"Year-round","canalTransit":"None","piracyRisk":"Medium","congestionIndex":35},
    {"name":"Asia-Africa","code":"AAF","originRegion":"East Asia","destRegion":"Africa","originPorts":"CNSHA,CNYTN,HKGKG,SGSIN","destPorts":"ZADUR,NGTIN,EGSuez,KEMLS,TZDAR","distanceNm":7000,"avgTransitDays":18,"avgFreightPerTEU":1500,"majorCarriers":"MAEU,CMDU,PILS","vesselTypes":"Container, Bulk","weeklyFrequency":8,"seasonalPeak":"Q2-Q3","canalTransit":"Suez","piracyRisk":"High","congestionIndex":50},
    {"name":"Europe-South America","code":"ESS","originRegion":"North Europe","destRegion":"South America EC","originPorts":"NLRTM,DEHAM,GBFXT","destPorts":"BRSSZ,ARBAI,UYMVD","distanceNm":5500,"avgTransitDays":16,"avgFreightPerTEU":2200,"majorCarriers":"MAEU,HLCU,ONEY,EGLV","vesselTypes":"Container","weeklyFrequency":5,"seasonalPeak":"Q1 Harvest","canalTransit":"None","piracyRisk":"Low","congestionIndex":30},
    {"name":"Europe-Africa","code":"EAF","originRegion":"North Europe","destRegion":"West Africa","originPorts":"NLRTM,DEHAM,GBFXT","destPorts":"NGTIN,GHLBP,SN DKR,CMDDL","distanceNm":3000,"avgTransitDays":10,"avgFreightPerTEU":1900,"majorCarriers":"MAEU,PILS,CMDU","vesselTypes":"Container, Ro-Ro","weeklyFrequency":6,"seasonalPeak":"Q3-Q4","canalTransit":"None","piracyRisk":"Low","congestionIndex":32},
    {"name":"Intra-Europe / Med","code":"IEM","originRegion":"North Europe","destRegion":"Mediterranean","originPorts":"NLRTM,DEHAM,GBFXT","destPorts":"ITGOA,GRTPI,ESVLC,ESALG,PTRNS,EGALD","distanceNm":2000,"avgTransitDays":5,"avgFreightPerTEU":400,"majorCarriers":"MAEU,HLCU,ONEY,EGLV,GRIM","vesselTypes":"Container, Ro-Ro","weeklyFrequency":55,"seasonalPeak":"Year-round","canalTransit":"None","piracyRisk":"Low","congestionIndex":42},
    {"name":"Trans-Pacific (Japan/US)","code":"TPC","originRegion":"Japan","destRegion":"North America WC","originPorts":"JPTYO,JPYOK,JPNGO","destPorts":"USLAX,USOAK,USSEA","distanceNm":4500,"avgTransitDays":11,"avgFreightPerTEU":2500,"majorCarriers":"ONEY,HDMU,EGLV,YMLU","vesselTypes":"Container, Ro-Ro","weeklyFrequency":25,"seasonalPeak":"Q4","canalTransit":"None","piracyRisk":"Low","congestionIndex":48},
    {"name":"Oceania-Asia","code":"OAX","originRegion":"Australia/NZ","destRegion":"East Asia","originPorts":"AUSYD,AUMEL,NZAKL","destPorts":"CNSHA,HKGKG,SGSIN,JPTYO","distanceNm":4500,"avgTransitDays":12,"avgFreightPerTEU":900,"majorCarriers":"MAEU,CMDU,COSU,EGLV","vesselTypes":"Container, Bulk","weeklyFrequency":10,"seasonalPeak":"Q3-Q4","canalTransit":"None","piracyRisk":"Low","congestionIndex":25},
    {"name":"Caribbean-Americas","code":"CAR","originRegion":"North America","destRegion":"Caribbean/Central Am","originPorts":"USMIA,USJAX,USHOU","destPorts":"PASXJ,JMKIN,DOHAI,COPAU,VECAS","distanceNm":1200,"avgTransitDays":4,"avgFreightPerTEU":1800,"majorCarriers":"CROW,GRIM,ACL","vesselTypes":"Container, Ro-Ro","weeklyFrequency":22,"seasonalPeak":"Q1-Q2","canalTransit":"Panama","piracyRisk":"Low","congestionIndex":28},
    {"name":"Middle East-Americas","code":"MEA","originRegion":"Middle East","destRegion":"North America","originPorts":"SAJED,AEJEA,KWKWT","destPorts":"USLAX,USHOU,NYSGN","distanceNm":8500,"avgTransitDays":22,"avgFreightPerTEU":550,"majorCarriers":"MAEU,CMDU,ONEY","vesselTypes":"Container, Tanker","weeklyFrequency":12,"seasonalPeak":"Year-round","canalTransit":"Suez","piracyRisk":"Low","congestionIndex":33},
]

w("  // ═══════════════════════════════════════════════════════")
w("  // 2. SEED TRADE ROUTES (15)")
w("  // ═══════════════════════════════════════════════════════")
w("  console.log('🗺️  Seeding Trade Routes...')")
w("  const tradeRoutesData = [")
for r in routes:
    w(f"    {json.dumps(r)},")
w("  ]")
w("  const tradeRoutes = []")
w("  for (const r of tradeRoutesData) {")
w("    tradeRoutes.push(await db.tradeRoute.create({ data: r }))")
w("  }")
w(f"  console.log(`   ✓ {len(routes)} trade routes created`)")
w()

# ═══════════════════════════════════════════════════
# 3. CARGO TYPES (30)
# ═══════════════════════════════════════════════════
cargo_types = [
    {"hsCode":"8471","hsChapter":"84","name":"Computers & Electronics","description":"Desktops, laptops, servers, peripherals","category":"Containerized","dangerous":False,"temperatureRequired":False,"humidityControl":False,"ventilationRequired":False,"stackingAllowed":True,"commodityGroup":"Manufactured","tradeVolume":45000000,"unitValue":8500},
    {"hsCode":"8542","hsChapter":"85","name":"Semiconductors","description":"Integrated circuits, microprocessors, wafers","category":"Containerized","dangerous":False,"temperatureRequired":False,"humidityControl":True,"ventilationRequired":False,"stackingAllowed":True,"maxStackWeight":500,"commodityGroup":"Manufactured","tradeVolume":18000000,"unitValue":420000},
    {"hsCode":"8703","hsChapter":"87","name":"Motor Vehicles","description":"Passenger cars, SUVs, sedans","category":"Break Bulk","dangerous":False,"temperatureRequired":False,"humidityControl":False,"ventilationRequired":False,"stackingAllowed":False,"commodityGroup":"Manufactured","tradeVolume":65000000,"unitValue":3200},
    {"hsCode":"6108","hsChapter":"61","name":"Textiles & Garments","description":"Cotton shirts, synthetic blouses, knitwear","category":"Containerized","dangerous":False,"temperatureRequired":False,"humidityControl":False,"ventilationRequired":False,"stackingAllowed":True,"commodityGroup":"Manufactured","tradeVolume":32000000,"unitValue":12},
    {"hsCode":"1006","hsChapter":"10","name":"Rice","description":"Milled, semi-milled, broken rice","category":"Bulk Dry","dangerous":False,"temperatureRequired":False,"humidityControl":False,"ventilationRequired":True,"stackingAllowed":True,"commodityGroup":"Agriculture","tradeVolume":48000000,"unitValue":450},
    {"hsCode":"2709","hsChapter":"27","name":"Crude Petroleum","description":"Crude oil, bituminous blends","category":"Bulk Liquid","dangerous":True,"dgClass":"Class 3","temperatureRequired":False,"humidityControl":False,"ventilationRequired":False,"stackingAllowed":False,"commodityGroup":"Energy","tradeVolume":2800000000,"unitValue":520},
    {"hsCode":"2711","hsChapter":"27","name":"LNG & LPG","description":"Liquefied natural and petroleum gas","category":"Bulk Liquid","dangerous":True,"dgClass":"Class 2.1","temperatureRequired":True,"tempRange":"-162°C (LNG), -42°C (LPG)","humidityControl":False,"ventilationRequired":False,"stackingAllowed":False,"commodityGroup":"Energy","tradeVolume":380000000,"unitValue":480},
    {"hsCode":"2601","hsChapter":"26","name":"Iron Ore","description":"Hematite, magnetite concentrates","category":"Bulk Dry","dangerous":False,"temperatureRequired":False,"humidityControl":False,"ventilationRequired":False,"stackingAllowed":True,"commodityGroup":"Minerals","tradeVolume":2500000000,"unitValue":95},
    {"hsCode":"2804","hsChapter":"28","name":"Coal (Bituminous)","description":"Thermal and coking coal","category":"Bulk Dry","dangerous":False,"temperatureRequired":False,"humidityControl":False,"ventilationRequired":True,"stackingAllowed":True,"commodityGroup":"Energy","tradeVolume":1200000000,"unitValue":110},
    {"hsCode":"3105","hsChapter":"31","name":"Fertilizers","description":"NPK, urea, potash blends","category":"Bulk Dry","dangerous":False,"temperatureRequired":False,"humidityControl":False,"ventilationRequired":False,"stackingAllowed":True,"commodityGroup":"Agriculture","tradeVolume":180000000,"unitValue":320},
    {"hsCode":"7207","hsChapter":"72","name":"Steel Products","description":"Hot-rolled coils, billets, slabs","category":"Break Bulk","dangerous":False,"temperatureRequired":False,"humidityControl":False,"ventilationRequired":False,"stackingAllowed":True,"maxStackWeight":25000,"commodityGroup":"Manufactured","tradeVolume":95000000,"unitValue":650},
    {"hsCode":"0203","hsChapter":"02","name":"Frozen Meat","description":"Beef, pork, poultry frozen","category":"Reefer","dangerous":False,"temperatureRequired":True,"tempRange":"-18°C to -25°C","humidityControl":False,"ventilationRequired":False,"stackingAllowed":True,"commodityGroup":"Agriculture","tradeVolume":22000000,"unitValue":3500},
    {"hsCode":"0304","hsChapter":"03","name":"Frozen Fish","description":"Fillets, whole frozen fish","category":"Reefer","dangerous":False,"temperatureRequired":True,"tempRange":"-18°C to -25°C","humidityControl":False,"ventilationRequired":False,"stackingAllowed":True,"commodityGroup":"Agriculture","tradeVolume":28000000,"unitValue":2800},
    {"hsCode":"0405","hsChapter":"04","name":"Dairy Products","description":"Butter, cheese, milk powder","category":"Reefer","dangerous":False,"temperatureRequired":True,"tempRange":"0°C to 8°C","humidityControl":False,"ventilationRequired":False,"stackingAllowed":True,"commodityGroup":"Agriculture","tradeVolume":15000000,"unitValue":2200},
    {"hsCode":"2204","hsChapter":"22","name":"Wine","description":"Still wine in bulk/bottles","category":"Containerized","dangerous":False,"temperatureRequired":True,"tempRange":"10°C to 18°C","humidityControl":True,"ventilationRequired":False,"stackingAllowed":True,"commodityGroup":"Agriculture","tradeVolume":12000000,"unitValue":1800},
    {"hsCode":"3004","hsChapter":"30","name":"Pharmaceuticals","description":"Medicaments in packed form","category":"Containerized","dangerous":False,"temperatureRequired":True,"tempRange":"2°C to 8°C (cold chain)","humidityControl":True,"ventilationRequired":False,"stackingAllowed":True,"maxStackWeight":800,"commodityGroup":"Manufactured","tradeVolume":8000000,"unitValue":28000},
    {"hsCode":"3304","hsChapter":"33","name":"Cosmetics & Toiletries","description":"Beauty products, skincare, fragrances","category":"Containerized","dangerous":False,"temperatureRequired":False,"humidityControl":False,"ventilationRequired":False,"stackingAllowed":True,"commodityGroup":"Manufactured","tradeVolume":9500000,"unitValue":1500},
    {"hsCode":"9403","hsChapter":"94","name":"Furniture","description":"Wooden, metal, upholstered furniture","category":"Containerized","dangerous":False,"temperatureRequired":False,"humidityControl":False,"ventilationRequired":False,"stackingAllowed":True,"maxStackWeight":2000,"commodityGroup":"Manufactured","tradeVolume":35000000,"unitValue":250},
    {"hsCode":"9503","hsChapter":"95","name":"Toys & Games","description":"Plastic toys, board games, dolls","category":"Containerized","dangerous":False,"temperatureRequired":False,"humidityControl":False,"ventilationRequired":False,"stackingAllowed":True,"commodityGroup":"Manufactured","tradeVolume":18000000,"unitValue":35},
    {"hsCode":"4407","hsChapter":"44","name":"Timber & Wood Products","description":"Sawn wood, plywood, veneers","category":"Break Bulk","dangerous":False,"temperatureRequired":False,"humidityControl":False,"ventilationRequired":True,"stackingAllowed":True,"commodityGroup":"Agriculture","tradeVolume":45000000,"unitValue":380},
    {"hsCode":"0901","hsChapter":"09","name":"Coffee","description":"Green and roasted coffee beans","category":"Bulk Dry","dangerous":False,"temperatureRequired":False,"humidityControl":True,"ventilationRequired":True,"stackingAllowed":True,"commodityGroup":"Agriculture","tradeVolume":10000000,"unitValue":4200},
    {"hsCode":"4001","hsChapter":"40","name":"Natural Rubber","description":"Latex, RSS, TSR rubber","category":"Bulk Dry","dangerous":False,"temperatureRequired":False,"humidityControl":False,"ventilationRequired":False,"stackingAllowed":True,"commodityGroup":"Agriculture","tradeVolume":14000000,"unitValue":1500},
    {"hsCode":"1511","hsChapter":"15","name":"Palm Oil","description":"Crude and refined palm oil","category":"Bulk Liquid","dangerous":False,"temperatureRequired":True,"tempRange":"25°C to 32°C","humidityControl":False,"ventilationRequired":False,"stackingAllowed":False,"commodityGroup":"Agriculture","tradeVolume":75000000,"unitValue":950},
    {"hsCode":"8411","hsChapter":"84","name":"Turbojets & Turboprops","description":"Aircraft engines, gas turbines","category":"Break Bulk","dangerous":False,"temperatureRequired":False,"humidityControl":False,"ventilationRequired":False,"stackingAllowed":False,"maxStackWeight":5000,"commodityGroup":"Manufactured","tradeVolume":500000,"unitValue":850000},
    {"hsCode":"8429","hsChapter":"84","name":"Machinery & Equipment","description":"Earth-moving, excavators, loaders","category":"Break Bulk","dangerous":False,"temperatureRequired":False,"humidityControl":False,"ventilationRequired":False,"stackingAllowed":True,"maxStackWeight":30000,"commodityGroup":"Manufactured","tradeVolume":12000000,"unitValue":45000},
    {"hsCode":"8481","hsChapter":"84","name":"Industrial Valves & Pipes","description":"Valves, elbows, reducers, fittings","category":"Containerized","dangerous":False,"temperatureRequired":False,"humidityControl":False,"ventilationRequired":False,"stackingAllowed":True,"maxStackWeight":8000,"commodityGroup":"Manufactured","tradeVolume":6000000,"unitValue":1200},
    {"hsCode":"2523","hsChapter":"25","name":"Cement & Clinker","description":"Portland cement, clinker","category":"Bulk Dry","dangerous":False,"temperatureRequired":False,"humidityControl":False,"ventilationRequired":False,"stackingAllowed":True,"commodityGroup":"Minerals","tradeVolume":420000000,"unitValue":85},
    {"hsCode":"2517","hsChapter":"25","name":"Sand, Gravel & Stone","description":"Construction aggregates","category":"Bulk Dry","dangerous":False,"temperatureRequired":False,"humidityControl":False,"ventilationRequired":False,"stackingAllowed":True,"commodityGroup":"Minerals","tradeVolume":180000000,"unitValue":25},
    {"hsCode":"8708","hsChapter":"87","name":"Auto Parts & Accessories","description":"OEM parts, aftermarket components","category":"Containerized","dangerous":False,"temperatureRequired":False,"humidityControl":False,"ventilationRequired":False,"stackingAllowed":True,"maxStackWeight":5000,"commodityGroup":"Manufactured","tradeVolume":15000000,"unitValue":800},
]

w("  // ═══════════════════════════════════════════════════════")
w("  // 3. SEED CARGO TYPES (30)")
w("  // ═══════════════════════════════════════════════════════")
w("  console.log('📦 Seeding Cargo Types...')")
w("  const cargoTypesData = [")
for ct in cargo_types:
    w(f"    {json.dumps(ct)},")
w("  ]")
w("  await db.cargoType.createMany({ data: cargoTypesData })")
w(f"  console.log(`   ✓ {len(cargo_types)} cargo types created`)")
w()

print(f"Generated carriers ({len(carriers)}), routes ({len(routes)}), cargo ({len(cargo_types)})")

# Save partial and continue with remaining models in a second pass
with open(OUTPUT, 'w') as f:
    f.write('\n'.join(lines) + '\n')

print(f"Wrote {len(lines)} lines to {OUTPUT}")
