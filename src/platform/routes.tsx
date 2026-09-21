import { Route } from 'react-router-dom'
import { PlatformRoute } from '@/platform/auth/PlatformRoute'
import { PlatformLayout } from '@/platform/layout/PlatformLayout'
import { PlatformLoginPage } from '@/platform/pages/PlatformLogin'
import { PlatformOverviewPage } from '@/platform/pages/PlatformOverview'
import { PlatformRestaurantsPage } from '@/platform/pages/PlatformRestaurants'
import { PlatformOrganizationsPage } from '@/platform/pages/PlatformOrganizations'
import { PlatformRevenuePage } from '@/platform/pages/PlatformRevenue'
import { PlatformAcquisitionsPage } from '@/platform/pages/PlatformAcquisitions'
import { PlatformAdminsPage } from '@/platform/pages/PlatformAdmins'
import { PlatformAccountsPage } from '@/platform/pages/PlatformAccounts'
import { PlatformAuditLogsPage } from '@/platform/pages/PlatformAuditLogs'
import { PlatformPricingPage } from '@/platform/pages/PlatformPricing'
import { PlatformNotificationsPage } from '@/platform/pages/PlatformNotifications'
import { PlatformProvisionPage } from '@/platform/pages/PlatformProvision'
import { PlatformSubscriptionsPage } from '@/platform/pages/PlatformSubscriptions'

/**
 * Platform Owner console routes. Isolated from restaurant `/app` so the two
 * dashboards can evolve independently. URLs stay `/platform/*`.
 *
 * Exported as a fragment (not a component) because `<Routes>` only accepts
 * `<Route>` / fragments as children — a custom wrapper would drop the tree.
 */
export const platformRouteTree = (
  <>
    <Route path="/platform/login" element={<PlatformLoginPage />} />
    <Route element={<PlatformRoute />}>
      <Route path="/platform" element={<PlatformLayout />}>
        <Route index element={<PlatformOverviewPage />} />
        <Route path="restaurants" element={<PlatformRestaurantsPage />} />
        <Route path="organizations" element={<PlatformOrganizationsPage />} />
        <Route path="revenue" element={<PlatformRevenuePage />} />
        <Route path="acquisitions" element={<PlatformAcquisitionsPage />} />
        <Route path="admins" element={<PlatformAdminsPage />} />
        <Route path="accounts" element={<PlatformAccountsPage />} />
        <Route path="audit-logs" element={<PlatformAuditLogsPage />} />
        <Route path="pricing" element={<PlatformPricingPage />} />
        <Route path="subscriptions" element={<PlatformSubscriptionsPage />} />
        <Route path="notifications" element={<PlatformNotificationsPage />} />
        <Route path="provision" element={<PlatformProvisionPage />} />
      </Route>
    </Route>
  </>
)
