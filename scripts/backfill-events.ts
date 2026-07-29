// ============================================================================
// Backfill Script: Update existing ShipmentEvents with sequence numbers,
// previousState, computedState, and actor fields.
// ============================================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Map legacy event types to hierarchical states
const EVENT_TO_HIERARCHICAL: Record<string, string> = {
  Booked: 'Booked',
  CustomsFiled: 'CustomsFiled',
  GateIn: 'Pre-Transit',
  Loaded: 'Pre-Transit',
  Departed: 'AtSea',
  AtSea: 'AtSea',
  Arrived: 'Arrived',
  Discharging: 'Discharging',
  GateOut: 'Delivered',
  Delivered: 'Delivered',
  Exception: 'Exception',
  Held: 'CustomsHeld',
  Released: 'CustomsReleased',
};

// Determine previous state based on event type
function getPreviousState(eventType: string): string {
  switch (eventType) {
    case 'Booked': return 'Booked';
    case 'CustomsFiled': return 'Booked';
    case 'Held': return 'CustomsFiled';
    case 'Released': return 'CustomsHeld';
    case 'GateIn': return 'CustomsCleared';
    case 'Loaded': return 'Pre-Transit';
    case 'Departed': return 'Pre-Transit';
    case 'AtSea': return 'AtSea';
    case 'Arrived': return 'Approaching';
    case 'Discharging': return 'Arrived';
    case 'GateOut': return 'Post-Discharge';
    case 'Delivered': return 'Delivered';
    case 'Exception': return 'AtSea';
    default: return 'Booked';
  }
}

async function main() {
  console.log('Starting backfill...');

  // Get all shipments with events
  const shipments = await prisma.shipment.findMany({
    select: { id: true },
  });

  let totalUpdated = 0;

  for (const shipment of shipments) {
    const events = await prisma.shipmentEvent.findMany({
      where: { shipmentId: shipment.id },
      orderBy: { createdAt: 'asc' },
    });

    if (events.length === 0) continue;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const computedState = EVENT_TO_HIERARCHICAL[event.eventType] || event.eventType;
      const previousState = i === 0 ? 'Booked' : (EVENT_TO_HIERARCHICAL[events[i - 1].eventType] || events[i - 1].eventType);

      await prisma.shipmentEvent.update({
        where: { id: event.id },
        data: {
          sequence: i + 1,
          previousState,
          computedState,
          actor: event.performedBy || 'system',
          isValid: true,
        },
      });
      totalUpdated++;
    }
  }

  console.log(`Backfill complete. Updated ${totalUpdated} events across ${shipments.length} shipments.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
