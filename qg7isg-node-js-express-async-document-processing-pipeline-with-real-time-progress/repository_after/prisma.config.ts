import 'dotenv/config'
import { defineConfig } from 'prisma/config'

// Use DATABASE_URL from env, or fallback for local Docker (matches docker-compose: postgres/1234)
const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:1234@localhost:5432/processing_db'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: DATABASE_URL,
  },
})