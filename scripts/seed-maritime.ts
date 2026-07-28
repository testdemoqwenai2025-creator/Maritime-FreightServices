import { db } from '@/lib/db'

async function seedMaritimeData() {
  console.log('🌍 Seeding Global Maritime & Freight Database...\n')

  // ============================
  // SEED MAJOR WORLD PORTS
  // ============================
  const portsData = [
    { name: 'Shanghai', countryCode: 'CN', region: 'East Asia', latitude: 31.2304, longitude: 121.4737, unlocode: 'CNSHA', portType: 'Seaport', harborSize: 'Very Large', depth: 16.5, cargoTypes: 'Container, Bulk, Liquid', tidalRange: 3.0 },
    { name: 'Singapore', countryCode: 'SG', region: 'Southeast Asia', latitude: 1.3521, longitude: 103.8198, unlocode: 'SGSIN', portType: 'Seaport', harborSize: 'Very Large', depth: 22.0, cargoTypes: 'Container, Bunkering, Liquid', tidalRange: 2.5 },
    { name: 'Rotterdam', countryCode: 'NL', region: 'North Europe', latitude: 51.9244, longitude: 4.4777, unlocode: 'NLRTM', portType: 'Seaport', harborSize: 'Very Large', depth: 24.0, cargoTypes: 'Container, Bulk, Ro-Ro, Liquid', tidalRange: 1.8 },
    { name: 'Busan', countryCode: 'KR', region: 'East Asia', latitude: 35.1796, longitude: 129.0756, unlocode: 'KRPUS', portType: 'Seaport', harborSize: 'Very Large', depth: 17.0, cargoTypes: 'Container, Bulk, Liquid', tidalRange: 1.2 },
    { name: 'Ningbo-Zhoushan', countryCode: 'CN', region: 'East Asia', latitude: 29.8683, longitude: 121.5440, unlocode: 'CNNGB', portType: 'Seaport', harborSize: 'Very Large', depth: 18.0, cargoTypes: 'Container, Bulk, Liquid', tidalRange: 3.5 },
    { name: 'Qingdao', countryCode: 'CN', region: 'East Asia', latitude: 36.0671, longitude: 120.3826, unlocode: 'CNTAO', portType: 'Seaport', harborSize: 'Large', depth: 17.5, cargoTypes: 'Container, Bulk, Liquid', tidalRange: 4.0 },
    { name: 'Guangzhou', countryCode: 'CN', region: 'East Asia', latitude: 23.1291, longitude: 113.2644, unlocode: 'CNGZG', portType: 'Seaport', harborSize: 'Very Large', depth: 15.0, cargoTypes: 'Container, Bulk, General', tidalRange: 2.0 },
    { name: 'Tianjin', countryCode: 'CN', region: 'East Asia', latitude: 39.3434, longitude: 117.3616, unlocode: 'CNTSN', portType: 'Seaport', harborSize: 'Very Large', depth: 18.0, cargoTypes: 'Container, Bulk, Liquid', tidalRange: 3.0 },
    { name: 'Hamburg', countryCode: 'DE', region: 'North Europe', latitude: 53.5511, longitude: 9.9937, unlocode: 'DEHAM', portType: 'Seaport', harborSize: 'Very Large', depth: 16.5, cargoTypes: 'Container, Bulk, Ro-Ro', tidalRange: 3.6 },
    { name: 'Antwerp', countryCode: 'BE', region: 'North Europe', latitude: 51.2602, longitude: 4.4026, unlocode: 'BEANR', portType: 'Seaport', harborSize: 'Large', depth: 18.0, cargoTypes: 'Container, Bulk, Liquid, Ro-Ro', tidalRange: 5.0 },
    { name: 'Los Angeles', countryCode: 'US', region: 'North America', latitude: 33.9425, longitude: -118.4081, unlocode: 'USLAX', portType: 'Seaport', harborSize: 'Very Large', depth: 18.0, cargoTypes: 'Container, Auto, Break Bulk', tidalRange: 1.8 },
    { name: 'Long Beach', countryCode: 'US', region: 'North America', latitude: 33.7884, longitude: -118.1840, unlocode: 'USLGB', portType: 'Seaport', harborSize: 'Very Large', depth: 20.0, cargoTypes: 'Container, Bulk, Auto', tidalRange: 1.5 },
    { name: 'Dubai (Jebel Ali)', countryCode: 'AE', region: 'Middle East', latitude: 25.0208, longitude: 55.1441, unlocode: 'AEDXB', portType: 'Seaport', harborSize: 'Very Large', depth: 17.0, cargoTypes: 'Container, Bulk, General', tidalRange: 1.2 },
    { name: 'Jeddah', countryCode: 'SA', region: 'Middle East', latitude: 21.4858, longitude: 39.1925, unlocode: 'SAJED', portType: 'Seaport', harborSize: 'Large', depth: 16.0, cargoTypes: 'Container, Bulk, Liquid', tidalRange: 0.6 },
    { name: 'Mumbai', countryCode: 'IN', region: 'South Asia', latitude: 19.0760, longitude: 72.8777, unlocode: 'INBOM', portType: 'Seaport', harborSize: 'Large', depth: 14.0, cargoTypes: 'Container, Bulk, Liquid, General', tidalRange: 3.5 },
    { name: 'Felixstowe', countryCode: 'GB', region: 'North Europe', latitude: 51.9497, longitude: 1.3506, unlocode: 'GBFXT', portType: 'Seaport', harborSize: 'Large', depth: 16.0, cargoTypes: 'Container, Ro-Ro', tidalRange: 3.8 },
    { name: 'Tokyo', countryCode: 'JP', region: 'East Asia', latitude: 35.6762, longitude: 139.6503, unlocode: 'JPTYO', portType: 'Seaport', harborSize: 'Large', depth: 15.0, cargoTypes: 'Container, Bulk, General', tidalRange: 1.8 },
    { name: 'Yokohama', countryCode: 'JP', region: 'East Asia', latitude: 35.4437, longitude: 139.6380, unlocode: 'JPYOK', portType: 'Seaport', harborSize: 'Large', depth: 16.0, cargoTypes: 'Container, Ro-Ro, General', tidalRange: 1.6 },
    { name: 'Suez Canal', countryCode: 'EG', region: 'Africa', latitude: 30.5876, longitude: 32.2720, unlocode: 'EGSUZ', portType: 'Canal', harborSize: 'Large', depth: 24.0, cargoTypes: 'Transit, Container, Bulk', tidalRange: 0.7 },
    { name: 'Piraeus', countryCode: 'GR', region: 'Mediterranean', latitude: 37.9379, longitude: 23.6473, unlocode: 'GRPIR', portType: 'Seaport', harborSize: 'Large', depth: 16.0, cargoTypes: 'Container, Ro-Ro, General', tidalRange: 0.1 },
    { name: 'Rio de Janeiro', countryCode: 'BR', region: 'South America', latitude: -22.9068, longitude: -43.1729, unlocode: 'BRRIO', portType: 'Seaport', harborSize: 'Large', depth: 15.5, cargoTypes: 'Container, Bulk, Liquid, General', tidalRange: 1.2 },
    { name: 'Sydney', countryCode: 'AU', region: 'Oceania', latitude: -33.8688, longitude: 151.2093, unlocode: 'AUSYD', portType: 'Seaport', harborSize: 'Medium', depth: 14.0, cargoTypes: 'Container, Bulk, General', tidalRange: 1.8 },
    { name: 'Mombasa', countryCode: 'KE', region: 'East Africa', latitude: -4.0435, longitude: 39.6682, unlocode: 'KEMBA', portType: 'Seaport', harborSize: 'Medium', depth: 13.0, cargoTypes: 'Container, Bulk, Liquid', tidalRange: 3.2 },
    { name: 'Lagos', countryCode: 'NG', region: 'West Africa', latitude: 6.5244, longitude: 3.3792, unlocode: 'NGLOS', portType: 'Seaport', harborSize: 'Medium', depth: 13.5, cargoTypes: 'Container, Bulk, Liquid', tidalRange: 1.2 },
    { name: 'Colombo', countryCode: 'LK', region: 'South Asia', latitude: 6.9271, longitude: 79.8612, unlocode: 'LKCMB', portType: 'Seaport', harborSize: 'Large', depth: 20.0, cargoTypes: 'Container, Bulk, Transshipment', tidalRange: 0.8 },
  ]

  console.log(`🚢 Creating ${portsData.length} global ports...`)
  const ports = await Promise.all(
    portsData.map((port) =>
      db.port.create({ data: port })
    )
  )

  // ============================
  // SEED VESSELS
  // ============================
  const vesselsData = [
    { mmsi: 477394500, imo: 9547843, name: 'Pacific Fortune', callSign: 'VRBZ8', vesselType: 'Container Ship', flagCountry: 'HK', grossTonnage: 54236, deadweight: 69784, length: 299.9, breadth: 40.3, draft: 14.0, yearBuilt: 2012, status: 'Active', latitude: 22.28, longitude: 114.17, speed: 14.2, heading: 265, destination: 'SGSIN', eta: new Date(Date.now() + 4 * 86400000) },
    { mmsi: 636091537, imo: 9458054, name: 'MV Atlantic Star', callSign: 'D5IQ4', vesselType: 'Bulk Carrier', flagCountry: 'LR', grossTonnage: 38542, deadweight: 72398, length: 225.0, breadth: 32.3, draft: 14.2, yearBuilt: 2010, status: 'Active', latitude: 34.05, longitude: -20.12, speed: 11.8, heading: 45, destination: 'NLRTM', eta: new Date(Date.now() + 8 * 86400000) },
    { mmsi: 311045300, imo: 9468930, name: 'CMA CGM Marco Polo', callSign: 'C6YB5', vesselType: 'Container Ship', flagCountry: 'PA', grossTonnage: 156278, deadweight: 187625, length: 396.0, breadth: 53.6, draft: 16.0, yearBuilt: 2013, status: 'Active', latitude: 51.92, longitude: 4.48, speed: 16.5, heading: 210, destination: 'SGSIN', eta: new Date(Date.now() + 18 * 86400000) },
    { mmsi: 353136000, imo: 9654763, name: 'Ever Given', callSign: 'H3RC', vesselType: 'Container Ship', flagCountry: 'PA', grossTonnage: 199293, deadweight: 224965, length: 400.0, breadth: 59.0, draft: 16.0, yearBuilt: 2018, status: 'Active', latitude: 31.25, longitude: 32.30, speed: 12.0, heading: 175, destination: 'NLRTM', eta: new Date(Date.now() + 12 * 86400000) },
    { mmsi: 538008212, imo: 9838944, name: 'MSC Gülsün', callSign: 'V7HF2', vesselType: 'Container Ship', flagCountry: 'PA', grossTonnage: 232170, deadweight: 257598, length: 400.0, breadth: 61.5, draft: 16.5, yearBuilt: 2019, status: 'Active', latitude: 1.35, longitude: 104.10, speed: 18.2, heading: 30, destination: 'CNSHA', eta: new Date(Date.now() + 5 * 86400000) },
    { mmsi: 563005500, imo: 9786412, name: 'Cosco Shipping Universe', callSign: '9HDV8', vesselType: 'Container Ship', flagCountry: 'HK', grossTonnage: 199890, deadweight: 223413, length: 400.0, breadth: 58.6, draft: 16.0, yearBuilt: 2018, status: 'Active', latitude: -33.87, longitude: 151.20, speed: 15.5, heading: 340, destination: 'CNSHA', eta: new Date(Date.now() + 10 * 86400000) },
    { mmsi: 431502900, imo: 9764523, name: 'ONE Harmony', callSign: '7JFJ', vesselType: 'Container Ship', flagCountry: 'JP', grossTonnage: 152660, deadweight: 152888, length: 364.0, breadth: 51.0, draft: 14.5, yearBuilt: 2017, status: 'Active', latitude: 35.44, longitude: 139.64, speed: 13.8, heading: 90, destination: 'USLAX', eta: new Date(Date.now() + 12 * 86400000) },
    { mmsi: 305753000, imo: 9457058, name: 'Oil Tanker Aegean', callSign: 'V4BX2', vesselType: 'Tanker', flagCountry: 'MT', grossTonnage: 82156, deadweight: 114946, length: 274.2, breadth: 48.0, draft: 17.0, yearBuilt: 2011, status: 'Active', latitude: 25.02, longitude: 55.14, speed: 10.5, heading: 320, destination: 'SAJED', eta: new Date(Date.now() + 2 * 86400000) },
    { mmsi: 248762000, imo: 9397136, name: 'MV Nordic Spirit', callSign: '9HA4528', vesselType: 'Ro-Ro Ship', flagCountry: 'NO', grossTonnage: 61234, deadweight: 18675, length: 231.0, breadth: 32.0, draft: 7.5, yearBuilt: 2008, status: 'Active', latitude: 53.55, longitude: 9.99, speed: 16.0, heading: 180, destination: 'GBFXT', eta: new Date(Date.now() + 1 * 86400000) },
    { mmsi: 477765400, imo: 9745387, name: 'Global Mercy', callSign: '3FQK5', vesselType: 'General Cargo', flagCountry: 'LR', grossTonnage: 29410, deadweight: 43120, length: 177.0, breadth: 27.6, draft: 10.5, yearBuilt: 2015, status: 'Active', latitude: -4.04, longitude: 39.67, speed: 9.2, heading: 60, destination: 'INBOM', eta: new Date(Date.now() + 7 * 86400000) },
    { mmsi: 235002342, imo: 9525761, name: 'LNG Pioneer', callSign: 'MHJT6', vesselType: 'LNG Carrier', flagCountry: 'GB', grossTonnage: 98347, deadweight: 98523, length: 295.0, breadth: 46.0, draft: 12.5, yearBuilt: 2013, status: 'Active', latitude: 22.28, longitude: 120.30, speed: 17.0, heading: 270, destination: 'JPTYO', eta: new Date(Date.now() + 3 * 86400000) },
    { mmsi: 370654000, imo: 9834561, name: 'Hapag-Lloyd Express', callSign: '3FOW7', vesselType: 'Container Ship', flagCountry: 'DE', grossTonnage: 105000, deadweight: 121400, length: 333.0, breadth: 48.0, draft: 15.5, yearBuilt: 2020, status: 'Active', latitude: 37.94, longitude: 23.65, speed: 14.8, heading: 315, destination: 'NLRTM', eta: new Date(Date.now() + 6 * 86400000) },
    { mmsi: 416001234, imo: 9754321, name: 'Columbia Star', callSign: 'WDFN3', vesselType: 'Bulk Carrier', flagCountry: 'MH', grossTonnage: 42300, deadweight: 82400, length: 229.0, breadth: 32.3, draft: 14.5, yearBuilt: 2016, status: 'In Port', latitude: -22.91, longitude: -43.17, speed: 0, heading: 0, destination: null, eta: null },
    { mmsi: 636090876, imo: 9501234, name: 'Mauritius Unity', callSign: '5IUP4', vesselType: 'General Cargo', flagCountry: 'MU', grossTonnage: 18700, deadweight: 28500, length: 162.0, breadth: 25.0, draft: 9.8, yearBuilt: 2009, status: 'Active', latitude: -6.16, longitude: 39.19, speed: 11.0, heading: 75, destination: 'KEMBA', eta: new Date(Date.now() + 1 * 86400000) },
    { mmsi: 352773000, imo: 9678234, name: 'Barcelona Bridge', callSign: '3EKL7', vesselType: 'Container Ship', flagCountry: 'PA', grossTonnage: 85000, deadweight: 100500, length: 336.0, breadth: 48.4, draft: 15.0, yearBuilt: 2016, status: 'Active', latitude: 19.08, longitude: 72.88, speed: 13.2, heading: 270, destination: 'AEDXB', eta: new Date(Date.now() + 5 * 86400000) },
  ]

  console.log(`⚓ Creating ${vesselsData.length} vessels...`)
  const vessels = await Promise.all(
    vesselsData.map((vessel) =>
      db.vessel.create({
        data: {
          ...vessel,
          lastPosition: new Date(),
        },
      })
    )
  )

  // ============================
  // SEED SHIPMENTS
  // ============================
  const now = Date.now()
  const shipmentsData = [
    { billOfLading: 'MAEU2026072001', bookingRef: 'BK-SHA-001', status: 'In Transit', cargoType: 'Electronics', cargoWeight: 24500, cargoValue: 4850000, cargoDesc: 'Consumer electronics and semiconductors', hsCode: '8542', vesselId: vessels[0].id, originPortId: ports[0].id, destPortId: ports[1].id, departureDate: new Date(now - 3 * 86400000), etd: new Date(now - 3 * 86400000), eta: new Date(now + 4 * 86400000), transitDays: 7, freightCost: 28500, shipper: 'Shanghai Tech Industries', consignee: 'Singapore Electronics Pte' },
    { billOfLading: 'MSCU2026071802', bookingRef: 'BK-RTM-002', status: 'In Transit', cargoType: 'Machinery', cargoWeight: 58000, cargoValue: 12400000, cargoDesc: 'Industrial machinery and turbine parts', hsCode: '8412', vesselId: vessels[2].id, originPortId: ports[2].id, destPortId: ports[1].id, departureDate: new Date(now - 5 * 86400000), etd: new Date(now - 5 * 86400000), eta: new Date(now + 13 * 86400000), transitDays: 18, freightCost: 62000, shipper: 'Dutch Machinery BV', consignee: 'Pacific Industrial Co.' },
    { billOfLading: 'COSU2026072203', bookingRef: 'BK-NGP-003', status: 'Booked', cargoType: 'Textiles', cargoWeight: 35000, cargoValue: 2100000, cargoDesc: 'Ready-made garments and fabrics', hsCode: '6203', vesselId: vessels[1].id, originPortId: ports[4].id, destPortId: ports[23].id, departureDate: new Date(now + 2 * 86400000), etd: new Date(now + 2 * 86400000), eta: new Date(now + 12 * 86400000), transitDays: 10, freightCost: 18000, shipper: 'Ningbo Textile Co. Ltd', consignee: 'Mombasa Trading House' },
    { billOfLading: 'EGLV2026071504', bookingRef: 'BK-SUE-004', status: 'In Transit', cargoType: 'Oil Products', cargoWeight: 85000, cargoValue: 34000000, cargoDesc: 'Crude oil and petroleum products', hsCode: '2709', vesselId: vessels[7].id, originPortId: ports[12].id, destPortId: ports[13].id, departureDate: new Date(now - 1 * 86400000), etd: new Date(now - 1 * 86400000), eta: new Date(now + 2 * 86400000), transitDays: 3, freightCost: 145000, shipper: 'Emirates National Oil', consignee: 'Saudi Aramco Logistics' },
    { billOfLading: 'ONEL2026071005', bookingRef: 'BK-TKO-005', status: 'In Transit', cargoType: 'Automobiles', cargoWeight: 42000, cargoValue: 8900000, cargoDesc: 'Passenger vehicles and automotive parts', hsCode: '8703', vesselId: vessels[6].id, originPortId: ports[16].id, destPortId: ports[10].id, departureDate: new Date(now - 8 * 86400000), etd: new Date(now - 8 * 86400000), eta: new Date(now + 4 * 86400000), transitDays: 12, freightCost: 78000, shipper: 'Toyota Motor Corp', consignee: 'LA Auto Distributors Inc' },
    { billOfLading: 'HLCU2026071206', bookingRef: 'BK-HAM-006', status: 'Arrived', cargoType: 'Chemicals', cargoWeight: 32000, cargoValue: 5600000, cargoDesc: 'Industrial chemicals and solvents', hsCode: '3824', vesselId: vessels[11].id, originPortId: ports[19].id, destPortId: ports[8].id, departureDate: new Date(now - 12 * 86400000), etd: new Date(now - 12 * 86400000), arrivalDate: new Date(now - 6 * 86400000), eta: new Date(now - 6 * 86400000), transitDays: 6, freightCost: 32000, shipper: 'Piraeus Chemicals SA', consignee: 'Hamburg Chemie GmbH' },
    { billOfLading: 'MSCU2026072507', bookingRef: 'BK-SIN-007', status: 'Booked', cargoType: 'Agricultural', cargoWeight: 67000, cargoValue: 1800000, cargoDesc: 'Grain and agricultural commodities', hsCode: '1001', vesselId: vessels[3].id, originPortId: ports[2].id, destPortId: ports[1].id, departureDate: new Date(now + 3 * 86400000), etd: new Date(now + 3 * 86400000), eta: new Date(now + 12 * 86400000), transitDays: 9, freightCost: 42000, shipper: 'Euro Grain Trading BV', consignee: 'Singapore Agri Corp' },
    { billOfLading: 'BARU2026070808', bookingRef: 'BK-MUM-008', status: 'Delivered', cargoType: 'Pharmaceuticals', cargoWeight: 8500, cargoValue: 12500000, cargoDesc: 'Pharmaceutical products and medical supplies', hsCode: '3004', vesselId: vessels[14].id, originPortId: ports[12].id, destPortId: ports[14].id, departureDate: new Date(now - 15 * 86400000), etd: new Date(now - 15 * 86400000), arrivalDate: new Date(now - 5 * 86400000), eta: new Date(now - 5 * 86400000), transitDays: 10, freightCost: 95000, shipper: 'Dubai Pharma Industries', consignee: 'Mumbai Healthcare Ltd' },
    { billOfLading: 'OOCL2026072009', bookingRef: 'BK-SHA-009', status: 'In Transit', cargoType: 'Furniture', cargoWeight: 28000, cargoValue: 3200000, cargoDesc: 'Office and household furniture', hsCode: '9403', vesselId: vessels[5].id, originPortId: ports[0].id, destPortId: ports[21].id, departureDate: new Date(now - 7 * 86400000), etd: new Date(now - 7 * 86400000), eta: new Date(now + 3 * 86400000), transitDays: 10, freightCost: 22000, shipper: 'Shanghai Furniture Mfg', consignee: 'Sydney Home Decor Pty' },
    { billOfLading: 'MAEU2026070510', bookingRef: 'BK-LAX-010', status: 'Delivered', cargoType: 'Frozen Goods', cargoWeight: 41000, cargoValue: 680000, cargoDesc: 'Frozen seafood and perishable goods', hsCode: '0306', vesselId: vessels[0].id, originPortId: ports[1].id, destPortId: ports[10].id, departureDate: new Date(now - 20 * 86400000), etd: new Date(now - 20 * 86400000), arrivalDate: new Date(now - 10 * 86400000), eta: new Date(now - 10 * 86400000), transitDays: 10, freightCost: 55000, shipper: 'Singapore Seafood Pte', consignee: 'Pacific Foods International' },
  ]

  console.log(`📦 Creating ${shipmentsData.length} shipments...`)
  const shipments = await Promise.all(
    shipmentsData.map((shipment) =>
      db.shipment.create({ data: shipment })
    )
  )

  // ============================
  // SEED CONTAINERS
  // ============================
  const containersData: Array<{
    containerNo: string
    isoType: string
    size: string
    status: string
    weight: number
    vesselId?: string
    shipmentId?: string
    originPort?: string
    destPort?: string
  }> = []

  let containerIdx = 0
  for (const shipment of shipments) {
    const numContainers = 3 + Math.floor(Math.random() * 8)
    for (let i = 0; i < numContainers; i++) {
      containerIdx++
      const sizeRoll = Math.random()
      const size = sizeRoll > 0.7 ? '40FT' : '20FT'
      const isoType = size === '40FT' ? '40DRY' : '20DRY'
      const statusMap: Record<string, string> = {
        'Booked': 'Loaded',
        'In Transit': 'In Transit',
        'Arrived': 'Arrived',
        'Delivered': 'Empty',
      }

      containersData.push({
        containerNo: `MSCU${String(765432 + containerIdx).padStart(7, '0')}`,
        isoType,
        size,
        status: statusMap[shipment.status] || 'Empty',
        weight: 5000 + Math.random() * 25000,
        vesselId: ['Booked', 'In Transit'].includes(shipment.status) ? shipment.vesselId : undefined,
        shipmentId: shipment.id,
        originPort: ports.find((p) => p.id === shipment.originPortId)?.unlocode,
        destPort: ports.find((p) => p.id === shipment.destPortId)?.unlocode,
      })
    }
  }

  console.log(`📦 Creating ${containersData.length} containers...`)
  await db.container.createMany({ data: containersData })

  // ============================
  // SEED VESSEL ARRIVALS & DEPARTURES
  // ============================
  const arrivals = [
    { vesselId: vessels[4].id, portId: ports[1].id, arrivalAt: new Date(now - 6 * 3600000), purpose: 'Discharging' },
    { vesselId: vessels[12].id, portId: ports[20].id, arrivalAt: new Date(now - 12 * 3600000), purpose: 'Loading' },
    { vesselId: vessels[6].id, portId: ports[16].id, arrivalAt: new Date(now - 2 * 86400000), purpose: 'Discharging' },
    { vesselId: vessels[10].id, portId: ports[0].id, arrivalAt: new Date(now - 4 * 86400000), purpose: 'Bunkering' },
    { vesselId: vessels[13].id, portId: ports[23].id, arrivalAt: new Date(now - 3 * 86400000), purpose: 'Discharging' },
  ]

  console.log(`🔴 Creating ${arrivals.length} vessel arrivals...`)
  await db.vesselArrival.createMany({ data: arrivals })

  const departures = [
    { vesselId: vessels[4].id, portId: ports[1].id, departedAt: new Date(now - 2 * 3600000), destination: 'CNSHA' },
    { vesselId: vessels[10].id, portId: ports[0].id, departedAt: new Date(now - 1 * 86400000), destination: 'JPTYO' },
    { vesselId: vessels[9].id, portId: ports[20].id, departedAt: new Date(now - 5 * 86400000), destination: 'INBOM' },
  ]

  console.log(`🟢 Creating ${departures.length} vessel departures...`)
  await db.vesselDeparture.createMany({ data: departures })

  // ============================
  // SEED TRADE DATA
  // ============================
  const tradeData = [
    { reporterCode: 'CN', partnerCode: 'US', year: 2025, tradeFlow: 'Export', commodityCode: '8542', commodityDesc: 'Electronic integrated circuits', grossWeightKg: 45800000, tradeValueUsd: 1250000000, quantity: 12500000, transportMode: 'Sea', dataSource: 'UN Comtrade' },
    { reporterCode: 'CN', partnerCode: 'US', year: 2025, tradeFlow: 'Import', commodityCode: '2709', commodityDesc: 'Petroleum oils', grossWeightKg: 85000000, tradeValueUsd: 420000000, quantity: 85000000, transportMode: 'Sea', dataSource: 'UN Comtrade' },
    { reporterCode: 'CN', partnerCode: 'SG', year: 2025, tradeFlow: 'Export', commodityCode: '8471', commodityDesc: 'Automatic data processing machines', grossWeightKg: 12200000, tradeValueUsd: 890000000, quantity: 3200000, transportMode: 'Sea', dataSource: 'UN Comtrade' },
    { reporterCode: 'DE', partnerCode: 'CN', year: 2025, tradeFlow: 'Import', commodityCode: '8703', commodityDesc: 'Motor cars and vehicles', grossWeightKg: 23500000, tradeValueUsd: 1850000000, quantity: 580000, transportMode: 'Sea', dataSource: 'UN Comtrade' },
    { reporterCode: 'DE', partnerCode: 'US', year: 2025, tradeFlow: 'Export', commodityCode: '8412', commodityDesc: 'Other engines and motors', grossWeightKg: 8900000, tradeValueUsd: 920000000, quantity: 2100000, transportMode: 'Sea', dataSource: 'UN Comtrade' },
    { reporterCode: 'JP', partnerCode: 'CN', year: 2025, tradeFlow: 'Import', commodityCode: '3004', commodityDesc: 'Medicaments', grossWeightKg: 5600000, tradeValueUsd: 680000000, quantity: 1800000, transportMode: 'Sea', dataSource: 'UN Comtrade' },
    { reporterCode: 'JP', partnerCode: 'US', year: 2025, tradeFlow: 'Export', commodityCode: '8703', commodityDesc: 'Motor cars', grossWeightKg: 62000000, tradeValueUsd: 5200000000, quantity: 1500000, transportMode: 'Sea', dataSource: 'UN Comtrade' },
    { reporterCode: 'KR', partnerCode: 'CN', year: 2025, tradeFlow: 'Export', commodityCode: '8542', commodityDesc: 'Semiconductor devices', grossWeightKg: 18500000, tradeValueUsd: 2100000000, quantity: 8500000, transportMode: 'Sea', dataSource: 'UN Comtrade' },
    { reporterCode: 'US', partnerCode: 'CN', year: 2025, tradeFlow: 'Import', commodityCode: '9403', commodityDesc: 'Furniture and parts', grossWeightKg: 42000000, tradeValueUsd: 320000000, quantity: 15000000, transportMode: 'Sea', dataSource: 'UN Comtrade' },
    { reporterCode: 'US', partnerCode: 'SA', year: 2025, tradeFlow: 'Import', commodityCode: '2709', commodityDesc: 'Crude petroleum oil', grossWeightKg: 180000000, tradeValueUsd: 8900000000, quantity: 180000000, transportMode: 'Sea', dataSource: 'UN Comtrade' },
    { reporterCode: 'AE', partnerCode: 'IN', year: 2025, tradeFlow: 'Import', commodityCode: '1001', commodityDesc: 'Wheat and meslin', grossWeightKg: 28000000, tradeValueUsd: 78000000, quantity: 28000000, transportMode: 'Sea', dataSource: 'UN Comtrade' },
    { reporterCode: 'IN', partnerCode: 'AE', year: 2025, tradeFlow: 'Export', commodityCode: '2709', commodityDesc: 'Petroleum oils', grossWeightKg: 65000000, tradeValueUsd: 4500000000, quantity: 65000000, transportMode: 'Sea', dataSource: 'UN Comtrade' },
    { reporterCode: 'AU', partnerCode: 'CN', year: 2025, tradeFlow: 'Export', commodityCode: '2601', commodityDesc: 'Iron ores and concentrates', grossWeightKg: 850000000, tradeValueUsd: 68000000000, quantity: 850000000, transportMode: 'Sea', dataSource: 'UN Comtrade' },
    { reporterCode: 'BR', partnerCode: 'CN', year: 2025, tradeFlow: 'Export', commodityCode: '7204', commodityDesc: 'Iron and steel scrap', grossWeightKg: 32000000, tradeValueUsd: 95000000, quantity: 32000000, transportMode: 'Sea', dataSource: 'UN Comtrade' },
    { reporterCode: 'NG', partnerCode: 'IN', year: 2025, tradeFlow: 'Export', commodityCode: '2709', commodityDesc: 'Crude petroleum', grossWeightKg: 42000000, tradeValueUsd: 2100000000, quantity: 42000000, transportMode: 'Sea', dataSource: 'UN Comtrade' },
  ]

  console.log(`📊 Creating ${tradeData.length} trade data records...`)
  await db.tradeData.createMany({ data: tradeData })

  console.log('\n✅ Database seeded successfully!')
  console.log(`   🚢 Ports: ${ports.length}`)
  console.log(`   ⚓ Vessels: ${vessels.length}`)
  console.log(`   📦 Shipments: ${shipments.length}`)
  console.log(`   📦 Containers: ${containersData.length}`)
  console.log(`   📊 Trade Records: ${tradeData.length}`)
}

seedMaritimeData()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => process.exit(0))
