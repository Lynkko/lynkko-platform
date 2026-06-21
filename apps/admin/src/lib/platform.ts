import { createPlatformClient } from '@lynkko/platform'
import { db } from './db'

export const platform = createPlatformClient(db)
