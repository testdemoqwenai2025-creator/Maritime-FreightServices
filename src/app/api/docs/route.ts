import { NextResponse } from 'next/server'

export async function GET() {
  const spec = {
    openapi: '3.0.0',
    info: {
      title: 'Maritime & Freight Analytics API',
      version: '0.3.0',
      description: 'Comprehensive REST API for global maritime analytics — vessel tracking, port operations, shipment logistics, trade data, and real-time streaming.',
      contact: { name: 'Maritime & Freight Services', url: 'https://github.com/testdemoqwenai2025-creator/Maritime-FreightServices' },
      license: { name: 'MIT' },
    },
    servers: [{ url: 'https://api.maritime.example.com', description: 'Production' }, { url: 'http://localhost:3000', description: 'Development' }],
    paths: {
      '/': { get: { summary: 'Dashboard UI', description: 'Server-rendered analytics dashboard with 10+ tabs, real-time vessel map, and interactive charts.', tags: ['UI'], responses: { '200': { description: 'HTML dashboard page' } } } },
      '/about': { get: { summary: 'Platform Overview', description: 'Platform info page with live statistics, API reference, tech stack, and roadmap.', tags: ['UI'], responses: { '200': { description: 'HTML about page' } } } },
      '/docs': { get: { summary: 'API Documentation', description: 'Interactive API documentation with try-it functionality and OpenAPI spec browser.', tags: ['UI'], responses: { '200': { description: 'HTML API docs page' } } } },
      '/api': { get: { summary: 'API Heartbeat', description: 'Returns API status and available endpoint count.', tags: ['System'], responses: { '200': { description: 'API status' } } } },
      '/api/health': { get: { summary: 'Health Check', description: 'Server diagnostics — uptime, memory usage, database connectivity, response time.', tags: ['System'], responses: { '200': { description: 'Health status object' }, '503': { description: 'Degraded — database disconnected' } } } },
      '/api/dashboard': { get: { summary: 'Aggregated KPIs', description: 'Platform-wide metrics: vessel/port/shipment counts, status breakdowns, trade overview, congestion data, carrier stats, alliance distribution.', tags: ['Analytics'], parameters: [], responses: { '200': { description: 'Dashboard summary object' } } } },
      '/api/search': { get: { summary: 'Unified Search', description: 'Full-text search across vessels, ports, shipments, and carriers. Returns grouped results.', tags: ['Search'], parameters: [
        { name: 'q', in: 'query', required: true, schema: { type: 'string' }, description: 'Search term' },
        { name: 'type', in: 'query', required: false, schema: { type: 'string', enum: ['vessel', 'port', 'shipment', 'carrier', 'all'], default: 'all' }, description: 'Filter by entity type' },
      ], responses: { '200': { description: 'Search results grouped by entity type' } } } },
      '/api/vessels': { get: { summary: 'List Vessels', description: 'Paginated vessel listing with carrier and trade route info.', tags: ['Fleet'], parameters: [
        { name: 'status', in: 'query', schema: { type: 'string' } },
        { name: 'type', in: 'query', schema: { type: 'string' } },
        { name: 'carrier', in: 'query', schema: { type: 'string' } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
      ], responses: { '200': { description: 'Vessel array with pagination' } } } },
      '/api/vessels/stream': { get: { summary: 'Real-time Vessel Stream', description: 'Server-Sent Events stream of simulated vessel positions. 80 vessels across 15 shipping lanes, updated every 5 seconds. Auto-closes after 5 minutes.', tags: ['Real-time'], responses: { '200': { description: 'SSE text/event-stream' } } } },
      '/api/ports': { get: { summary: 'List Ports', description: 'Global port directory with congestion levels, country, and TEU capacity.', tags: ['Infrastructure'], parameters: [
        { name: 'country', in: 'query', schema: { type: 'string' } },
        { name: 'region', in: 'query', schema: { type: 'string' } },
        { name: 'congestion', in: 'query', schema: { type: 'string' } },
      ], responses: { '200': { description: 'Port array' } } } },
      '/api/shipments': { get: { summary: 'List Shipments', description: 'Shipment tracking with carrier, route, and container details.', tags: ['Logistics'], parameters: [
        { name: 'status', in: 'query', schema: { type: 'string' } },
        { name: 'carrier', in: 'query', schema: { type: 'string' } },
        { name: 'route', in: 'query', schema: { type: 'string' } },
      ], responses: { '200': { description: 'Shipment array' } } } },
      '/api/containers': { get: { summary: 'List Containers', description: 'Container inventory with status, type, and weight.', tags: ['Logistics'], parameters: [
        { name: 'status', in: 'query', schema: { type: 'string' } },
        { name: 'type', in: 'query', schema: { type: 'string' } },
      ], responses: { '200': { description: 'Container array' } } } },
      '/api/documents': { get: { summary: 'List Documents', description: 'Shipping document registry with approval status.', tags: ['Documents'], parameters: [
        { name: 'status', in: 'query', schema: { type: 'string' } },
        { name: 'type', in: 'query', schema: { type: 'string' } },
      ], responses: { '200': { description: 'Document array' } } } },
      '/api/events': { get: { summary: 'List Events', description: 'Maritime event log with severity levels.', tags: ['Events'], parameters: [
        { name: 'type', in: 'query', schema: { type: 'string' } },
        { name: 'severity', in: 'query', schema: { type: 'string' } },
      ], responses: { '200': { description: 'Event array' } } } },
      '/api/carriers': { get: { summary: 'List Carriers', description: 'Carrier directory with fleet size, TEU capacity, reliability scores, and alliance membership.', tags: ['Fleet'], parameters: [
        { name: 'alliance', in: 'query', schema: { type: 'string' } },
      ], responses: { '200': { description: 'Carrier array' } } } },
      '/api/trade-routes': { get: { summary: 'List Trade Routes', description: 'Trade route definitions with distance and typical transit time.', tags: ['Trade'], responses: { '200': { description: 'Trade route array' } } } },
      '/api/cargo-types': { get: { summary: 'List Cargo Types', description: 'Cargo classification registry with HS code mappings.', tags: ['Trade'], responses: { '200': { description: 'Cargo type array' } } } },
      '/api/charters': { get: { summary: 'List Charters', description: 'Charter agreements with rate, duration, and status.', tags: ['Commercial'], parameters: [
        { name: 'type', in: 'query', schema: { type: 'string' } },
        { name: 'status', in: 'query', schema: { type: 'string' } },
      ], responses: { '200': { description: 'Charter array' } } } },
      '/api/bookings': { get: { summary: 'List Bookings', description: 'Booking management with status tracking.', tags: ['Commercial'], parameters: [
        { name: 'status', in: 'query', schema: { type: 'string' } },
      ], responses: { '200': { description: 'Booking array' } } } },
      '/api/trade-data': { get: { summary: 'Trade Statistics', description: 'Aggregated trade data with values, weights, CO2 emissions by partner and route.', tags: ['Analytics'], responses: { '200': { description: 'Trade statistics object' } } } },
    },
    tags: [
      { name: 'UI', description: 'Server-rendered pages' },
      { name: 'System', description: 'Health and diagnostics' },
      { name: 'Analytics', description: 'Aggregated metrics and statistics' },
      { name: 'Search', description: 'Full-text search' },
      { name: 'Fleet', description: 'Vessel and carrier management' },
      { name: 'Infrastructure', description: 'Port operations' },
      { name: 'Logistics', description: 'Shipments and containers' },
      { name: 'Documents', description: 'Shipping documentation' },
      { name: 'Events', description: 'Maritime event tracking' },
      { name: 'Trade', description: 'Trade routes, cargo types, and statistics' },
      { name: 'Commercial', description: 'Charters and bookings' },
      { name: 'Real-time', description: 'Live data streams' },
    ],
  }

  return NextResponse.json(spec)
}
