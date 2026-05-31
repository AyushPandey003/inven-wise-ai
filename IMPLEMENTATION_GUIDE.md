# Implementation Guide: Advanced Inventory Features

## Quick Start

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Mapbox
1. Get a token from https://account.mapbox.com/tokens/
2. Add to your `.env` file:
```
VITE_MAPBOX_TOKEN=pk.your_token_here
```

### Step 3: Update Database command
```bash
npm run db:push
```

### Step 4: Register API Routes

Update `server/index.ts` to include the new analytics routes:

```typescript
import inventoryAnalyticsRouter from "./routes/inventory-analytics.js";

// Add after other route registrations
app.use("/api/analytics", inventoryAnalyticsRouter);
```

### Step 5: Update App Router

Add new pages to `src/App.tsx`:

```typescript
import AdvancedAnalytics from "@/pages/AdvancedAnalytics";
import WarehouseTransfers from "@/pages/WarehouseTransfers";

// In your Route definitions:
<Route path="/advanced-analytics" element={<AdvancedAnalytics />} />
<Route path="/warehouse-transfers" element={<WarehouseTransfers />} />
```

### Step 6: Update Navigation

Add menu items to your sidebar in `src/components/AppSidebar.tsx`:

```typescript
{
  title: "Advanced Analytics",
  url: "/advanced-analytics",
  icon: BarChart3,
},
{
  title: "Warehouse Transfers",
  url: "/warehouse-transfers",
  icon: ArrowRight,
}
```

---

## Feature Integration Examples

### Generate ABC Analysis Periodically
```typescript
// server/services/analytics.ts
import inventoryAnalyticsRouter from "../routes/inventory-analytics.js";

export async function scheduleAnalytics() {
  // Run ABC analysis weekly
  setInterval(async () => {
    await fetch("http://localhost:3000/api/analytics/abc-analysis", {
      method: "POST"
    });
  }, 7 * 24 * 60 * 60 * 1000); // 7 days
}
```

### Update Warehouse Coordinates

Add latitude/longitude to existing warehouses:

```typescript
// Example: Update warehouse with coordinates
UPDATE warehouses 
SET latitude = 40.7128, longitude = -74.0060 
WHERE name = 'New York Warehouse';
```

### Use Forecast Data in Dashboard
```typescript
import { useQuery } from "@tanstack/react-query";

function DemandForecastWidget() {
  const { data: forecasts } = useQuery({
    queryKey: ["forecasts"],
    queryFn: async () => {
      const response = await fetch("/api/analytics/demand-forecast/product-123", {
        method: "POST",
        body: JSON.stringify({ forecastPeriod: 30 })
      });
      return response.json();
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Predicted Demand Next 30 Days</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{forecasts?.predictedDemand}</p>
        <p className="text-sm text-muted-foreground">
          Confidence: {forecasts?.confidenceInterval}%
        </p>
      </CardContent>
    </Card>
  );
}
```

---

## Data Migration Checklist

- [ ] Create `.env` file with `VITE_MAPBOX_TOKEN`
- [ ] Run database migrations: `npm run db:push`
- [ ] Add warehouse coordinates (latitude/longitude)
- [ ] Register analytics API routes in `server/index.ts`
- [ ] Add new pages to router
- [ ] Update sidebar navigation
- [ ] Test Mapbox map rendering (check browser console)
- [ ] Run initial analytics: `POST /api/analytics/abc-analysis`
- [ ] Verify demand forecast data
- [ ] Test warehouse transfer creation

---

## Common Issues & Solutions

### Issue: Mapbox map not rendering
**Solution:**
- Verify token in `.env`
- Check browser console for errors
- Ensure token has map styles scope
- Clear browser cache

### Issue: No warehouses on map
**Solution:**
- Update warehouses table with latitude/longitude
- Check coordinates are valid (lat: -90 to 90, lng: -180 to 180)
- Verify warehouses have `isActive = true`

### Issue: Forecast endpoint 500 error
**Solution:**
- Ensure product exists in database
- Check `demandSignals` table has historical data
- Verify 90+ days of history available
- Check product ID format (UUID)

### Issue: Transfer creation fails
**Solution:**
- Verify both warehouse IDs exist
- Check product is in source warehouse
- Ensure quantity ≤ available stock
- Check both warehouses are active

---

## Performance Optimization Tips

1. **Batch Analytics Operations**
   - Run ABC analysis during off-peak hours
   - Limit forecast generation to top 100 SKUs

2. **Cache Mapbox Data**
   - Cache warehouse coordinates in Redis
   - Update cache daily

3. **Pagination for Large Datasets**
   - Add pagination to transfers list
   - Limit history to last 90 days

4. **Index Database**
   ```sql
   CREATE INDEX idx_abc_analysis_product ON abc_analysis(product_id);
   CREATE INDEX idx_demand_forecasts_product ON demand_forecasts(product_id);
   CREATE INDEX idx_warehouse_transfers_status ON warehouse_transfers(status);
   ```

---

## Monitoring & Alerts

### Set Alerts For:
- ABC A-items dropping below reorder point (CRITICAL)
- Warehouse utilization > 90% (HIGH)
- Forecast error rate > 20% (MEDIUM)
- Pending transfers > 5 days old (MEDIUM)

### Metrics to Track:
- Average forecast accuracy
- Transfer completion time
- False recommendation rate
- ABC classification stability

---

## Testing Checklist

- [ ] Mapbox map loads without errors
- [ ] Warehouse markers display with correct colors
- [ ] ABC analysis generates results
- [ ] Demand forecast calculates predictions
- [ ] Warehouse transfer creates successfully
- [ ] Transfer status updates work
- [ ] Recommendations display with proper priorities
- [ ] Analytics API responses are valid JSON
- [ ] Database migrations complete without errors
- [ ] Navigation items appear in sidebar

---

## Next Advanced Features to Consider

1. **Machine Learning Optimization**
   - Use SKLearn for advanced forecasting
   - Neural networks for demand patterns

2. **Real-time Alerts**
   - WebSocket integration for live updates
   - Push notifications for critical events

3. **Advanced Visualization**
   - 3D warehouse layout
   - Heat maps for product placement optimization
   - Supply chain network visualization

4. **Integration**
   - ERP system integration
   - Supplier API connections
   - Logistics partner APIs

5. **Reporting**
   - Automated PDF reports
   - Email alerts
   - Executive dashboards

---

## Useful Commands

```bash
# Generate initial data
curl -X POST http://localhost:3000/api/analytics/abc-analysis

# Create warehouse transfer
curl -X POST http://localhost:3000/api/analytics/warehouse-transfer \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "prod-001",
    "fromWarehouseId": "wh-001",
    "toWarehouseId": "wh-002",
    "quantity": 100,
    "reason": "Rebalancing"
  }'

# Get demand forecast
curl -X POST http://localhost:3000/api/analytics/demand-forecast/prod-001 \
  -H "Content-Type: application/json" \
  -d '{"forecastPeriod": 30}'

# Check inventory turnover
curl -X POST http://localhost:3000/api/analytics/inventory-turnover
```
