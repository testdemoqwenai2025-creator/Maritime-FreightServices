#!/usr/bin/env python3
"""
Generate the massive seed-maritime.ts file with proliferated maritime data.
Outputs complete TypeScript with 50 ports, 20 carriers, 80 vessels, 15 routes,
30 cargo types, 80 shipments, 400+ containers, documents, events, 40 arrivals,
30 departures, 80 trade records, 20 charters, 50 bookings.
"""
import json, random, os, sys

random.seed(42)
OUT = "/home/z/my-project/scripts/seed-maritime.ts"

L = []  # output lines
def w(s=""): L.append(s)
def wj(d): w(json.dumps(d, ensure_ascii=False))
def comma_json(d): return json.dumps(d, ensure_ascii=False)

# ═══════════════════════════════════════════════════════════
# HEADER
# ═══════════════════════════════════════════════════════════
w('import { db } from \'@/lib/db\'')
w('')
w('export async function seedRichMaritimeData() {')
w("  console.log('Seeding MASSIVE Global Maritime & Freight Database...')")
w('  const t0 = Date.now()')
w('')
w('  // 0. CLEAR ALL TABLES')
w('  await db.booking.deleteMany()')
w('  await db.charter.deleteMany()')
w('  await db.tradeData.deleteMany()')
w('  await db.vesselDeparture.deleteMany()')
w('  await db.vesselArrival.deleteMany()')
w('  await db.shipmentEvent.deleteMany()')
w('  await db.shipmentDocument.deleteMany()')
w('  await db.container.deleteMany()')
w('  await db.shipment.deleteMany()')
w('  await db.vessel.deleteMany()')
w('  await db.cargoType.deleteMany()')
w('  await db.port.deleteMany()')
w('  await db.tradeRoute.deleteMany()')
w('  await db.carrier.deleteMany()')
w("  console.log('Tables cleared')")
w('')

# ═══════════════════════════════════════════════════════════
# 1. CARRIERS (20)
# ═══════════════════════════════════════════════════════════
carriers = [
  dict(name="Maersk",code="MAEU",country="Denmark",headquarters="Copenhagen",website="www.maersk.com",foundedYear=1904,fleetSize=730,totalTEUCapacity=4100000,alliance="2M",isTop20=True,isFCL=True,isLCL=True,isBreakBulk=True,isReefer=True,isDG=True,serviceRoutes="AE1,AE2,AE5,AE10,TP6,TP7,TP9",transitTimeDays=28,reliability=78.2,co2PerTeu=8.2,contactEmail="booking@maersk.com",contactPhone="+45 3363 3363",remarks="World largest container line"),
  dict(name="MSC",code="MSCU",country="Switzerland",headquarters="Geneva",website="www.msc.com",foundedYear=1970,fleetSize=830,totalTEUCapacity=5100000,alliance="Independent",isTop20=True,isFCL=True,isLCL=True,isBreakBulk=True,isReefer=True,isDG=True,serviceRoutes="ALBATROS,DRAGON,JADE,LION,PHOENIX,SILK",transitTimeDays=30,reliability=75.8,co2PerTeu=9.1,contactEmail="info@msc.com",contactPhone="+41 22 703 8888",remarks="Largest by TEU capacity"),
  dict(name="CMA CGM",code="CMDU",country="France",headquarters="Marseille",website="www.cma-cgm.com",foundedYear=1978,fleetSize=620,totalTEUCapacity=3500000,alliance="Ocean Alliance",isTop20=True,isFCL=True,isLCL=True,isBreakBulk=True,isReefer=True,isDG=True,serviceRoutes="FAL1,FAL2,FAL3,FAL5,MEX1,AAC1,AAS1",transitTimeDays=29,reliability=76.5,co2PerTeu=8.8,contactEmail="contact@cma-cgm.com",contactPhone="+33 4 88 91 90 00",remarks="French global shipping giant"),
  dict(name="COSCO Shipping",code="COSU",country="China",headquarters="Shanghai",website="www.coscoshipping.com",foundedYear=1961,fleetSize=510,totalTEUCapacity=3100000,alliance="Ocean Alliance",isTop20=True,isFCL=True,isLCL=True,isBreakBulk=False,isReefer=True,isDG=True,serviceRoutes="AAS1,AAS2,AAE1,AWE1,AWE2",transitTimeDays=27,reliability=80.1,co2PerTeu=7.5,contactEmail="cs@coscoshipping.com",contactPhone="+86 21 6596 6104",remarks="Chinese state-owned"),
  dict(name="Hapag-Lloyd",code="HLCU",country="Germany",headquarters="Hamburg",website="www.hapag-lloyd.com",foundedYear=1847,fleetSize=265,totalTEUCapacity=2000000,alliance="THE Alliance",isTop20=True,isFCL=True,isLCL=True,isBreakBulk=False,isReefer=True,isDG=True,serviceRoutes="FE1,FE2,FE3,FE4,FE5,AA1,AA2",transitTimeDays=26,reliability=82.3,co2PerTeu=7.8,contactEmail="info@hapag-lloyd.com",contactPhone="+49 40 3001 0",remarks="German legacy carrier"),
  dict(name="ONE",code="ONEY",country="Japan",headquarters="Tokyo",website="www.one-line.com",foundedYear=2017,fleetSize=240,totalTEUCapacity=1800000,alliance="THE Alliance",isTop20=True,isFCL=True,isLCL=True,isBreakBulk=False,isReefer=True,isDG=True,serviceRoutes="PS1,PS2,PS3,PS4,PS5,FE1,FE2",transitTimeDays=25,reliability=83.5,co2PerTeu=7.2,contactEmail="info@one-line.com",contactPhone="+81 3 6832 3111",remarks="K Line + MOL + NYK merger"),
  dict(name="Evergreen",code="EGLV",country="Taiwan",headquarters="Taipei",website="www.evergreen-marine.com",foundedYear=1968,fleetSize=210,totalTEUCapacity=1700000,alliance="Ocean Alliance",isTop20=True,isFCL=True,isLCL=True,isBreakBulk=False,isReefer=True,isDG=True,serviceRoutes="CES,CPN,CWA,CTN,FE2,FE3",transitTimeDays=28,reliability=77.1,co2PerTeu=8.0,contactEmail="cs@evergreen.com",contactPhone="+886 2 2505 7766",remarks="Taiwan container giant"),
  dict(name="Yang Ming",code="YMLU",country="Taiwan",headquarters="Keelung",website="www.yangming.com",foundedYear=1972,fleetSize=95,totalTEUCapacity=700000,alliance="THE Alliance",isTop20=True,isFCL=True,isLCL=True,isBreakBulk=False,isReefer=True,isDG=True,serviceRoutes="AUE,PE1,PE2,PS3,AA1",transitTimeDays=27,reliability=79.4,co2PerTeu=8.3,contactEmail="info@yangming.com",contactPhone="+886 2 2455 9988",remarks="THE Alliance member"),
  dict(name="PIL",code="PILS",country="Singapore",headquarters="Singapore",website="www.pilship.com",foundedYear=1967,fleetSize=120,totalTEUCapacity=350000,alliance="Independent",isTop20=False,isFCL=True,isLCL=True,isBreakBulk=True,isReefer=True,isDG=False,serviceRoutes="ASA,FE3,WSS,ISS,JSR",transitTimeDays=32,reliability=71.2,co2PerTeu=10.5,contactEmail="cs@pilship.com",contactPhone="+65 6277 6888",remarks="SE Asia specialist"),
  dict(name="ZIM",code="ZIMU",country="Israel",headquarters="Haifa",website="www.zim.com",foundedYear=1945,fleetSize=85,totalTEUCapacity=400000,alliance="Independent",isTop20=True,isFCL=True,isLCL=True,isBreakBulk=False,isReefer=True,isDG=True,serviceRoutes="ZCA,ZCP,ZEA,ZBA,ZSA",transitTimeDays=24,reliability=81.0,co2PerTeu=8.6,contactEmail="info@zim.com",contactPhone="+972 4 865 2111",remarks="Reefer specialist"),
  dict(name="HMM",code="HDMU",country="South Korea",headquarters="Seoul",website="www.hmm21.com",foundedYear=1976,fleetSize=78,totalTEUCapacity=820000,alliance="THE Alliance",isTop20=True,isFCL=True,isLCL=True,isBreakBulk=False,isReefer=True,isDG=True,serviceRoutes="FE3,FE4,FE5,PS1,PS2,PS3,PA1,PA2",transitTimeDays=25,reliability=84.2,co2PerTeu=7.0,contactEmail="info@hmm21.com",contactPhone="+82 2 3770 6114",remarks="Hyundai Merchant Marine"),
  dict(name="Wan Hai Lines",code="WHLC",country="Taiwan",headquarters="Taipei",website="www.wanhai.com",foundedYear=1965,fleetSize=72,totalTEUCapacity=280000,alliance="Independent",isTop20=False,isFCL=True,isLCL=True,isBreakBulk=False,isReefer=True,isDG=True,serviceRoutes="CNA,CT1,CT2,NAS,ASS",transitTimeDays=14,reliability=80.5,co2PerTeu=9.2,contactEmail="cs@wanhai.com",contactPhone="+886 2 2758 6688",remarks="Intra-Asia specialist"),
  dict(name="KMTC",code="KMTC",country="South Korea",headquarters="Seoul",website="www.kmtc.co.kr",foundedYear=1951,fleetSize=68,totalTEUCapacity=180000,alliance="Independent",isTop20=False,isFCL=True,isLCL=True,isBreakBulk=False,isReefer=False,isDG=True,serviceRoutes="KTC,ICX,JPW,JCS",transitTimeDays=10,reliability=76.8,co2PerTeu=10.1,contactEmail="info@kmtc.co.kr",contactPhone="+82 2 3770 6500",remarks="Korea Marine Transport"),
  dict(name="X-Press Feeders",code="XPFE",country="Malta",headquarters="Valletta",website="www.x-pressfeeders.com",foundedYear=2002,fleetSize=110,totalTEUCapacity=220000,alliance="Independent",isTop20=False,isFCL=True,isLCL=True,isBreakBulk=False,isReefer=False,isDG=False,serviceRoutes="EFS,NWS,ISS,BAS",transitTimeDays=8,reliability=74.3,co2PerTeu=11.2,contactEmail="ops@x-pressfeeders.com",contactPhone="+356 2133 8400",remarks="Feeder specialist"),
  dict(name="Frontline",code="FROO",country="Bermuda",headquarters="Hamilton",website="www.frontline.bm",foundedYear=1985,fleetSize=85,totalTEUCapacity=0,alliance="Independent",isTop20=False,isFCL=False,isLCL=False,isBreakBulk=False,isReefer=False,isDG=True,serviceRoutes="TD3,RT1,WAF,USGC",transitTimeDays=0,reliability=0,co2PerTeu=0,contactEmail="info@frontline.bm",contactPhone="+1 441 295 5273",remarks="Tanker giant (VLCC/Suezmax)"),
  dict(name="Grimaldi",code="GRIM",country="Italy",headquarters="Naples",website="www.grimaldi.napoli.it",foundedYear=1947,fleetSize=120,totalTEUCapacity=95000,alliance="Independent",isTop20=False,isFCL=True,isLCL=True,isBreakBulk=True,isReefer=True,isDG=True,serviceRoutes="MRS,AMS,WAF,CMR,NAS",transitTimeDays=20,reliability=73.5,co2PerTeu=11.8,contactEmail="info@grimaldi.napoli.it",contactPhone="+39 081 496 1111",remarks="Ro-Ro and short sea specialist"),
  dict(name="Matson",code="MATU",country="US",headquarters="Honolulu",website="www.matson.com",foundedYear=1882,fleetSize=22,totalTEUCapacity=45000,alliance="Independent",isTop20=False,isFCL=True,isLCL=True,isBreakBulk=True,isReefer=True,isDG=True,serviceRoutes="Hawaii,Guam,China,SSA",transitTimeDays=14,reliability=88.0,co2PerTeu=15.0,contactEmail="info@matson.com",contactPhone="+1 808 843 7000",remarks="US Pacific trade"),
  dict(name="Crowley",code="CROW",country="US",headquarters="Jacksonville",website="www.crowley.com",foundedYear=1892,fleetSize=35,totalTEUCapacity=60000,alliance="Independent",isTop20=False,isFCL=True,isLCL=True,isBreakBulk=True,isReefer=True,isDG=True,serviceRoutes="Caribbean,CentralAm,USP1",transitTimeDays=8,reliability=79.0,co2PerTeu=13.5,contactEmail="info@crowley.com",contactPhone="+1 904 353 1000",remarks="US Americas specialist"),
  dict(name="Euronav",code="EURV",country="Belgium",headquarters="Antwerp",website="www.euronav.com",foundedYear=1995,fleetSize=48,totalTEUCapacity=0,alliance="Independent",isTop20=False,isFCL=False,isLCL=False,isBreakBulk=False,isReefer=False,isDG=True,serviceRoutes="TD2,TD3,TD5,RT1",transitTimeDays=0,reliability=0,co2PerTeu=0,contactEmail="info@euronav.com",contactPhone:"+32 3 205 55 55",remarks="VLCC tanker specialist"),
  dict(name="MOL Tankers",code="MOLT",country="Japan",headquarters="Tokyo",website="www.mol.co.jp",foundedYear=1964,fleetSize=62,totalTEUCapacity=0,alliance="Independent",isTop20=False,isFCL=False,isLCL=False,isBreakBulk=False,isReefer=False,isDG=True,serviceRoutes="AG-JP,AG-US,WAF,USGC",transitTimeDays=0,reliability=0,co2PerTeu=0,contactEmail="tanker@mol.co.jp",contactPhone="+81 3 6748 3111",remarks="MOL tanker division"),
  dict(name="Star Bulk",code="STBK",country="Marshall Islands",headquarters="Marshall Islands",website="www.starbulk.com",foundedYear=1998,fleetSize=128,totalTEUCapacity=0,alliance="Independent",isTop20=False,isFCL=False,isLCL=False,isBreakBulk=False,isReefer=False,isDG=False,serviceRoutes="BRA-CHN,AUS-CHN,IND-EU,USGC",transitTimeDays=0,reliability=0,co2PerTeu=0,contactEmail="info@starbulk.com",contactPhone:"+30 210 898 4800",remarks="Dry bulk carrier specialist"),
]

w("  // ── 1. CARRIERS (20) ──")
w("  console.log('🚢 Seeding 20 carriers...')")
w("  const carriersData: any[] = [")
for c in carriers:
  w(f"    {comma_json(c)},")
w("  ]")
w("  const carriers = []")
w("  for (const c of carriersData) carriers.push(await db.carrier.create({ data: c }))")
w(f"  console.log(`   ✓ {len(carriers)} carriers`)")
w()

# ═══════════════════════════════════════════════════════════
# 2. TRADE ROUTES (15)
# ═══════════════════════════════════════════════════════════
routes = [
  dict(name="Asia-Europe (Suez)",code="AE1",originRegion="East Asia",destRegion="North Europe",originPorts="CNSHA,CNYTN,CNNGB,HKGKG,SGSIN",destPorts="NLRTM,DEHAM,BEANR,GBFXT",distanceNm=10500,avgTransitDays=30,avgFreightPerTEU=1200,majorCarriers="MAEU,CMDU,COSU,ONEY,EGLV",vesselTypes="Container",weeklyFrequency=45,seasonalPeak="Q4 Pre-Holiday",canalTransit="Suez",piracyRisk="Low",congestionIndex=55),
  dict(name="Asia-N.Am West Coast",code="TP6",originRegion="East Asia",destRegion="North America WC",originPorts="CNSHA,CNYTN,HKGKG,JPTYO,KRPUS",destPorts="USLAX,USOAK,USSEA,USVAN,CAROB",distanceNm=6000,avgTransitDays=14,avgFreightPerTEU=2800,majorCarriers="MAEU,CMDU,COSU,ONEY,EGLV",vesselTypes="Container",weeklyFrequency=38,seasonalPeak="Q3 Peak",canalTransit="None",piracyRisk="Low",congestionIndex=62),
  dict(name="Asia-N.Am East Coast",code="TP7",originRegion="East Asia",destRegion="North America EC",originPorts="CNSHA,CNYTN,HKGKG,SGSIN",destPorts="USNYC,USsav,NYSGN",distanceNm=12000,avgTransitDays=28,avgFreightPerTEU=3500,majorCarriers="MAEU,CMDU,COSU,EGLV",vesselTypes="Container",weeklyFrequency=18,seasonalPeak="Q4 Pre-Holiday",canalTransit="Panama",piracyRisk="Low",congestionIndex=58),
  dict(name="Trans-Atlantic Westbound",code="TAW",originRegion="North Europe",destRegion="North America EC",originPorts="NLRTM,DEHAM,GBFXT",destPorts="USNYC,USMSY",distanceNm=3500,avgTransitDays=10,avgFreightPerTEU=1800,majorCarriers="MAEU,HLCU,ONEY,EGLV",vesselTypes="Container",weeklyFrequency=15,seasonalPeak="Q3-Q4",canalTransit="None",piracyRisk="Low",congestionIndex=40),
  dict(name="Trans-Atlantic Eastbound",code="TAE",originRegion="North America EC",destRegion="North Europe",originPorts="USNYC,USMSY",destPorts="NLRTM,DEHAM,GBFXT",distanceNm=3500,avgTransitDays=10,avgFreightPerTEU=1100,majorCarriers="MAEU,HLCU,ONEY,EGLV",vesselTypes="Container",weeklyFrequency=15,seasonalPeak="Q1-Q2",canalTransit="None",piracyRisk="Low",congestionIndex=38),
  dict(name="Intra-Asia",code="IAX",originRegion="East/Southeast Asia",destRegion="East/Southeast Asia",originPorts="CNSHA,CNYTN,HKGKG,SGSIN,JPTYO,KRPUS",destPorts="SGSIN,MYTPP,IDJKT,VNSGN,THLCH,PNSHI",distanceNm=1800,avgTransitDays=5,avgFreightPerTEU=350,majorCarriers="WHLC,KMTC,PILS,XPFE,COSU",vesselTypes="Container,Ro-Ro",weeklyFrequency=85,seasonalPeak="Q1 Post-CNY",canalTransit="None",piracyRisk="Low",congestionIndex=45),
  dict(name="Asia-Middle East",code="AME",originRegion="East Asia",destRegion="Middle East",originPorts="CNSHA,CNYTN,HKGKG,JPTYO",destPorts="AEJEA,SAJED,AEDBX,KWKWT",distanceNm=5500,avgTransitDays=14,avgFreightPerTEU=600,majorCarriers="MAEU,CMDU,COSU,ONEY",vesselTypes="Container,Tanker",weeklyFrequency=20,seasonalPeak="Year-round",canalTransit="None",piracyRisk="Medium",congestionIndex=35),
  dict(name="Asia-Africa",code="AAF",originRegion="East Asia",destRegion="Africa",originPorts="CNSHA,CNYTN,HKGKG,SGSIN",destPorts="ZADUR,NGTIN,EGSUZ,KEMLS",distanceNm=7000,avgTransitDays=18,avgFreightPerTEU=1500,majorCarriers="MAEU,CMDU,PILS",vesselTypes="Container,Bulk",weeklyFrequency=8,seasonalPeak="Q2-Q3",canalTransit="Suez",piracyRisk="High",congestionIndex=50),
  dict(name="Europe-South America",code="ESS",originRegion="North Europe",destRegion="South America EC",originPorts="NLRTM,DEHAM,GBFXT",destPorts="BRSSZ,ARBAI,UYMVD",distanceNm=5500,avgTransitDays=16,avgFreightPerTEU=2200,majorCarriers="MAEU,HLCU,ONEY,EGLV",vesselTypes="Container",weeklyFrequency=5,seasonalPeak="Q1 Harvest",canalTransit="None",piracyRisk="Low",congestionIndex=30),
  dict(name="Europe-Africa",code="EAF",originRegion="North Europe",destRegion="West Africa",originPorts="NLRTM,DEHAM,GBFXT",destPorts="NGTIN,GHLBP,SNDKR,CMDLA",distanceNm=3000,avgTransitDays=10,avgFreightPerTEU=1900,majorCarriers="MAEU,PILS,CMDU",vesselTypes="Container,Ro-Ro",weeklyFrequency=6,seasonalPeak="Q3-Q4",canalTransit="None",piracyRisk="Low",congestionIndex=32),
  dict(name="Intra-Europe/Med",code="IEM",originRegion="North Europe",destRegion="Mediterranean",originPorts="NLRTM,DEHAM,GBFXT",destPorts="ITGOA,GRTPI,ESVLC,PTRNS,EGALD",distanceNm=2000,avgTransitDays=5,avgFreightPerTEU=400,majorCarriers="MAEU,HLCU,ONEY,GRIM",vesselTypes="Container,Ro-Ro",weeklyFrequency=55,seasonalPeak="Year-round",canalTransit="None",piracyRisk="Low",congestionIndex=42),
  dict(name="Trans-Pacific (JP-US)",code="TPC",originRegion="Japan",destRegion="North America WC",originPorts="JPTYO,JPYOK,JPNGO",destPorts="USLAX,USOAK,USSEA",distanceNm=4500,avgTransitDays=11,avgFreightPerTEU=2500,majorCarriers="ONEY,HDMU,EGLV,YMLU",vesselTypes="Container,Ro-Ro",weeklyFrequency=25,seasonalPeak="Q4",canalTransit="None",piracyRisk="Low",congestionIndex=48),
  dict(name="Oceania-Asia",code="OAX",originRegion="Australia/NZ",destRegion="East Asia",originPorts="AUSYD,AUMEL,NZAKL",destPorts="CNSHA,HKGKG,SGSIN,JPTYO",distanceNm=4500,avgTransitDays=12,avgFreightPerTEU=900,majorCarriers="MAEU,CMDU,COSU,EGLV",vesselTypes="Container,Bulk",weeklyFrequency=10,seasonalPeak="Q3-Q4",canalTransit="None",piracyRisk="Low",congestionIndex=25),
  dict(name="Caribbean-Americas",code="CAR",originRegion="North America",destRegion="Caribbean/Central Am",originPorts="USMIA,USJAX,USHOU",destPorts="PASXJ,JMKIN,DOHAI,COPAU",distanceNm=1200,avgTransitDays=4,avgFreightPerTEU=1800,majorCarriers="CROW,GRIM,ACL",vesselTypes="Container,Ro-Ro",weeklyFrequency=22,seasonalPeak="Q1-Q2",canalTransit="Panama",piracyRisk="Low",congestionIndex=28),
  dict(name="Middle East-Americas",code="MEA",originRegion="Middle East",destRegion="North America",originPorts="SAJED,AEJEA,KWKWT",destPorts="USLAX,USHOU",distanceNm=8500,avgTransitDays=22,avgFreightPerTEU=550,majorCarriers="MAEU,CMDU,ONEY",vesselTypes="Container,Tanker",weeklyFrequency=12,seasonalPeak="Year-round",canalTransit="Suez",piracyRisk="Low",congestionIndex=33),
]

w("  // ── 2. TRADE ROUTES (15) ──")
w("  console.log('🗺️  Seeding 15 trade routes...')")
w("  const tradeRoutesData: any[] = [")
for r in routes:
  w(f"    {comma_json(r)},")
w("  ]")
w("  const tradeRoutes = []")
w("  for (const r of tradeRoutesData) tradeRoutes.push(await db.tradeRoute.create({ data: r }))")
w(f"  console.log(`   ✓ {len(routes)} routes`)")
w()

# ═══════════════════════════════════════════════════════════
# 3. CARGO TYPES (30)
# ═══════════════════════════════════════════════════════════
cargo_types = [
  dict(hsCode="8471",hsChapter="84",name="Computers & Electronics",description="Desktops, laptops, servers, peripherals",category="Containerized",dangerous=False,temperatureRequired=False,humidityControl=False,ventilationRequired=False,stackingAllowed=True,commodityGroup="Manufactured",tradeVolume=45000000,unitValue=8500),
  dict(hsCode="8542",hsChapter="85",name="Semiconductors",description="ICs, microprocessors, wafers",category="Containerized",dangerous=False,temperatureRequired=False,humidityControl=True,ventilationRequired=False,stackingAllowed=True,maxStackWeight=500,commodityGroup="Manufactured",tradeVolume=18000000,unitValue=420000),
  dict(hsCode="8703",hsChapter="87",name="Motor Vehicles",description="Passenger cars, SUVs, sedans",category="Break Bulk",dangerous=False,temperatureRequired=False,humidityControl=False,ventilationRequired=False,stackingAllowed=False,commodityGroup="Manufactured",tradeVolume=65000000,unitValue=3200),
  dict(hsCode="6108",hsChapter="61",name="Textiles & Garments",description="Cotton shirts, knitwear",category="Containerized",dangerous=False,temperatureRequired=False,humidityControl=False,ventilationRequired=False,stackingAllowed=True,commodityGroup="Manufactured",tradeVolume=32000000,unitValue=12),
  dict(hsCode="1006",hsChapter="10",name="Rice",description="Milled, semi-milled rice",category="Bulk Dry",dangerous=False,temperatureRequired=False,humidityControl=False,ventilationRequired=True,stackingAllowed=True,commodityGroup="Agriculture",tradeVolume=48000000,unitValue=450),
  dict(hsCode="2709",hsChapter="27",name="Crude Petroleum",description="Crude oil blends",category="Bulk Liquid",dangerous=True,dgClass="Class 3",temperatureRequired=False,humidityControl=False,ventilationRequired=False,stackingAllowed=False,commodityGroup="Energy",tradeVolume=2800000000,unitValue=520),
  dict(hsCode="2711",hsChapter="27",name="LNG & LPG",description="Liquefied natural/petroleum gas",category="Bulk Liquid",dangerous=True,dgClass="Class 2.1",temperatureRequired=True,tempRange="-162°C (LNG), -42°C (LPG)",humidityControl=False,ventilationRequired=False,stackingAllowed=False,commodityGroup="Energy",tradeVolume=380000000,unitValue=480),
  dict(hsCode="2601",hsChapter="26",name="Iron Ore",description="Hematite, magnetite concentrates",category="Bulk Dry",dangerous=False,temperatureRequired=False,humidityControl=False,ventilationRequired=False,stackingAllowed=True,commodityGroup="Minerals",tradeVolume=2500000000,unitValue=95),
  dict(hsCode="2804",hsChapter="28",name="Coal (Bituminous)",description="Thermal and coking coal",category="Bulk Dry",dangerous=False,temperatureRequired=False,humidityControl=False,ventilationRequired=True,stackingAllowed=True,commodityGroup="Energy",tradeVolume=1200000000,unitValue=110),
  dict(hsCode="3105",hsChapter="31",name="Fertilizers",description="NPK, urea, potash blends",category="Bulk Dry",dangerous=False,temperatureRequired=False,humidityControl=False,ventilationRequired=False,stackingAllowed=True,commodityGroup="Agriculture",tradeVolume=180000000,unitValue=320),
  dict(hsCode="7207",hsChapter="72",name="Steel Products",description="Hot-rolled coils, billets, slabs",category="Break Bulk",dangerous=False,temperatureRequired=False,humidityControl=False,ventilationRequired=False,stackingAllowed=True,maxStackWeight=25000,commodityGroup="Manufactured",tradeVolume=95000000,unitValue=650),
  dict(hsCode="0203",hsChapter="02",name="Frozen Meat",description="Beef, pork, poultry frozen",category="Reefer",dangerous=False,temperatureRequired=True,tempRange="-18°C to -25°C",humidityControl=False,ventilationRequired=False,stackingAllowed=True,commodityGroup="Agriculture",tradeVolume=22000000,unitValue=3500),
  dict(hsCode="0304",hsChapter="03",name="Frozen Fish",description="Fillets, whole frozen fish",category="Reefer",dangerous=False,temperatureRequired=True,tempRange="-18°C to -25°C",humidityControl=False,ventilationRequired=False,stackingAllowed=True,commodityGroup="Agriculture",tradeVolume=28000000,unitValue=2800),
  dict(hsCode="0405",hsChapter="04",name="Dairy Products",description="Butter, cheese, milk powder",category="Reefer",dangerous=False,temperatureRequired=True,tempRange="0°C to 8°C",humidityControl=False,ventilationRequired=False,stackingAllowed=True,commodityGroup="Agriculture",tradeVolume=15000000,unitValue=2200),
  dict(hsCode="2204",hsChapter="22",name="Wine",description="Still wine in bulk/bottles",category="Containerized",dangerous=False,temperatureRequired=True,tempRange="10°C to 18°C",humidityControl=True,ventilationRequired=False,stackingAllowed=True,commodityGroup="Agriculture",tradeVolume=12000000,unitValue=1800),
  dict(hsCode="3004",hsChapter="30",name="Pharmaceuticals",description="Medicaments packed form",category="Containerized",dangerous=False,temperatureRequired=True,tempRange="2°C to 8°C",humidityControl=True,ventilationRequired=False,stackingAllowed=True,maxStackWeight=800,commodityGroup="Manufactured",tradeVolume=8000000,unitValue=28000),
  dict(hsCode="3304",hsChapter="33",name="Cosmetics",description="Beauty products, skincare",category="Containerized",dangerous=False,temperatureRequired=False,humidityControl=False,ventilationRequired=False,stackingAllowed=True,commodityGroup="Manufactured",tradeVolume=9500000,unitValue=1500),
  dict(hsCode="9403",hsChapter="94",name="Furniture",description="Wooden, metal furniture",category="Containerized",dangerous=False,temperatureRequired=False,humidityControl=False,ventilationRequired=False,stackingAllowed=True,maxStackWeight=2000,commodityGroup="Manufactured",tradeVolume=35000000,unitValue=250),
  dict(hsCode="9503",hsChapter="95",name="Toys & Games",description="Plastic toys, board games",category="Containerized",dangerous=False,temperatureRequired=False,humidityControl=False,ventilationRequired=False,stackingAllowed=True,commodityGroup="Manufactured",tradeVolume=18000000,unitValue=35),
  dict(hsCode="4407",hsChapter="44",name="Timber & Wood",description="Sawn wood, plywood",category="Break Bulk",dangerous=False,temperatureRequired=False,humidityControl=False,ventilationRequired=True,stackingAllowed=True,commodityGroup="Agriculture",tradeVolume=45000000,unitValue=380),
  dict(hsCode="0901",hsChapter="09",name="Coffee",description="Green/roasted coffee beans",category="Bulk Dry",dangerous=False,temperatureRequired=False,humidityControl=True,ventilationRequired=True,stackingAllowed=True,commodityGroup="Agriculture",tradeVolume=10000000,unitValue=4200),
  dict(hsCode="4001",hsChapter="40",name="Natural Rubber",description="Latex, RSS, TSR rubber",category="Bulk Dry",dangerous=False,temperatureRequired=False,humidityControl=False,ventilationRequired=False,stackingAllowed=True,commodityGroup="Agriculture",tradeVolume=14000000,unitValue=1500),
  dict(hsCode="1511",hsChapter="15",name="Palm Oil",description="Crude and refined palm oil",category="Bulk Liquid",dangerous=False,temperatureRequired=True,tempRange="25°C to 32°C",humidityControl=False,ventilationRequired=False,stackingAllowed=False,commodityGroup="Agriculture",tradeVolume=75000000,unitValue=950),
  dict(hsCode="8411",hsChapter="84",name="Turbojets",description="Aircraft engines, gas turbines",category="Break Bulk",dangerous=False,temperatureRequired=False,humidityControl=False,ventilationRequired=False,stackingAllowed=False,maxStackWeight=5000,commodityGroup="Manufactured",tradeVolume=500000,unitValue=850000),
  dict(hsCode="8429",hsChapter="84",name="Machinery & Equipment",description="Excavators, loaders, cranes",category="Break Bulk",dangerous=False,temperatureRequired=False,humidityControl=False,ventilationRequired=False,stackingAllowed=True,maxStackWeight=30000,commodityGroup="Manufactured",tradeVolume=12000000,unitValue=45000),
  dict(hsCode="8481",hsChapter="84",name="Industrial Valves",description="Valves, elbows, pipe fittings",category="Containerized",dangerous=False,temperatureRequired=False,humidityControl=False,ventilationRequired=False,stackingAllowed=True,maxStackWeight=8000,commodityGroup="Manufactured",tradeVolume=6000000,unitValue=1200),
  dict(hsCode="2523",hsChapter="25",name="Cement & Clinker",description="Portland cement, clinker",category="Bulk Dry",dangerous=False,temperatureRequired=False,humidityControl=False,ventilationRequired=False,stackingAllowed=True,commodityGroup="Minerals",tradeVolume=420000000,unitValue=85),
  dict(hsCode="2517",hsChapter="25",name="Construction Aggregates",description="Sand, gravel, crushed stone",category="Bulk Dry",dangerous=False,temperatureRequired=False,humidityControl=False,ventilationRequired=False,stackingAllowed=True,commodityGroup="Minerals",tradeVolume=180000000,unitValue=25),
  dict(hsCode="8708",hsChapter="87",name="Auto Parts",description="OEM and aftermarket parts",category="Containerized",dangerous=False,temperatureRequired=False,humidityControl=False,ventilationRequired=False,stackingAllowed=True,maxStackWeight=5000,commodityGroup="Manufactured",tradeVolume=15000000,unitValue=800),
  dict(hsCode="5201",hsChapter="52",name="Raw Cotton",description="Cotton not carded or combed",category="Bulk Dry",dangerous=False,temperatureRequired=False,humidityControl=True,ventilationRequired=True,stackingAllowed=True,commodityGroup="Agriculture",tradeVolume=9500000,unitValue=2100),
  dict(hsCode="7601",hsChapter="76",name="Aluminium Ingots",description="Unwrought aluminium",category="Break Bulk",dangerous=False,temperatureRequired=False,humidityControl=False,ventilationRequired=False,stackingAllowed=True,maxStackWeight=15000,commodityGroup="Minerals",tradeVolume=32000000,unitValue=2400),
]

w("  // ── 3. CARGO TYPES (30) ──")
w("  console.log('📦 Seeding 30 cargo types...')")
w("  const cargoTypesData: any[] = [")
for ct in cargo_types:
  w(f"    {comma_json(ct)},")
w("  ]")
w("  await db.cargoType.createMany({ data: cargoTypesData })")
w(f"  console.log(`   ✓ {len(cargo_types)} cargo types`)")
w()

print(f"Phase 1: carriers={len(carriers)}, routes={len(routes)}, cargo={len(cargo_types)}")

# ═══════════════════════════════════════════════════════════
# 4. PORTS (50)
# ═══════════════════════════════════════════════════════════
ports = [
  dict(name="Shanghai",countryCode="CN",region="East Asia",latitude=31.2304,longitude=121.4737,unlocode="CNSHA",portType="Seaport",harborSize="Very Large",depth=16.5,cargoTypes="Container, Bulk, Liquid",tidalRange=3.0,timezone="Asia/Shanghai",population=24870000,totalArea=6340.5,annualTEU=47000000,annualDWT=750000000,maxVesselDWT=400000,berthCount=620,craneCount=850,pilotage="Compulsory",tugsAvailable=120,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=True,warehouseSpace=2500000,coldStorage=True,hazardousHandling="Full IMDG",congestionLevel="Medium",avgWaitHours=18,avgStayHours=48,owner="SIPG",operator="SIPG",website="www.portshanghai.com.cn"),
  dict(name="Singapore",countryCode="SG",region="Southeast Asia",latitude=1.3521,longitude=103.8198,unlocode="SGSIN",portType="Seaport",harborSize="Very Large",depth=22.0,cargoTypes="Container, Bunkering, Liquid",tidalRange=2.5,timezone="Asia/Singapore",population=5850000,totalArea=733.1,annualTEU=39500000,annualDWT=620000000,maxVesselDWT=350000,berthCount=210,craneCount=310,pilotage="Compulsory",tugsAvailable=85,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=True,warehouseSpace=1800000,coldStorage=True,hazardousHandling="Full IMDG",congestionLevel="Low",avgWaitHours=8,avgStayHours=24,owner="PSA International",operator="PSA Singapore",website="www.portofsingapore.com"),
  dict(name="Shenzhen",countryCode="CN",region="East Asia",latitude=22.5431,longitude=114.0579,unlocode="CNSZX",portType="Seaport",harborSize="Very Large",depth=18.0,cargoTypes="Container, Bulk, Ro-Ro",tidalRange=2.8,timezone="Asia/Shanghai",population=17560000,totalArea=1997.5,annualTEU=32500000,annualDWT=520000000,maxVesselDWT=220000,berthCount=240,craneCount=380,pilotage="Compulsory",tugsAvailable=65,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=True,warehouseSpace=1200000,coldStorage=True,hazardousHandling="Full IMDG",congestionLevel="Medium",avgWaitHours=14,avgStayHours=36,owner="Shenzhen Port Group",operator="Yantian/Shekou/Chiwan",website="www.szport.com"),
  dict(name="Ningbo-Zhoushan",countryCode="CN",region="East Asia",latitude=29.8683,longitude=121.544,unlocode="CNNGB",portType="Seaport",harborSize="Very Large",depth=17.5,cargoTypes="Container, Bulk, Liquid",tidalRange=3.5,timezone="Asia/Shanghai",population=8900000,totalArea=9816.0,annualTEU=35300000,annualDWT=1100000000,maxVesselDWT=400000,berthCount=350,craneCount=520,pilotage="Compulsory",tugsAvailable=90,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=True,warehouseSpace=2100000,coldStorage=True,hazardousHandling="Full IMDG",congestionLevel="Low",avgWaitHours=10,avgStayHours=42,owner="Ningbo Port Group",operator="NBCT",website="www.nbport.com.cn"),
  dict(name="Busan",countryCode="KR",region="East Asia",latitude=35.1796,longitude=129.0756,unlocode="KRPUS",portType="Seaport",harborSize="Very Large",depth=16.0,cargoTypes="Container, Bulk, Ro-Ro",tidalRange=1.5,timezone="Asia/Seoul",population=3400000,totalArea=770.0,annualTEU=23500000,annualDWT=380000000,maxVesselDWT=200000,berthCount=185,craneCount=290,pilotage="Compulsory",tugsAvailable=55,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=True,warehouseSpace=950000,coldStorage=True,hazardousHandling="Full IMDG",congestionLevel="Low",avgWaitHours=8,avgStayHours=28,owner="Busan Port Authority",operator="BPA",website="www.busanpa.com"),
  dict(name="Qingdao",countryCode="CN",region="East Asia",latitude=36.0671,longitude=120.3826,unlocode="CNTAO",portType="Seaport",harborSize="Very Large",depth=15.5,cargoTypes="Container, Bulk, Liquid",tidalRange=4.0,timezone="Asia/Shanghai",population=9500000,totalArea=11293.0,annualTEU=26500000,annualDWT=620000000,maxVesselDWT=300000,berthCount=180,craneCount=260,pilotage="Compulsory",tugsAvailable=48,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=True,warehouseSpace=1500000,coldStorage=True,hazardousHandling="Full IMDG",congestionLevel="Low",avgWaitHours=10,avgStayHours=32,owner="Qingdao Port Group",operator="QPC",website="www.qdport.com"),
  dict(name="Guangzhou",countryCode="CN",region="East Asia",latitude=23.1291,longitude=113.2644,unlocode="CNGZG",portType="Seaport",harborSize="Very Large",depth=15.0,cargoTypes="Container, Bulk, Ro-Ro",tidalRange=2.0,timezone="Asia/Shanghai",population=18680000,totalArea=7434.0,annualTEU=24200000,annualDWT=450000000,maxVesselDWT=180000,berthCount=260,craneCount=320,pilotage="Compulsory",tugsAvailable=52,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=True,warehouseSpace=1100000,coldStorage=True,hazardousHandling="Full IMDG",congestionLevel="Medium",avgWaitHours=16,avgStayHours=34,owner="Guangzhou Port Group",operator="GZPG",website="www.gzport.com"),
  dict(name="Tianjin",countryCode="CN",region="East Asia",latitude=38.9836,longitude=117.7447,unlocode="CNTJN",portType="Seaport",harborSize="Very Large",depth=18.0,cargoTypes="Container, Bulk, Liquid, Ro-Ro",tidalRange=3.2,timezone="Asia/Shanghai",population=13700000,totalArea=11917.0,annualTEU=21000000,annualDWT=580000000,maxVesselDWT=300000,berthCount=175,craneCount=240,pilotage="Compulsory",tugsAvailable=42,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=True,warehouseSpace=1300000,coldStorage=True,hazardousHandling="Full IMDG",congestionLevel="Medium",avgWaitHours=12,avgStayHours=38,owner="Tianjin Port Group",operator="TPG",website="www.tjport.com"),
  dict(name="Rotterdam",countryCode="NL",region="North Europe",latitude=51.9244,longitude=4.4777,unlocode="NLRTM",portType="Seaport",harborSize="Very Large",depth=24.0,cargoTypes="Container, Bulk, Liquid, Ro-Ro",tidalRange=2.0,timezone="Europe/Amsterdam",population=650000,totalArea=319.0,annualTEU=14500000,annualDWT=470000000,maxVesselDWT=400000,berthCount=165,craneCount=220,pilotage="Compulsory",tugsAvailable=38,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=True,warehouseSpace=2800000,coldStorage=True,hazardousHandling="Full IMDG",congestionLevel="Low",avgWaitHours=6,avgStayHours=22,owner="Port of Rotterdam Authority",operator="PoR",website="www.portofrotterdam.com"),
  dict(name="Hamburg",countryCode="DE",region="North Europe",latitude=53.5511,longitude=9.9937,unlocode="DEHAM",portType="Seaport",harborSize="Very Large",depth=16.5,cargoTypes="Container, Bulk, Ro-Ro",tidalRange=3.6,timezone="Europe/Berlin",population=1850000,totalArea=755.0,annualTEU=8700000,annualDWT=140000000,maxVesselDWT=200000,berthCount=130,craneCount=185,pilotage="Compulsory",tugsAvailable=22,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=True,warehouseSpace=950000,coldStorage=True,hazardousHandling="Full IMDG",congestionLevel="Low",avgWaitHours=8,avgStayHours=24,owner="Hamburger Hafen und Logistik",operator="HHLA",website="www.hafen-hamburg.de"),
  dict(name="Antwerp-Bruges",countryCode="BE",region="North Europe",latitude=51.2194,longitude=4.4025,unlocode="BEANR",portType="Seaport",harborSize="Very Large",depth=17.0,cargoTypes="Container, Bulk, Liquid, Ro-Ro",tidalRange=5.0,timezone="Europe/Brussels",population=520000,totalArea=204.0,annualTEU=13800000,annualDWT=250000000,maxVesselDWT=250000,berthCount=105,craneCount=165,pilotage="Compulsory",tugsAvailable=18,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=True,warehouseSpace=680000,coldStorage=True,hazardousHandling="Full IMDG",congestionLevel="Low",avgWaitHours=7,avgStayHours=20,owner="Port of Antwerp-Bruges",operator="PA",website="www.portofantwerpbruges.be"),
  dict(name="Jebel Ali (Dubai)",countryCode="AE",region="Middle East",latitude=25.0196,longitude=55.0816,unlocode="AEJEA",portType="Seaport",harborSize="Very Large",depth=17.0,cargoTypes="Container, Bulk, Liquid, Ro-Ro",tidalRange=1.2,timezone="Asia/Dubai",population=3500000,totalArea=4114.0,annualTEU=14500000,annualDWT=320000000,maxVesselDWT=250000,berthCount=115,craneCount=170,pilotage="Compulsory",tugsAvailable=25,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=True,warehouseSpace=850000,coldStorage=True,hazardousHandling="Full IMDG",congestionLevel="Low",avgWaitHours=6,avgStayHours=22,owner="DP World",operator="DP World UAE",website="www.dpworld.com"),
  dict(name="Los Angeles",countryCode="US",region="North America",latitude=33.9425,longitude=-118.408,unlocode="USLAX",portType="Seaport",harborSize="Very Large",depth=16.0,cargoTypes="Container, Break Bulk, Ro-Ro",tidalRange=1.8,timezone="America/Los_Angeles",population=3900000,totalArea=1302.0,annualTEU=9630000,annualDWT=180000000,maxVesselDWT=220000,berthCount=95,craneCount=140,pilotage="Compulsory",tugsAvailable=16,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=True,warehouseSpace=520000,coldStorage=True,hazardousHandling="Full IMDG",congestionLevel="High",avgWaitHours=48,avgStayHours=36,owner="City of Los Angeles",operator="LA Port Police/Operations",website="www.portla.org"),
  dict(name="Long Beach",countryCode="US",region="North America",latitude=33.7833,longitude=-118.1896,unlocode="USLGB",portType="Seaport",harborSize="Very Large",depth=16.5,cargoTypes="Container, Break Bulk",tidalRange=1.8,timezone="America/Los_Angeles",population=470000,totalArea=133.0,annualTEU=9400000,annualDWT=160000000,maxVesselDWT=220000,berthCount=80,craneCount=125,pilotage="Compulsory",tugsAvailable=14,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=True,warehouseSpace=380000,coldStorage=True,hazardousHandling="Full IMDG",congestionLevel="High",avgWaitHours=42,avgStayHours=30,owner="City of Long Beach",operator="POLB",website="www.polb.com"),
  dict(name="New York/New Jersey",countryCode="US",region="North America",latitude=40.6892,longitude=-74.0445,unlocode="USNYC",portType="Seaport",harborSize="Very Large",depth=15.5,cargoTypes="Container, Break Bulk, Ro-Ro",tidalRange=1.6,timezone="America/New_York",population=8300000,totalArea=783.0,annualTEU=8300000,annualDWT=150000000,maxVesselDWT=180000,berthCount=85,craneCount=110,pilotage="Compulsory",tugsAvailable=20,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=True,warehouseSpace=420000,coldStorage=True,hazardousHandling="Full IMDG",congestionLevel="Medium",avgWaitHours=18,avgStayHours=28,owner="Port Authority NY/NJ",operator="PANYNJ",website="www.panynj.gov"),
  dict(name="Savannah",countryCode="US",region="North America",latitude=32.0835,longitude=-81.0998,unlocode="USSAV",portType="Seaport",harborSize="Large",depth=14.5,cargoTypes="Container, Break Bulk, Ro-Ro",tidalRange=2.4,timezone="America/New_York",population=150000,totalArea=202.0,annualTEU=5600000,annualDWT=85000000,maxVesselDWT=140000,berthCount=48,craneCount=78,pilotage="Compulsory",tugsAvailable=8,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=False,warehouseSpace=280000,coldStorage=True,hazardousHandling="Full IMDG",congestionLevel="Medium",avgWaitHours=14,avgStayHours=22,owner="Georgia Ports Authority",operator="GPA",website="www.gaports.com"),
  dict(name="Tokyo",countryCode="JP",region="East Asia",latitude=35.6762,longitude=139.6503,unlocode="JPTYO",portType="Seaport",harborSize="Very Large",depth=15.0,cargoTypes="Container, Bulk, Ro-Ro",tidalRange=2.0,timezone="Asia/Tokyo",population=13960000,totalArea=2194.0,annualTEU=5200000,annualDWT=95000000,maxVesselDWT=120000,berthCount=120,craneCount=175,pilotage="Compulsory",tugsAvailable=30,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=True,warehouseSpace=650000,coldStorage=True,hazardousHandling="Full IMDG",congestionLevel="Low",avgWaitHours=6,avgStayHours=18,owner="Port of Tokyo",operator="Tokyo Metropolitan Government",website="www.tokyo-port.or.jp"),
  dict(name="Yokohama",countryCode="JP",region="East Asia",latitude=35.4437,longitude=139.638,unlocode="JPYOK",portType="Seaport",harborSize="Very Large",depth=16.0,cargoTypes="Container, Bulk, Ro-Ro",tidalRange=1.8,timezone="Asia/Tokyo",population=3760000,totalArea=437.0,annualTEU=2800000,annualDWT=62000000,maxVesselDWT=140000,berthCount=85,craneCount=120,pilotage="Compulsory",tugsAvailable=18,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=True,warehouseSpace=420000,coldStorage=True,hazardousHandling="Full IMDG",congestionLevel="Low",avgWaitHours=5,avgStayHours=16,owner="City of Yokohama",operator="Yokohama Port Authority",website="www.city.yokohama.jp"),
  dict(name="Kaohsiung",countryCode="TW",region="East Asia",latitude=22.6273,longitude=120.3014,unlocode="TWKHH",portType="Seaport",harborSize="Very Large",depth=16.0,cargoTypes="Container, Bulk",tidalRange=0.9,timezone="Asia/Taipei",population=2770000,totalArea=2952.0,annualTEU=9600000,annualDWT=160000000,maxVesselDWT=220000,berthCount=110,craneCount=155,pilotage="Compulsory",tugsAvailable=28,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=True,warehouseSpace=580000,coldStorage=True,hazardousHandling="Full IMDG",congestionLevel="Low",avgWaitHours=7,avgStayHours=20,owner="Kaohsiung Harbor Bureau",operator="Taiwan Intl Ports Corp",website="www.khb.gov.tw"),
  dict(name="Port Klang",countryCode="MY",region="Southeast Asia",latitude=3.0,longitude=101.4,unlocode="MYPKG",portType="Seaport",harborSize="Very Large",depth=16.5,cargoTypes="Container, Bulk, Liquid",tidalRange=4.2,timezone="Asia/Kuala_Lumpur",population=1700000,totalArea=1288.0,annualTEU=13200000,annualDWT=280000000,maxVesselDWT=250000,berthCount=95,craneCount=145,pilotage="Compulsory",tugsAvailable=20,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=True,warehouseSpace=450000,coldStorage=True,hazardousHandling="Full IMDG",congestionLevel="Low",avgWaitHours=6,avgStayHours=18,owner="Port Klang Authority",operator="Northport/Westports",website="www.pka.gov.my"),
  dict(name="Tanjung Pelepas",countryCode="MY",region="Southeast Asia",latitude=1.358,longitude=103.545,unlocode="MYTPP",portType="Seaport",harborSize="Very Large",depth=18.0,cargoTypes="Container",tidalRange=3.8,timezone="Asia/Kuala_Lumpur",population=800000,totalArea=500.0,annualTEU=9500000,annualDWT=180000000,maxVesselDWT=250000,berthCount=65,craneCount=100,pilotage="Compulsory",tugsAvailable=12,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=False,warehouseSpace=280000,coldStorage=True,hazardousHandling="Full IMDG",congestionLevel="Low",avgWaitHours=5,avgStayHours=16,owner="MMC Corp",operator="PTP",website="www.ptp.com.my"),
  dict(name="Jakarta (Tanjung Priok)",countryCode="ID",region="Southeast Asia",latitude=-6.1,longitude=106.85,unlocode="IDJKT",portType="Seaport",harborSize="Very Large",depth=14.0,cargoTypes="Container, Bulk, Liquid",tidalRange=1.2,timezone="Asia/Jakarta",population=10560000,totalArea=661.5,annualTEU=7800000,annualDWT=350000000,maxVesselDWT=150000,berthCount=75,craneCount=95,pilotage="Compulsory",tugsAvailable=15,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=True,warehouseSpace=380000,coldStorage=True,hazardousHandling="Class 1-9",congestionLevel="High",avgWaitHours=36,avgStayHours=42,owner="Pelindo II",operator="IPC",website="www.pelindo.co.id"),
  dict(name="Mumbai (JNPT)",countryCode="IN",region="South Asia",latitude=18.95,longitude=72.84,unlocode="INNSA",portType="Seaport",harborSize="Very Large",depth=14.5,cargoTypes="Container, Bulk, Liquid",tidalRange=4.5,timezone="Asia/Kolkata",population=20670000,totalArea=603.0,annualTEU=6300000,annualDWT=180000000,maxVesselDWT=150000,berthCount=55,craneCount=82,pilotage="Compulsory",tugsAvailable=12,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=True,warehouseSpace=320000,coldStorage=True,hazardousHandling="Full IMDG",congestionLevel="High",avgWaitHours=48,avgStayHours=52,owner="JNPT",operator="JNPT Authority",website="www.jnport.gov.in"),
  dict(name="Colombo",countryCode="LK",region="South Asia",latitude=6.9271,longitude=79.8612,unlocode="LKCMB",portType="Seaport",harborSize="Very Large",depth=20.0,cargoTypes="Container, Bulk, Liquid, Bunkering",tidalRange=0.8,timezone="Asia/Colombo",population=750000,totalArea=37.0,annualTEU=7200000,annualDWT=150000000,maxVesselDWT=240000,berthCount=52,craneCount=78,pilotage="Compulsory",tugsAvailable=10,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=True,warehouseSpace=250000,coldStorage=True,hazardousHandling="Full IMDG",congestionLevel="Low",avgWaitHours=5,avgStayHours=16,owner="SLPA",operator="SLPA/CMA Terminals",website="www.srilankanports.gov.lk"),
  dict(name="Lagos (Tin Can)",countryCode="NG",region="West Africa",latitude=6.44,longitude=3.39,unlocode="NGTIN",portType="Seaport",harborSize="Large",depth=13.5,cargoTypes="Container, Bulk, Liquid",tidalRange=1.2,timezone="Africa/Lagos",population=15000000,totalArea=1171.0,annualTEU=1200000,annualDWT=45000000,maxVesselDWT=80000,berthCount=28,craneCount=32,pilotage="Compulsory",tugsAvailable=6,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=False,warehouseSpace=120000,coldStorage=False,hazardousHandling="Class 1-5",congestionLevel="Critical",avgWaitHours=96,avgStayHours=72,owner="Nigerian Ports Authority",operator="NPA",website="www.nigerianports.gov.ng"),
  dict(name="Durban",countryCode="ZA",region="Southern Africa",latitude=-29.8579,longitude=31.0218,unlocode="ZADUR",portType="Seaport",harborSize="Very Large",depth=15.0,cargoTypes="Container, Bulk, Liquid, Ro-Ro",tidalRange=2.0,timezone="Africa/Johannesburg",population=3600000,totalArea=2292.0,annualTEU=2900000,annualDWT=95000000,maxVesselDWT=200000,berthCount=58,craneCount=65,pilotage="Compulsory",tugsAvailable=8,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=True,warehouseSpace=180000,coldStorage=True,hazardousHandling="Full IMDG",congestionLevel="Medium",avgWaitHours=24,avgStayHours=38,owner="Transnet",operator="TNPA",website="www.transnet.net"),
  dict(name="Tanger Med",countryCode="MA",region="North Africa",latitude=35.7873,longitude=-5.7833,unlocode="MATNG",portType="Seaport",harborSize="Very Large",depth=18.0,cargoTypes="Container, Ro-Ro",tidalRange=2.5,timezone="Africa/Casablanca",population=450000,totalArea=120.0,annualTEU=5600000,annualDWT=85000000,maxVesselDWT=250000,berthCount=42,craneCount=68,pilotage="Compulsory",tugsAvailable=10,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=True,warehouseSpace=250000,coldStorage=True,hazardousHandling="Full IMDG",congestionLevel="Low",avgWaitHours=4,avgStayHours=12,owner="Tanger Med SA",operator="TMSA",website="www.tangermed.ma"),
  dict(name="Mombasa",countryCode="KE",region="East Africa",latitude=-4.0435,longitude=39.6682,unlocode="KEMSA",portType="Seaport",harborSize="Large",depth=15.0,cargoTypes="Container, Bulk, Liquid",tidalRange=3.8,timezone="Africa/Nairobi",population=1200000,totalArea=212.0,annualTEU=1400000,annualDWT=32000000,maxVesselDWT=100000,berthCount=22,craneCount=18,pilotage="Compulsory",tugsAvailable=5,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=False,warehouseSpace=85000,coldStorage=False,hazardousHandling="Class 1-6",congestionLevel="Medium",avgWaitHours=18,avgStayHours=28,owner="Kenya Ports Authority",operator="KPA",website="www.kpa.co.ke"),
  dict(name="Jeddah",countryCode="SA",region="Middle East",latitude=21.4858,longitude=39.1925,unlocode="SAJED",portType="Seaport",harborSize="Very Large",depth=16.0,cargoTypes="Container, Bulk, Liquid, Ro-Ro",tidalRange=0.3,timezone="Asia/Riyadh",population=4700000,totalArea=1600.0,annualTEU=5100000,annualDWT=120000000,maxVesselDWT=200000,berthCount=62,craneCount=85,pilotage="Compulsory",tugsAvailable=14,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=True,warehouseSpace=350000,coldStorage=True,hazardousHandling="Full IMDG",congestionLevel="Medium",avgWaitHours=12,avgStayHours=24,owner="Saudi Ports Authority",operator="Mawani",website="www.ports.gov.sa"),
  dict(name="Santos",countryCode="BR",region="South America",latitude=-23.9608,longitude=-46.3336,unlocode="BRSSZ",portType="Seaport",harborSize="Very Large",depth=15.0,cargoTypes="Container, Bulk, Liquid",tidalRange=1.2,timezone="America/Sao_Paulo",population=430000,totalArea=152.0,annualTEU=2300000,annualDWT=180000000,maxVesselDWT=200000,berthCount=65,craneCount=48,pilotage="Compulsory",tugsAvailable=8,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=True,warehouseSpace=200000,coldStorage=True,hazardousHandling="Full IMDG",congestionLevel="Medium",avgWaitHours=14,avgStayHours=32,owner="Codesp",operator="Codesp/Embraport",website="www.codesp.com.br"),
  dict(name="Sydney",countryCode="AU",region="Oceania",latitude=-33.8688,longitude=151.2093,unlocode="AUSYD",portType="Seaport",harborSize="Large",depth=13.5,cargoTypes="Container, Bulk, Liquid, Ro-Ro",tidalRange=1.8,timezone="Australia/Sydney",population=5300000,totalArea=12368.0,annualTEU=2800000,annualDWT=65000000,maxVesselDWT=120000,berthCount=45,craneCount=55,pilotage="Compulsory",tugsAvailable=8,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=True,warehouseSpace=180000,coldStorage=True,hazardousHandling="Full IMDG",congestionLevel="Low",avgWaitHours=6,avgStayHours=18,owner="NSW Ports",operator="Port Authority of NSW",website="www.nswports.com.au"),
  dict(name="Melbourne",countryCode="AU",region="Oceania",latitude=-37.8136,longitude=144.9631,unlocode="AUMEL",portType="Seaport",harborSize="Large",depth=14.5,cargoTypes="Container, Bulk, Liquid, Ro-Ro",tidalRange=0.6,timezone="Australia/Melbourne",population=5100000,totalArea=9993.0,annualTEU=3100000,annualDWT=72000000,maxVesselDWT=140000,berthCount=38,craneCount=50,pilotage="Compulsory",tugsAvailable=7,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=True,warehouseSpace=150000,coldStorage=True,hazardousHandling="Full IMDG",congestionLevel="Low",avgWaitHours=5,avgStayHours=16,owner="Port of Melbourne",operator="PoM",website="www.portofmelbourne.com"),
  dict(name="Auckland",countryCode="NZ",region="Oceania",latitude=-36.8485,longitude=174.7633,unlocode="NZAKL",portType="Seaport",harborSize="Medium",depth=12.5,cargoTypes="Container, Bulk, Ro-Ro",tidalRange=2.8,timezone="Pacific/Auckland",population=1700000,totalArea=1086.0,annualTEU=1100000,annualDWT=22000000,maxVesselDWT=80000,berthCount=22,craneCount=28,pilotage="Compulsory",tugsAvailable=4,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=True,warehouseSpace=75000,coldStorage=True,hazardousHandling="Full IMDG",congestionLevel="Low",avgWaitHours=4,avgStayHours=14,owner="Ports of Auckland",operator="PoAL",website="www.poal.co.nz"),
  dict(name="Felixstowe",countryCode="GB",region="North Europe",latitude=51.9486,longitude=1.3453,unlocode="GBFXT",portType="Seaport",harborSize="Large",depth=16.0,cargoTypes="Container",tidalRange=3.8,timezone="Europe/London",population=24000,totalArea=18.0,annualTEU=3500000,annualDWT=58000000,maxVesselDWT=220000,berthCount=38,craneCount=52,pilotage="Compulsory",tugsAvailable=6,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=False,warehouseSpace=120000,coldStorage=True,hazardousHandling="Full IMDG",congestionLevel="Medium",avgWaitHours=8,avgStayHours=20,owner="Hutchison Ports",operator="HPF",website="www.portoffelixstowe.co.uk"),
  dict(name="Le Havre",countryCode="FR",region="North Europe",latitude=49.4944,longitude=0.1079,unlocode="FRLEH",portType="Seaport",harborSize="Very Large",depth=16.0,cargoTypes="Container, Bulk, Ro-Ro",tidalRange=6.5,timezone="Europe/Paris",population=170000,totalArea=47.0,annualTEU=2500000,annualDWT=65000000,maxVesselDWT=220000,berthCount=42,craneCount=58,pilotage="Compulsory",tugsAvailable=8,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=True,warehouseSpace=180000,coldStorage=True,hazardousHandling="Full IMDG",congestionLevel="Low",avgWaitHours=6,avgStayHours=18,owner="Grand Port Maritime du Havre",operator="GPMH",website="www.havre-port.fr"),
  dict(name="Algeciras",countryCode="ES",region="Southern Europe",latitude=36.1379,longitude=-5.4535,unlocode="ESALG",portType="Seaport",harborSize="Very Large",depth=18.0,cargoTypes="Container, Bunkering, Ro-Ro",tidalRange=0.7,timezone="Europe/Madrid",population=120000,totalArea=86.0,annualTEU=5200000,annualDWT=110000000,maxVesselDWT=250000,berthCount=35,craneCount=62,pilotage="Compulsory",tugsAvailable=10,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=True,warehouseSpace=150000,coldStorage=True,hazardousHandling="Full IMDG",congestionLevel="Low",avgWaitHours=4,avgStayHours=14,owner="APBA",operator="APBA",website="www.apba.es"),
  dict(name="Piraeus",countryCode="GR",region="Southern Europe",latitude=37.9379,longitude=23.6471,unlocode="GRPIR",portType="Seaport",harborSize="Very Large",depth=17.5,cargoTypes="Container, Ro-Ro, Ferry",tidalRange=0.1,timezone="Europe/Athens",population=660000,totalArea=10.0,annualTEU=4700000,annualDWT=85000000,maxVesselDWT=240000,berthCount=28,craneCount=42,pilotage="Compulsory",tugsAvailable=6,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=True,warehouseSpace=120000,coldStorage=True,hazardousHandling="Full IMDG",congestionLevel="Low",avgWaitHours=5,avgStayHours=14,owner="OLP/COSCO",operator="PCT/OLP",website="www.olp.gr"),
  dict(name="Ho Chi Minh City",countryCode="VN",region="Southeast Asia",latitude=10.8231,longitude=106.6297,unlocode="VNSGN",portType="Seaport",harborSize="Large",depth=14.0,cargoTypes="Container, Bulk",tidalRange=3.0,timezone="Asia/Ho_Chi_Minh",population=8900000,totalArea=2061.0,annualTEU=8400000,annualDWT=160000000,maxVesselDWT=120000,berthCount=55,craneCount=72,pilotage="Compulsory",tugsAvailable=10,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=False,warehouseSpace=180000,coldStorage=True,hazardousHandling="Class 1-6",congestionLevel="High",avgWaitHours=24,avgStayHours=30,owner="VPA",operator="CMIT/Cat Lai",website="www.vpa.gov.vn"),
  dict(name="Buenos Aires",countryCode="AR",region="South America",latitude=-34.6037,longitude=-58.3816,unlocode="ARBUE",portType="Seaport",harborSize="Large",depth=12.0,cargoTypes="Container, Bulk, Liquid, Grain",tidalRange=1.0,timezone="America/Argentina/Buenos_Aires",population=3100000,totalArea=203.0,annualTEU=1100000,annualDWT=55000000,maxVesselDWT=80000,berthCount=42,craneCount=28,pilotage="Compulsory",tugsAvailable=8,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=True,warehouseSpace=150000,coldStorage=True,hazardousHandling="Class 1-5",congestionLevel="Medium",avgWaitHours=16,avgStayHours=34,owner="AGP",operator="AGP",website="www.agp.gob.ar"),
  dict(name="Dammam",countryCode="SA",region="Middle East",latitude=26.3927,longitude=49.9777,unlocode="SADMM",portType="Seaport",harborSize="Large",depth=14.5,cargoTypes="Container, Bulk, Liquid, Ro-Ro",tidalRange=0.5,timezone="Asia/Riyadh",population=1250000,totalArea=800.0,annualTEU=1800000,annualDWT=65000000,maxVesselDWT=150000,berthCount=38,craneCount=42,pilotage="Compulsory",tugsAvailable=8,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=True,warehouseSpace=180000,coldStorage=True,hazardousHandling="Full IMDG",congestionLevel="Low",avgWaitHours=6,avgStayHours=18,owner="Saudi Ports Authority",operator="Mawani",website="www.ports.gov.sa"),
  dict(name="Brisbane",countryCode="AU",region="Oceania",latitude=-27.4698,longitude=153.0251,unlocode="AUBNE",portType="Seaport",harborSize="Large",depth=15.0,cargoTypes="Container, Bulk, Liquid",tidalRange=1.8,timezone="Australia/Brisbane",population=2600000,totalArea=5950.0,annualTEU=1400000,annualDWT=42000000,maxVesselDWT=120000,berthCount=30,craneCount=38,pilotage="Compulsory",tugsAvailable=6,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=True,warehouseSpace=110000,coldStorage=True,hazardousHandling="Full IMDG",congestionLevel="Low",avgWaitHours=5,avgStayHours=16,owner="Brisbane Ports",operator="BPOM",website="www.brisbaneport.com.au"),
  dict(name="Kuwait (Shuwaikh)",countryCode="KW",region="Middle East",latitude=29.3375,longitude=47.9606,unlocode="KWKWT",portType="Seaport",harborSize="Large",depth=12.5,cargoTypes="Container, Bulk, Liquid",tidalRange=0.4,timezone="Asia/Kuwait_City",population=4300000,totalArea=17818.0,annualTEU=1200000,annualDWT=45000000,maxVesselDWT=120000,berthCount=22,craneCount=25,pilotage="Compulsory",tugsAvailable=5,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=False,warehouseSpace=95000,coldStorage=False,hazardousHandling="Full IMDG",congestionLevel="Low",avgWaitHours=8,avgStayHours=20,owner="Kuwait Ports Authority",operator="KPA",website="www.kpa.gov.kw"),
  dict(name="Callao",countryCode="PE",region="South America",latitude=-12.0432,longitude=-77.0282,unlocode="PECLL",portType="Seaport",harborSize="Large",depth=14.0,cargoTypes="Container, Bulk, Liquid",tidalRange=0.5,timezone="America/Lima",population=10500000,totalArea=345.0,annualTEU=2200000,annualDWT=55000000,maxVesselDWT=120000,berthCount=28,craneCount=32,pilotage="Compulsory",tugsAvailable=6,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=True,warehouseSpace=95000,coldStorage=True,hazardousHandling="Full IMDG",congestionLevel="Medium",avgWaitHours=12,avgStayHours=24,owner="APN",operator="DP World Callao",website="www.apn.gob.pe"),
  dict(name="Cartagena",countryCode="CO",region="South America",latitude=10.391,longitude=-75.5364,unlocode="COCTG",portType="Seaport",harborSize="Large",depth=14.5,cargoTypes="Container, Bulk, Liquid, Coal",tidalRange=0.4,timezone="America/Bogota",population=1100000,totalArea=572.0,annualTEU=1800000,annualDWT=48000000,maxVesselDWT=130000,berthCount=25,craneCount=30,pilotage="Compulsory",tugsAvailable=5,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=False,warehouseSpace=85000,coldStorage=True,hazardousHandling="Full IMDG",congestionLevel="Low",avgWaitHours=6,avgStayHours=18,owner="SPRC",operator="SPRC",website="www.sprc.com.co"),
  dict(name="Constanta",countryCode="RO",region="Eastern Europe",latitude=44.1807,longitude=28.6343,unlocode="ROCND",portType="Seaport",harborSize="Large",depth=18.0,cargoTypes="Container, Bulk, Liquid, Grain",tidalRange=0.1,timezone="Europe/Bucharest",population=310000,totalArea=82.0,annualTEU=1200000,annualDWT=65000000,maxVesselDWT=180000,berthCount=28,craneCount=22,pilotage="Compulsory",tugsAvailable=4,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=True,warehouseSpace=120000,coldStorage=False,hazardousHandling="Class 1-6",congestionLevel="Low",avgWaitHours=8,avgStayHours=22,owner="CN APM SA",operator="CN APM",website="www.portofconstantza.com"),
  dict(name="Gdansk",countryCode="PL",region="Northern Europe",latitude=54.352,longitude=18.6464,unlocode="PLGDN",portType="Seaport",harborSize="Large",depth=16.5,cargoTypes="Container, Bulk, Liquid, Ro-Ro",tidalRange=0.1,timezone="Europe/Warsaw",population=470000,totalArea=262.0,annualTEU=2100000,annualDWT=55000000,maxVesselDWT=220000,berthCount=32,craneCount=35,pilotage="Compulsory",tugsAvailable=5,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=True,warehouseSpace=95000,coldStorage=True,hazardousHandling="Full IMDG",congestionLevel="Low",avgWaitHours=5,avgStayHours=16,owner="Port of Gdansk Authority",operator="ZMPG SA",website="www.portgdansk.pl"),
  dict(name="Montreal",countryCode="CA",region="North America",latitude=45.5017,longitude=-73.5673,unlocode="CAMTR",portType="Seaport",harborSize="Large",depth=14.5,cargoTypes="Container, Bulk, Liquid, Grain",tidalRange=4.5,timezone="America/Montreal",population=1800000,totalArea=431.5,annualTEU=1600000,annualDWT=42000000,maxVesselDWT=80000,berthCount=35,craneCount=28,pilotage="Compulsory",tugsAvailable=6,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=True,warehouseSpace=120000,coldStorage=True,hazardousHandling="Full IMDG",congestionLevel="Low",avgWaitHours=8,avgStayHours=20,owner="Montreal Port Authority",operator="MPA",website="www.portmontreal.ca"),
  dict(name="Chittagong",countryCode="BD",region="South Asia",latitude=22.3353,longitude=91.8344,unlocode="BDCGP",portType="Seaport",harborSize="Large",depth=11.0,cargoTypes="Container, Bulk, Grain",tidalRange=5.5,timezone="Asia/Dhaka",population=5200000,totalArea=168.0,annualTEU=3200000,annualDWT=85000000,maxVesselDWT=60000,berthCount=22,craneCount=15,pilotage="Compulsory",tugsAvailable=4,bunkering=False,freshWater=True,medicalFacility=True,repairFacility=False,warehouseSpace=65000,coldStorage=False,hazardousHandling="Class 1-5",congestionLevel="High",avgWaitHours=36,avgStayHours=48,owner="CPA",operator="CPA",website="www.cpa.gov.bd"),
  dict(name="Abidjan",countryCode="CI",region="West Africa",latitude=5.3167,longitude=-4.0167,unlocode="CIABJ",portType="Seaport",harborSize="Large",depth=13.0,cargoTypes="Container, Bulk, Liquid",tidalRange=1.2,timezone="Africa/Abidjan",population=5100000,totalArea=580.0,annualTEU=900000,annualDWT=28000000,maxVesselDWT=70000,berthCount=18,craneCount=15,pilotage="Compulsory",tugsAvailable=4,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=False,warehouseSpace=55000,coldStorage=False,hazardousHandling="Class 1-5",congestionLevel="Medium",avgWaitHours=18,avgStayHours=28,owner="PAbidjan",operator="PAA",website="www.portabidjan.ci"),
  dict(name="Amsterdam",countryCode="NL",region="North Europe",latitude=52.3676,longitude=4.9041,unlocode="NLAMS",portType="Seaport",harborSize="Medium",depth=15.0,cargoTypes="Container, Bulk, Liquid",tidalRange=1.8,timezone="Europe/Amsterdam",population=870000,totalArea=219.0,annualTEU=800000,annualDWT=55000000,maxVesselDWT=120000,berthCount=22,craneCount=25,pilotage="Compulsory",tugsAvailable=5,bunkering=True,freshWater=True,medicalFacility=True,repairFacility=True,warehouseSpace=85000,coldStorage=True,hazardousHandling="Full IMDG",congestionLevel="Low",avgWaitHours=4,avgStayHours=14,owner="Port of Amsterdam",operator="PoA",website="www.portofamsterdam.com"),
]

w("  // ── 4. PORTS (50) ──")
w("  console.log('🗺️  Seeding 50 ports...')")
w("  const portsData: any[] = [")
for p in ports:
  w(f"    {comma_json(p)},")
w("  ]")
w("  const ports = []")
w("  for (const p of portsData) ports.push(await db.port.create({ data: p }))")
w(f"  console.log(`   ✓ {len(ports)} ports`)")
w("  const portMap = new Map(ports.map((p: any) => [p.unlocode, p.id]))")
w()

print(f"Phase 2: ports={len(ports)}")

# ═══════════════════════════════════════════════════════════
# 5. VESSELS (80)
# ═══════════════════════════════════════════════════════════
carrier_codes = [c["code"] for c in carriers]
class_socs = ["DNV GL","Lloyd's Register","Bureau Veritas","ClassNK","ABS","RINA","Korean Register","CCS"]
pandi_clubs = ["Britannia P&I","North of England P&I","Standard P&I","Skuld P&I","Gard P&I","Steamship Mutual","Sweden P&I","London P&I"]
flags = ["Panama","Liberia","Marshall Islands","Hong Kong","Singapore","Greece","China","Norway","Bahamas","Malta","United Kingdom","Marshall Islands","Cyprus","Isle of Man"]
statuses = ["Active","Active","Active","Active","In Port","In Port","At Anchor","Underway","Underway","Moored"]
cargo_hold_counts = {"Container Ship": [6,7,8,9,10], "Bulk Carrier": [5,6,7,9], "Tanker": [8,10,12,15], "LNG Carrier": [4,5,6], "LPG Carrier": [4,5], "Ro-Ro": [8,10,12], "General Cargo": [3,4,5]}

vessels = []
# Generate vessel names
ship_prefixes = ["MV","MV","MV","SS","M/V","CMA CGM","Maersk","MSC","Ever Given","Cosco","Hapag","ONE","Evergreen","Yang Ming","ZIM","Pacific","Atlantic","Indian","Southern","Northern","Eastern","Western","Global","Ocean","Sea","Star","Fortune","Glory","Horizon","Meridian","Pioneer","Venture","Endeavour","Discovery","Explorer","Aurora","Borealis","Coral","Crystal","Diamond","Emerald"]
ship_suffixes = ["Fortune","Star","Pioneer","Venture","Horizon","Glory","Meridian","Endeavour","Discovery","Explorer","Crown","King","Queen","Prince","Princess","Duke","Duchess","Champion","Victory","Triumph","Spirit","Fortune","Cyclone","Hurricane","Tornado","Thunder","Lightning","Eagle","Falcon","Hawk"]

random.seed(42)
used_mmsi = set()
used_imo = set()

for i in range(80):
  if i < 35:
    vtype = "Container Ship"
  elif i < 50:
    vtype = "Bulk Carrier"
  elif i < 62:
    vtype = "Tanker"
  elif i < 70:
    vtype = "LNG Carrier"
  elif i < 77:
    vtype = "Ro-Ro"
  else:
    vtype = "General Cargo"

  # Realistic dimensions by type
  if vtype == "Container Ship":
    teu = random.choice([500,800,1200,1800,2500,3600,4800,6500,8500,10000,13000,15000,20000,24000])
    gt = teu * random.uniform(10,14)
    dwt = teu * random.uniform(12,18)
    length = max(120, teu * random.uniform(0.015, 0.025))
    breadth = max(20, length * random.uniform(0.1, 0.14))
    draft = max(8, length * random.uniform(0.03, 0.05))
    vc = random.choice(["ULCS" if teu>18000 else "Post-Panamax" if teu>5000 else "Panamax" if teu>3000 else "Sub-Panamax" if teu>1500 else "Feeder"])
    max_speed = random.uniform(18, 25)
    ep = random.uniform(40000, 80000)
    fc = random.uniform(2000, 12000)
    ft = random.choice(["VLSFO","VLSFO","LNG Dual-Fuel","VLSFO","MGO"])
    reefer_pts = int(teu * random.uniform(0.05, 0.1))
    cc = random.choice(cargo_hold_counts[vtype])
    cr = random.choice([0,0,0,2,3])
  elif vtype == "Bulk Carrier":
    dwt = random.choice([18000,28000,35000,45000,58000,72000,82000,95000,180000])
    gt = dwt * random.uniform(0.5, 0.6)
    teu = 0; reefer_pts = 0; cr = random.choice([4,4,0,0])
    cc = random.choice(cargo_hold_counts[vtype])
    vc = random.choice(["Capesize" if dwt>100000 else "Panamax" if dwt>65000 else "Supramax" if dwt>50000 else "Handymax" if dwt>35000 else "Handysize"])
    length = dwt * random.uniform(0.0015, 0.0035)
    breadth = max(20, length * random.uniform(0.12, 0.16))
    draft = max(9, length * random.uniform(0.04, 0.065))
    max_speed = random.uniform(12, 16)
    ep = random.uniform(5000, 12000)
    fc = random.uniform(1500, 4000)
    ft = random.choice(["VLSFO","VLSFO","HFO"])
  elif vtype == "Tanker":
    dwt = random.choice([30000,50000,75000,100000,150000,250000,300000])
    gt = dwt * random.uniform(0.5, 0.6)
    teu = 0; reefer_pts = 0; cr = 0
    cc = random.choice(cargo_hold_counts[vtype])
    vc = random.choice(["VLCC" if dwt>200000 else "Suezmax" if dwt>120000 else "Aframax" if dwt>80000 else "Panamax" if dwt>60000 else "Handysize"])
    length = dwt * random.uniform(0.0012, 0.003)
    breadth = max(22, length * random.uniform(0.12, 0.17))
    draft = max(10, length * random.uniform(0.04, 0.065))
    max_speed = random.uniform(12, 17)
    ep = random.uniform(6000, 20000)
    fc = random.uniform(2000, 6000)
    ft = random.choice(["VLSFO","VLSFO","HFO","LNG Dual-Fuel"])
  elif vtype == "LNG Carrier":
    dwt = random.choice([50000,65000,80000,95000,100000])
    gt = dwt * random.uniform(0.9, 1.1)
    teu = 0; reefer_pts = 0; cr = 0
    cc = random.choice([4,5,6])
    vc = random.choice(["Moss Type LNG","Membrane LNG","Membrane LNG"])
    length = random.uniform(270, 320)
    breadth = random.uniform(42, 52)
    draft = random.uniform(11, 13)
    max_speed = random.uniform(17, 21)
    ep = random.uniform(25000, 45000)
    fc = random.uniform(80000, 180000)
    ft = random.choice(["LNG","LNG","Steam Turbine"])
  elif vtype == "Ro-Ro":
    dwt = random.choice([12000,18000,25000,35000,55000])
    gt = dwt * random.uniform(1.5, 2.5)
    teu = 0; reefer_pts = 0; cr = 0
    cc = random.choice(cargo_hold_counts[vtype])
    vc = random.choice(["PCTC","ConRo","Ro-Ro"])
    length = random.uniform(150, 230)
    breadth = random.uniform(24, 34)
    draft = random.uniform(8, 11)
    max_speed = random.uniform(16, 22)
    ep = random.uniform(8000, 20000)
    fc = random.uniform(1500, 4000)
    ft = random.choice(["VLSFO","MGO","VLSFO"])
  else:  # General Cargo
    dwt = random.choice([5000,8000,12000,18000,28000])
    gt = dwt * random.uniform(0.7, 1.0)
    teu = random.choice([0,0,0,50,100,200])
    reefer_pts = 0; cr = random.choice([2,3,4,0])
    cc = random.choice(cargo_hold_counts[vtype])
    vc = random.choice(["MPP","General Cargo","Heavy Lift"])
    length = random.uniform(90, 170)
    breadth = random.uniform(14, 25)
    draft = random.uniform(6, 10)
    max_speed = random.uniform(12, 18)
    ep = random.uniform(2000, 8000)
    fc = random.uniform(400, 2000)
    ft = random.choice(["VLSFO","HFO","MGO"])

  # Generate unique MMSI and IMO
  while True:
    mid = random.randint(200000000, 779999999)
    if mid not in used_mmsi: break
  used_mmsi.add(mid)
  while True:
    imo_val = random.randint(1000000, 9999999)
    if imo_val not in used_imo: break
  used_imo.add(imo_val)

  status = random.choice(statuses)
  flag = random.choice(flags)
  yr = random.randint(1995, 2024)
  name = f"{random.choice(ship_prefixes)} {random.choice(ship_suffixes)} {random.randint(1,99)}"

  speed = round(random.uniform(0, max_speed*0.85), 1) if status in ["Active","Underway"] else 0
  heading = random.randint(0, 359) if speed > 0 else 0
  dest = random.choice([p["unlocode"] for p in ports]) if speed > 0 else None
  eta_offset = random.randint(1, 15) if speed > 0 else None

  v = dict(
    mmsi=mid, imo=imo_val, name=name,
    callSign=f"{''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ', k=2))}{random.randint(1000,9999)}",
    vesselType=vtype, flagCountry=flag, grossTonnage=round(gt), deadweight=round(dwt),
    length=round(length,1), breadth=round(breadth,1), draft=round(draft,1),
    yearBuilt=yr, status=status,
    latitude=round(random.uniform(-60, 65), 4),
    longitude=round(random.uniform(-180, 180), 4),
    speed=speed, heading=heading, destination=dest,
    eta=f"new Date(Date.now() + {eta_offset} * 86400000)" if eta_offset else "null",
    classificationSociety=random.choice(class_socs), vesselClass=vc,
    iceClass=random.choice(["None","None","None","ICE-1A","ICE-1B","ICE-1C","Polar Code"]),
    engineType=random.choice(["Diesel","Diesel","Diesel","LNG Dual-Fuel","Steam Turbine"]),
    enginePower=round(ep), maxSpeed=round(max_speed,1),
    fuelCapacity=round(fc), fuelType=ft,
    teuCapacity=teu if teu > 0 else None, reeferPoints=reefer_pts if reefer_pts > 0 else None,
    cargoHoldCount=cc, craneCount=cr,
    doubleHull=True if yr > 1995 else random.choice([True,False]),
    bulbousBow=True if yr > 2000 else random.choice([True,False]),
    crewCapacity=random.randint(15, 35),
    shipManager=f"{random.choice(['V Ships','Bernhard Schulte','Wallem','Synergy Marine','Anglo-Eastern','Fleet Management','Barship','CSM','DSM','Oxygen Marine'])} {random.choice(['Hong Kong','Singapore','Monaco','Athens','Cyprus','London','Manila','Mumbai','Hamburg','Tokyo'])}",
    registeredOwner=f"{name.replace('MV ','').replace('M/V ','')} Maritime {random.choice(['Ltd','Inc','SA','Corp','GmbH','Co'])}",
    beneficialOwner=random.choice(["Maersk A/S","MSC Mediterranean","CMA CGM SA","COSCO Shipping","Hapag-Lloyd AG","ONE Inc","Evergreen Marine","Yang Ming Marine","PIL Ltd","ZIM Navigation","South Korea Inc","Taiwan Corp","Singapore Holdings","Bermuda Trust","Greek Shipping Co"]),
    insurancePandI=random.choice(pandi_clubs),
    imoCertExpiry=f"new Date('{random.randint(2026,2031)}-{random.randint(1,12):02d}-{random.randint(1,28):02d}')",
    solasCompliant=True, marpolCompliant=True,
    ballastWater=random.choice(["BWMS Treatment","BWMS Treatment","Ballast Exchange","BWMS Treatment","None"]),
    antiFouling=random.choice(["Silicone","Copper","Copper","None","Teflon"]),
    emissionRating=random.choice(["A","B","B","C","C","C","D"]),
    totalVoyages=random.randint(50, 500), totalDistanceNm=random.randint(200000, 1500000),
    ownerCountry=flag,
  )
  v["carrierIdx"] = i % len(carrier_codes)  # index for carrier lookup
  vessels.append(v)

w("  // ── 5. VESSELS (80) ──")
w("  console.log('🚢 Seeding 80 vessels...')")
w("  const carrierMap = new Map(carriers.map((c: any) => [c.code, c.id]))")
w("  const vesselCodeMap: any = {")
for code in carrier_codes:
  w(f'    "{code}": carrierMap.get("{code}")!,')
w("  }")
w("  const vesselsData: any[] = [")
for v in vessels:
  carrier_id_code = carrier_codes[v["carrierIdx"]]
  del v["carrierIdx"]
  # Handle the eta field - it's a string with "new Date(...)"
  w(f"    {{ ...{comma_json(v)}, carrierId: vesselCodeMap['{carrier_id_code}'] }},")
w("  ]")
w("  const vessels = []")
w("  for (const v of vesselsData) vessels.push(await db.vessel.create({ data: v }))")
w(f"  console.log(`   ✓ {len(vessels)} vessels`)")
w()

print(f"Phase 3: vessels={len(vessels)}")

# ═══════════════════════════════════════════════════════════
# SAVE PART 1
# ═══════════════════════════════════════════════════════════
with open(OUT, 'w') as f:
  f.write('\n'.join(L) + '\n')

print(f"✅ Part 1 written: {len(L)} lines → {OUT}")
