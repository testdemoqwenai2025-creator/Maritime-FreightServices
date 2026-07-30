const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding Sprint 2 data...')

  const shipments = await prisma.shipment.findMany({
    take: 6,
    include: { originPort: true, destPort: true, vessel: true },
  })

  // 1. eBL
  const eblStatuses = ['Draft', 'Issued', 'Issued', 'Endorsed', 'InTransit', 'Delivered']
  const carriers = ['MAERSK', 'MSC', 'CMA CGM', 'COSCO', 'Hapag-Lloyd', 'ONE']
  for (let i = 0; i < Math.min(shipments.length, 6); i++) {
    const s = shipments[i]
    const existing = await prisma.electronicBillOfLading.findFirst({ where: { shipmentId: s.id } })
    if (existing) { console.log(`  eBL ${i+1} exists`); continue }
    await prisma.electronicBillOfLading.create({
      blNumber: `eBL-2026-${(s.originPort?.unlocode || 'XXX')}-${String(i+1).padStart(3,'0')}`,
      shipmentId: s.id,
      status: eblStatuses[i] || 'Draft',
      shipperName: s.shipper || 'Global Freight Corp.',
      consigneeName: s.consignee || 'Pacific Trade Ltd.',
      carrierName: carriers[i] || 'MAERSK',
      vesselName: s.vessel?.name,
      voyageNumber: `V${2026}${String(i+100).padStart(3,'0')}`,
      portOfLoading: s.originPort?.unlocode || 'CNSHA',
      portOfDischarge: s.destPort?.unlocode || 'NLRTM',
      descriptionOfGoods: s.cargoDesc || 'General cargo',
      containerCount: s.containerCount || 0,
      grossWeight: s.cargoWeight,
      freightTerms: s.freightTerms || 'Prepaid',
      documentHash: `sha256:${require('crypto').createHash('sha256').update(`ebl-${s.id}`).digest('hex').slice(0,16)}`,
      blockchainTxId: `0x${require('crypto').createHash('sha256').update(`tx-${s.id}`).digest('hex').slice(0,40)}`,
      issuedAt: i > 0 ? new Date(Date.now() - (6-i) * 172800000) : null,
      deliveredAt: eblStatuses[i] === 'Delivered' ? new Date(Date.now() - 86400000) : null,
    })
    console.log(`  eBL ${i+1} created`)
  }

  // 2. Payments
  const payTypes = ['Freight','Demurrage','Terminal','Insurance','Freight','Storage']
  const payStatuses = ['Completed','Completed','Processing','Pending','Completed','Pending']
  const methods = ['Wire','LetterOfCredit','SmartContract','Wire','SmartContract','Wire']
  for (let i = 0; i < 6; i++) {
    const ref = `PAY-2026-${String(i+1).padStart(3,'0')}`
    if (await prisma.paymentLedger.findUnique({ where: { paymentRef: ref } })) { console.log(`  Pay ${ref} exists`); continue }
    await prisma.paymentLedger.create({
      paymentRef: ref,
      shipmentId: shipments[i]?.id,
      amount: [45000,32000,18500,7800,52300,12100][i],
      status: payStatuses[i],
      paymentType: payTypes[i],
      paymentMethod: methods[i],
      contractAddress: methods[i]==='SmartContract' ? `0x${require('crypto').randomBytes(20).toString('hex')}` : null,
      contractStatus: methods[i]==='SmartContract' ? 'Settled' : null,
      dueDate: new Date(Date.now() + (i+1)*7*86400000),
      completedAt: payStatuses[i]==='Completed' ? new Date(Date.now() - i*3*86400000) : null,
    })
    console.log(`  Pay ${ref} created`)
  }

  // 3. Berths
  const ports = await prisma.port.findMany({ take: 3 })
  const vessels = await prisma.vessel.findMany({ take: 8 })
 const bStatuses = ['Berthed','Working','Planned','Arrived','Planned','Departed','Working','Planned']
  const cTypes = ['Container','Container','Bulk','Container','Liquid','Container','RoRo','Container']
  for (let i = 0; i < 8; i++) {
    const port = ports[i % ports.length]
    const vessel = vessels[i]
    const berthNum = `B-${String((i%6)+1).padStart(2,'0')}`
    if (await prisma.berthAllocation.findFirst({ where: { portId: port.id, berthNumber: berthNum } })) continue
    const eta = new Date(Date.now() + (i-3)*86400000)
    await prisma.berthAllocation.create({
      portId: port.id, berthNumber: berthNum,
      vesselId: vessel?.id, vesselName: vessel?.name || `Vessel ${i+1}`,
      arrivalETA: eta, departureETD: new Date(eta.getTime()+3*86400000),
      actualArrival: i < 4 ? new Date(eta.getTime()+3600000) : null,
      actualDeparture: i >= 5 ? new Date(eta.getTime()+3*86400000-7200000) : null,
      status: bStatuses[i], cargoType: cTypes[i],
      teuExpected: [800,1200,0,600,0,1000,0,400][i]||0,
      teuLoaded: Math.floor(([800,1200,0,600,0,1000,0,400][i]||0)*(0.3+Math.random()*0.6)),
      craneAssigned: [2,3,0,2,0,3,1,1][i],
    })
    console.log(`  Berth ${berthNum} at ${port.name}`)
  }

  // 4. Cranes
  const crTypes = ['QuayCrane','QuayCrane','QuayCrane','RTG','RTG','ReachStacker']
  const crStatuses = ['Working','Working','Maintenance','Working','Idle','Working']
  const tasks = ['Discharging','Loading',null,'Discharging',null,'Restow']
  for (let i = 0; i < 6; i++) {
    const port = ports[i % ports.length]
    const craneId = `${crTypes[i].slice(0,2).toUpperCase()}-${String(i+1).padStart(2,'0')}`
    if (await prisma.craneSchedule.findFirst({ where: { portId: port.id, craneId } })) continue
    await prisma.craneSchedule.create({
      portId: port.id, craneId, craneType: crTypes[i],
      berthNumber: i < 4 ? `B-${String((i%3)+1).padStart(2,'0')}` : null,
      status: crStatuses[i], currentTask: tasks[i],
      movesPerHour: [28,32,0,24,0,18][i]||null,
      totalMoves: [340,520,0,280,0,150][i],
      efficiencyPct: [92,88,0,85,0,78][i]||null,
      shiftStart: new Date(Date.now()-3600000*(i%8)),
      shiftEnd: new Date(Date.now()+3600000*(8-i%8)),
    })
    console.log(`  Crane ${craneId}`)
  }

  // 5. IoT Sensors
  if ((await prisma.ioTSensor.count()) === 0) {
    const containers = await prisma.container.findMany({ take: 4 })
    const sTypes = ['reefer','reefer','shock','gps']
    const sNames = ['Reefer Bay 12','Reefer Bay 15','Shock Monitor C-03','GPS Tracker V-07']
    for (let i = 0; i < 4; i++) {
      const sensor = await prisma.ioTSensor.create({
        sensorId: `SN-${sTypes[i].slice(0,2).toUpperCase()}-${String(i+1).padStart(3,'0')}`,
        name: sNames[i], sensorType: sTypes[i], status: 'Online',
        batteryLevel: 85+Math.random()*15, signalStrength: 70+Math.random()*30,
        containerId: containers[i]?.id, firmwareVer: '2.4.1', lastReported: new Date(),
      })
      const rMap = { reefer: [{t:'temperature',v:-18+Math.random()*2,u:'°C'},{t:'humidity',v:60+Math.random()*20,u:'%'}], shock: [{t:'shock',v:Math.random()*3,u:'g'}], gps: [{t:'latitude',v:30+Math.random()*30,u:'°'},{t:'longitude',v:-40+Math.random()*80,u:'°'}] }
      for (const r of (rMap[sTypes[i]]||[])) {
        await prisma.telemetryReading.create({ sensorId: sensor.sensorId, readingType: r.t, numericValue: parseFloat(r.v.toFixed(2)), unit: r.u, quality: 'good' })
      }
      console.log(`  Sensor ${sensor.sensorId}`)
    }
  }

  console.log('Sprint 2 seed complete!')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
