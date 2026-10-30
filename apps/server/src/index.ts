import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import fastifyStatic from '@fastify/static'
import { AgentRuntime } from '@office/agent-runtime'
import { createProvider } from '@office/llm-provider'
import { createCompanyState } from '@office/shared'
import { TaskEngine } from '@office/task-engine'
import Fastify from 'fastify'
import { Company } from './company'
import { config } from './config'
import { openDatabase } from './db'
import { registerRoutes } from './routes'

const app = Fastify({ logger: { level: 'warn' } })
const log = (msg: string) => app.log.warn(msg)

// 1. Load the company from SQLite (or seed the fixed org on first run).
const db = openDatabase(config.databaseUrl, log)
const loaded = await db.load()
const company = new Company(loaded?.state ?? createCompanyState(), loaded?.seq ?? 0)
if (!loaded) await db.seed(company.state)

// 2. Wire the pipeline: every event is persisted, then the runtime reacts.
const provider = createProvider(config.provider, { speed: config.speed, blockRate: config.blockRate }, log)
const engine = new TaskEngine({ getState: company.getState, emit: company.emit })
const runtime = new AgentRuntime({ engine, provider, getState: company.getState, emit: company.emit, speed: config.speed, log })
company.subscribe((e) => db.persist(e, company.state))
company.subscribe((e) => runtime.handleEvent(e.event))
runtime.resume()
if (config.ambient) runtime.startAmbient()

// 3. HTTP: API + event stream, plus the built web app when present (npm run build).
registerRoutes(app, { company, runtime, provider: provider.name, speed: config.speed })
const webDist = resolve(dirname(fileURLToPath(import.meta.url)), '../../web/dist')
if (config.serveWeb && existsSync(webDist)) {
  await app.register(fastifyStatic, { root: webDist })
  app.setNotFoundHandler((req, reply) =>
    req.url.startsWith('/api/') ? reply.code(404).send({ error: 'Not found' }) : reply.sendFile('index.html'),
  )
}

const shutdown = async () => {
  await app.close()
  await db.flush()
  await db.close()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

await app.listen({ port: config.port, host: config.host })
console.log(
  `[server] Claude Office API on http://${config.host}:${config.port} · provider=${provider.name} · speed=${config.speed}x` +
    (loaded ? ` · loaded ${Object.keys(company.state.tasks).length} tasks` : ' · seeded a fresh company'),
)
