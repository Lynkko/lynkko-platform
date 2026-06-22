import type { Config } from 'drizzle-kit'

export default {
  schema: './src/lib/db.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.PLATFORM_DATABASE_URL!,
  },
} satisfies Config
