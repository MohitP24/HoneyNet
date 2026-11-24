/**
 * Swagger / OpenAPI spec for the HoneyNet backend API.
 * This file is purely additive — it only defines the documentation.
 * No existing routes, middleware, or services are modified.
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI-Driven Adaptive HoneyNet API',
      version: '1.0.0',
      description:
        'Live API documentation for the HoneyNet backend. Use this UI to send requests and inspect real server responses including AI classification scores, attacker profiles, adaptation history, and honeypot service stats.',
      contact: {
        name: 'HoneyNet Project'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local development server'
      },
      {
        url: 'http://192.168.1.40:3000',
        description: 'LAN / Wi-Fi (accessible from phone and other devices)'
      }
    ],
    tags: [
      { name: 'Stats',        description: 'Overall attack statistics and timelines' },
      { name: 'Events',       description: 'Raw honeypot events (SSH, HTTP, FTP, Telnet, MySQL)' },
      { name: 'Attackers',    description: 'Attacker profiles and threat levels' },
      { name: 'Adaptations',  description: 'Dynamic banner changes and honeyfile modifications' },
      { name: 'Services',     description: 'Honeypot service status (port, event count, active/offline)' },
      { name: 'Health',       description: 'Server health and uptime' }
    ],
    paths: {
      // ─── Health ───────────────────────────────────────────────────────────
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Server health check',
          description: 'Returns server uptime, database connection status, and log watcher status.',
          responses: {
            200: {
              description: 'Server is healthy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status:    { type: 'string', example: 'healthy' },
                      timestamp: { type: 'string', example: '2026-11-24T17:00:00.000Z' },
                      uptime:    { type: 'number', example: 3600.5 },
                      database:  { type: 'string', example: 'connected' },
                      logWatcher:{ type: 'string', example: 'active' }
                    }
                  }
                }
              }
            }
          }
        }
      },

      // ─── Stats ────────────────────────────────────────────────────────────
      '/api/stats': {
        get: {
          tags: ['Stats'],
          summary: 'Overall attack statistics',
          description: 'Returns severity distribution, event type counts, top attackers, timeline, and recent adaptations.',
          responses: {
            200: {
              description: 'Attack statistics summary',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      severity_distribution: { type: 'array', items: { type: 'object' } },
                      event_type_distribution:{ type: 'array', items: { type: 'object' } },
                      counts: {
                        type: 'object',
                        properties: {
                          total_events:          { type: 'integer', example: 165 },
                          total_sessions:        { type: 'integer', example: 42 },
                          total_attackers:       { type: 'integer', example: 12 },
                          total_adaptations:     { type: 'integer', example: 7 },
                          active_sessions:       { type: 'integer', example: 3 },
                          high_threat_attackers: { type: 'integer', example: 4 }
                        }
                      },
                      timeline:            { type: 'array', items: { type: 'object' } },
                      top_attackers:       { type: 'array', items: { type: 'object' } },
                      recent_adaptations:  { type: 'array', items: { type: 'object' } }
                    }
                  }
                }
              }
            }
          }
        }
      },

      // ─── Services ─────────────────────────────────────────────────────────
      '/api/services': {
        get: {
          tags: ['Services'],
          summary: 'Honeypot services status',
          description: 'Lists all honeypot services (SSH, HTTP, FTP, Telnet, MySQL) with their ports, active status, and live event counts.',
          responses: {
            200: {
              description: 'List of honeypot services',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      services: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id:                   { type: 'integer', example: 1 },
                            service_name:         { type: 'string',  example: 'HTTP' },
                            port:                 { type: 'integer', example: 8080 },
                            protocol:             { type: 'string',  example: 'http' },
                            is_active:            { type: 'boolean', example: true },
                            total_events:         { type: 'integer', example: 5 },
                            high_severity_events: { type: 'integer', example: 2 },
                            last_active:          { type: 'string',  example: '2026-11-24T17:00:00Z' }
                          }
                        }
                      },
                      total: { type: 'integer', example: 5 }
                    }
                  }
                }
              }
            }
          }
        }
      },

      // ─── Events ───────────────────────────────────────────────────────────
      '/api/events': {
        get: {
          tags: ['Events'],
          summary: 'List honeypot events',
          description: 'Returns paginated honeypot events from SSH, HTTP, FTP, Telnet, and MySQL sensors, with optional filters.',
          parameters: [
            { name: 'limit',    in: 'query', schema: { type: 'integer', default: 50 },   description: 'Number of events to return' },
            { name: 'offset',   in: 'query', schema: { type: 'integer', default: 0 },    description: 'Pagination offset' },
            { name: 'severity', in: 'query', schema: { type: 'string', enum: ['LOW','MEDIUM','HIGH','CRITICAL'] }, description: 'Filter by severity' },
            { name: 'service',  in: 'query', schema: { type: 'string', enum: ['SSH','HTTP','FTP','Telnet','MySQL'] }, description: 'Filter by honeypot service' }
          ],
          responses: {
            200: {
              description: 'List of events',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      events: { type: 'array', items: { type: 'object' } },
                      total:  { type: 'integer', example: 165 }
                    }
                  }
                }
              }
            }
          }
        }
      },

      '/api/events/{id}': {
        get: {
          tags: ['Events'],
          summary: 'Get single event by ID',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'UUID of the event' }
          ],
          responses: {
            200: { description: 'Event detail' },
            404: { description: 'Event not found' }
          }
        }
      },

      // ─── Attackers ────────────────────────────────────────────────────────
      '/api/attackers': {
        get: {
          tags: ['Attackers'],
          summary: 'List attacker profiles',
          description: 'Returns attacker profiles with IP, threat level, event count, country, and high severity activity.',
          parameters: [
            { name: 'limit',        in: 'query', schema: { type: 'integer', default: 50 } },
            { name: 'threat_level', in: 'query', schema: { type: 'string', enum: ['LOW','MEDIUM','HIGH','CRITICAL'] } }
          ],
          responses: {
            200: { description: 'List of attackers' }
          }
        }
      },

      '/api/attackers/{id}': {
        get: {
          tags: ['Attackers'],
          summary: 'Get single attacker by ID',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
          ],
          responses: {
            200: { description: 'Attacker profile' },
            404: { description: 'Attacker not found' }
          }
        }
      },

      // ─── Adaptations ──────────────────────────────────────────────────────
      '/api/adaptations': {
        get: {
          tags: ['Adaptations'],
          summary: 'List adaptation events',
          description: 'Returns the history of dynamic adaptations: banner changes, honeyfile modifications, Cowrie restarts.',
          parameters: [
            { name: 'limit',  in: 'query', schema: { type: 'integer', default: 50 } },
            { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } }
          ],
          responses: {
            200: { description: 'List of adaptation records' }
          }
        }
      },

      '/api/adaptations/stats/summary': {
        get: {
          tags: ['Adaptations'],
          summary: 'Adaptation statistics summary',
          responses: {
            200: { description: 'Summary stats for all adaptations' }
          }
        }
      },

      '/api/services/stats': {
        get: {
          tags: ['Services'],
          summary: 'Per-service event statistics',
          description: 'Returns event breakdown per honeypot service: total events, unique attackers, severity counts, first/last attack time.',
          responses: {
            200: { description: 'Service-level stats from the service_stats view' }
          }
        }
      }
    }
  },
  apis: [] // Routes are defined inline above, not in JSDoc comments
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
