import { db, platformSchema } from '@/lib/db'
import { MarketplaceClient } from './MarketplaceClient'

export default async function MarketplacePage() {
  const [apps, offerings] = await Promise.all([
    db.select({
      id:                platformSchema.platformApps.id,
      name:              platformSchema.platformApps.name,
      isActive:          platformSchema.platformApps.isActive,
      showInMarketplace: platformSchema.platformApps.showInMarketplace,
    }).from(platformSchema.platformApps).orderBy(platformSchema.platformApps.id),
    db.select({
      hostAppId:  platformSchema.appMarketplaceOfferings.hostAppId,
      guestAppId: platformSchema.appMarketplaceOfferings.guestAppId,
      isEnabled:  platformSchema.appMarketplaceOfferings.isEnabled,
    }).from(platformSchema.appMarketplaceOfferings),
  ])

  return <MarketplaceClient apps={apps} offerings={offerings} />
}
