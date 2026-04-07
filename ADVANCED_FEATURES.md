# Advanced Inventory Management Features

This document outlines the new advanced inventory management features added to the inven-wise-ai system, including Mapbox GL integration and AI-powered analytics.

## 📊 New Features Overview

### 1. **Mapbox GL Warehouse Network Visualization**
Interactive geospatial visualization of all warehouse locations with real-time stock levels and utilization metrics.

**Location:** `src/components/warehouse/WarehouseMap.tsx`

**Features:**
- Real-time warehouse location display on interactive map
- Color-coded markers indicating warehouse utilization (green: normal, yellow: warning, red: critical)
- Warehouse details popup with stock info, capacity, and manager contact
- Click-to-select warehouse functionality
- Auto-zoom to fit all warehouses

**Usage:**
```typescript
import WarehouseMap from "@/components/warehouse/WarehouseMap";

<WarehouseMap 
  warehouses={warehouseData}
  onWarehouseSelect={(warehouse) => {
    // Handle warehouse selection
  }}
  height="h-96"
/>
```

**Setup:**
1. Set your Mapbox token in `.env`:
   ```
   VITE_MAPBOX_TOKEN=your_mapbox_token
   ```
2. Get a free token from https://account.mapbox.com/tokens/

---

### 2. **ABC Inventory Analysis (Pareto Classification)**
Automatically classifies products into three categories based on their annual consumption value:
- **A Items**: Top 20% of inventory value → ~80% of total value (critical)
- **B Items**: Middle 30% → ~15% of total value (important)
- **C Items**: Bottom 50% → ~5% of total value (low priority)

**Location:** `server/routes/inventory-analytics.ts` → `POST /api/analytics/abc-analysis`

**Benefits:**
- Identify high-value items requiring tight stock control
- Reduce safety stock for low-value items (C items)
- Focus resources on items with highest impact
- Optimize reorder frequencies by category

**Example Response:**
```json
{
  "message": "ABC analysis completed",
  "summary": {
    "aItems": 45,
    "bItems": 120,
    "cItems": 335
  },
  "classifications": [...]
}
```

---

### 3. **Inventory Turnover Analysis**
Calculates how efficiently inventory is moving through the warehouse.

**Metrics:**
- **Turnover Ratio**: How many times inventory is sold/used in a period
- **Days Inventory Outstanding (DIO)**: Average days inventory sits before being sold
- **COGS**: Cost of Goods Sold

**Location:** `server/routes/inventory-analytics.ts` → `POST /api/analytics/inventory-turnover`

**Interpretation:**
- High turnover ratio = inventory moving quickly (better)
- Low DIO = less capital tied up in inventory (better)

---

### 4. **Demand Forecasting**
AI-powered demand prediction for different products using exponential smoothing or seasonal analysis.

**Location:** `server/routes/inventory-analytics.ts` → `POST /api/analytics/demand-forecast/:productId`

**Algorithms:**
- Simple Moving Average
- Exponential Smoothing (default)
- Polynomial Regression
- Seasonal Decomposition

**Example Request:**
```bash
POST /api/analytics/demand-forecast/product-123
{
  "forecastPeriod": 30,
  "method": "exponential-smoothing"
}
```

**Example Response:**
```json
{
  "productId": "product-123",
  "predictedDemand": 145,
  "forecastPeriod": 30,
  "confidenceInterval": 85,
  "historicalAverage": 138
}
```

---

### 5. **Inventory Optimization Recommendations**
Automated suggestions for inventory optimization based on current levels and trends.

**Recommendation Types:**

#### **Reorder (High Priority)**
- Triggered when stock ≤ reorder point
- Suggests quantity to maintain optimal levels
- Estimated cost of delay shown

#### **Reduce (Medium Priority)**
- Triggered when stock > reorder point × 5
- Suggests reducing overstock to free up capital
- Estimated cash freed up shown

#### **Transfer (Medium Priority)**
- Triggered when warehouse utilization > 85%
- Suggests redistributing inventory across locations
- Optimizes warehouse space usage

#### **Obsolete (Low Priority)**
- Identifies slow-moving or dead stock
- Suggests disposal or alternative channels

#### **Bundle (Medium Priority)**
- Suggests bundling frequently bought items together
- Increases sell-through rate

**Location:** `server/routes/inventory-analytics.ts` → `POST /api/analytics/recommendations`

---

### 6. **Warehouse Transfer Management**
Centralized system for managing inter-warehouse inventory movements.

**Location:** `src/pages/WarehouseTransfers.tsx`

**Features:**
- Create new transfers with reason tracking
- Status progression: Pending → In Transit → Received
- Automatic warehouse balancing recommendations
- Transfer history and analytics
- Real-time capacity utilization dashboard

**Transfer Statuses:**
- **Pending**: Transfer created, awaiting shipment
- **In Transit**: Product on the way
- **Received**: Transfer completed
- **Cancelled**: Transfer cancelled

**Example API Usage:**
```bash
POST /api/analytics/warehouse-transfer
{
  "productId": "prod-001",
  "fromWarehouseId": "wh-001",
  "toWarehouseId": "wh-002",
  "quantity": 500,
  "reason": "Inventory rebalancing"
}
```

---

### 7. **Advanced Analytics Dashboard**
Comprehensive dashboard combining all advanced features.

**Location:** `src/pages/AdvancedAnalytics.tsx`

**Dashboard Sections:**

1. **Optimization Recommendations Widget**
   - Shows top 3 actionable recommendations
   - Color-coded by priority
   - Includes estimated ROI/impact

2. **Warehouse Network Map**
   - Interactive map of all warehouses
   - Real-time capacity visualization
   - Warehouse selection capability

3. **ABC Analysis View**
   - Distribution pie chart
   - Top A items list
   - Classification breakdown

4. **Inventory Turnover View**
   - Top 10 items by turnover
   - Warehouse utilization progress bars
   - DIO analysis

5. **Demand Forecast View**
   - 30-day forecast chart
   - Actual vs. predicted comparison
   - Trend analysis

---

## 🗄️ Database Schema Extensions

### New Tables

#### `abc_analysis`
```sql
CREATE TABLE abc_analysis (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  classification ENUM('A', 'B', 'C'),
  annual_consumption_value NUMERIC,
  percentage_of_value NUMERIC,
  last_updated TIMESTAMP
);
```

#### `inventory_turnover_metrics`
```sql
CREATE TABLE inventory_turnover_metrics (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  period ENUM('monthly', 'quarterly', 'annually'),
  cogs NUMERIC,
  average_inventory NUMERIC,
  turnover_ratio NUMERIC,
  days_inventory_outstanding NUMERIC,
  start_date TIMESTAMP,
  end_date TIMESTAMP
);
```

#### `demand_forecasts`
```sql
CREATE TABLE demand_forecasts (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  forecast_method ENUM('simple-moving-average', 'exponential-smoothing', 'polynomial', 'seasonal'),
  forecast_period INTEGER,
  predicted_demand NUMERIC,
  forecasted_date TIMESTAMP,
  confidence_interval NUMERIC,
  actual_demand NUMERIC,
  accuracy NUMERIC
);
```

#### `warehouse_transfers`
```sql
CREATE TABLE warehouse_transfers (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  from_warehouse_id UUID REFERENCES warehouses(id),
  to_warehouse_id UUID REFERENCES warehouses(id),
  quantity INTEGER,
  status ENUM('pending', 'in-transit', 'received', 'cancelled'),
  reason TEXT,
  expected_arrival TIMESTAMP,
  actual_arrival TIMESTAMP
);
```

#### `inventory_recommendations`
```sql
CREATE TABLE inventory_recommendations (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  recommendation_type ENUM('reorder', 'reduce', 'transfer', 'obsolete', 'bundle'),
  priority ENUM('low', 'medium', 'high', 'critical'),
  estimated_roi NUMERIC,
  confidence NUMERIC,
  implemented_at TIMESTAMP
);
```

### Enhanced Warehouses Table
```sql
ALTER TABLE warehouses ADD COLUMN latitude NUMERIC(10, 6);
ALTER TABLE warehouses ADD COLUMN longitude NUMERIC(10, 6);
```

---

## 🔌 API Endpoints Reference

### Analytics Routes
```
POST   /api/analytics/abc-analysis
GET    /api/analytics/abc-analysis
POST   /api/analytics/inventory-turnover
POST   /api/analytics/demand-forecast/:productId
POST   /api/analytics/recommendations
POST   /api/analytics/warehouse-transfer
GET    /api/analytics/warehouse-transfers
```

---

## 📈 Best Practices

### ABC Analysis
1. **Review quarterly** to identify shifting patterns
2. **Adjust safety stock** based on classification
3. **Focus purchasing** on A items
4. **Reduce storage** for C items where possible

### Inventory Turnover
1. **Target high turnover** for perishable items
2. **Investigate low turnover** items for obsolescence
3. **Balance** between turnover and stockouts
4. **Monitor seasonality** for demand variations

### Demand Forecasting
1. **Use historical data** minimum 90 days for accuracy
2. **Factor in seasonality** for seasonal products
3. **Adjust forecasts** based on events/promotions
4. **Track actual vs. forecast** to improve accuracy

### Warehouse Transfers
1. **Plan transfers** during low-traffic periods
2. **Use for load balancing** when utilization > 85%
3. **Track transit time** to optimize logistics
4. **Document reasons** for transfer audit trail

### Recommendations
1. **Action critical priority** items immediately
2. **Batch high priority** together for efficiency
3. **Track recommendation ROI** to improve algorithm
4. **Review rejected** recommendations to refine logic

---

## 🔐 Configuration

### Environment Variables
```
VITE_MAPBOX_TOKEN=your_mapbox_token_here
DATABASE_URL=postgresql://...
```

### Dependencies Added
```
@mapbox/mapbox-gl@^3.5.0
react-map-gl@^7.1.7
simple-statistics@^7.8.3
@types/mapbox-gl@^1.13.0
```

---

## 📊 Monitoring & KPIs

### Key Performance Indicators

| Metric | Target | Review | Impact |
|--------|--------|--------|--------|
| Inventory Turnover | >4x/year | Monthly | Cash flow efficiency |
| Stock-out Rate | <2% | Weekly | Customer satisfaction |
| Warehouse Utilization | 70-85% | Weekly | Storage cost |
| Forecast Accuracy | >85% | Monthly | Order accuracy |
| ABC A-Item Accuracy | >90% | Quarterly | Focus effectiveness |

---

## 🚀 Getting Started

1. **Run Database Migrations:**
   ```bash
   npm run db:push
   ```

2. **Set Mapbox Token:**
   ```bash
   echo "VITE_MAPBOX_TOKEN=your_token" >> .env
   ```

3. **Update Warehouse Locations:**
   - Add latitude/longitude to existing warehouses
   - Use Google Maps or Mapbox for coordinates

4. **Generate Initial Analytics:**
   ```bash
   curl -X POST http://localhost:3000/api/analytics/abc-analysis
   curl -X POST http://localhost:3000/api/analytics/inventory-turnover
   ```

5. **Schedule Periodic Updates:**
   - ABC Analysis: Weekly
   - Demand Forecast: Daily
   - Recommendations: Daily
   - Turnover Metrics: Monthly

---

## 🤝 Integration Examples

### Frontend - Display ABC Analysis
```typescript
import { useQuery } from "@tanstack/react-query";

function ABCAnalysis() {
  const { data } = useQuery({
    queryKey: ["abc-analysis"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/abc-analysis");
      return res.json();
    }
  });

  return (
    <div>
      <p>A Items: {data?.summary.aItems}</p>
      <p>B Items: {data?.summary.bItems}</p>
      <p>C Items: {data?.summary.cItems}</p>
    </div>
  );
}
```

### Backend - Generate Forecasts for All Products
```typescript
async function generateDailyForecasts() {
  const products = await db.select().from(products);
  
  for (const product of products) {
    await generateForecast(product.id, 30, "exponential-smoothing");
  }
}
```

---

## 📞 Support & Troubleshooting

### Mapbox Map Not Showing
- Check token is set correctly in `.env`
- Verify token has appropriate scopes
- Check browser console for errors

### No Forecast Data
- Ensure minimum 90 days of historical data
- Check `demandSignals` table has entries
- Verify `signalType` is "purchase"

### Transfer Issues
- Verify both warehouses exist
- Check product exists in source warehouse
- Ensure quantity doesn't exceed available stock

---

## 📚 Additional Resources

- Mapbox Documentation: https://docs.mapbox.com/mapbox-gl-js/
- React Map GL: https://visgl.github.io/react-map-gl/
- ABC Analysis: https://en.wikipedia.org/wiki/ABC_analysis
- Demand Forecasting: https://en.wikipedia.org/wiki/Demand_forecasting
