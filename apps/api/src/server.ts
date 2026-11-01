import { createApp } from './app'
import { AppConfig } from './config/AppConfig'

async function main(): Promise<void> {
  const config = AppConfig.fromEnv()
  const app = await createApp(config)
  await app.listen({ port: config.port, host: config.host })
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
