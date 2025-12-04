// cost-service.js - Realistic cost calculation based on Indian logistics rates
class CostService {
  constructor() {
    // Current fuel rates (₹ per liter) - update regularly
    this.fuelRate = 100; // Diesel price
    this.kmPerLiter = 4; // Truck fuel efficiency
    
    // Labor costs
    this.driverSalaryPerDay = 1500;
    this.helperSalaryPerDay = 800;
  }

  // Main cost calculation function
  calculateShippingCost(distanceKm, weightKg, cargoType, urgency, options = {}) {
    // 1. Calculate fuel cost
    const fuelCost = this.calculateFuelCost(distanceKm);
    
    // 2. Calculate labor cost
    const laborCost = this.calculateLaborCost(distanceKm);
    
    // 3. Calculate vehicle maintenance cost
    const maintenanceCost = this.calculateMaintenanceCost(distanceKm);
    
    // 4. Calculate cargo-specific costs
    const cargoCost = this.calculateCargoSpecificCost(weightKg, cargoType, options);
    
    // 5. Calculate toll and taxes
    const tollTaxCost = this.calculateTollTaxCost(distanceKm);
    
    // 6. Apply urgency multiplier
    const baseCost = fuelCost + laborCost + maintenanceCost + cargoCost + tollTaxCost;
    const urgencyMultiplier = this.getUrgencyMultiplier(urgency);
    const subtotal = baseCost * urgencyMultiplier;
    
    // 7. Add GST (Goods and Services Tax)
    const gst = subtotal * 0.18; // 18% GST
    
    // 8. Add profit margin (20%)
    const profitMargin = subtotal * 0.20;
    
    // Final total
    const totalCost = subtotal + gst + profitMargin;
    
    return {
      distance: distanceKm,
      weight: weightKg,
      cargoType,
      urgency,
      costBreakdown: {
        fuel: Math.ceil(fuelCost),
        labor: Math.ceil(laborCost),
        maintenance: Math.ceil(maintenanceCost),
        cargoHandling: Math.ceil(cargoCost),
        tollsTaxes: Math.ceil(tollTaxCost),
        baseCost: Math.ceil(baseCost),
        urgencySurcharge: Math.ceil(baseCost * (urgencyMultiplier - 1)),
        gst: Math.ceil(gst),
        profitMargin: Math.ceil(profitMargin)
      },
      totalCost: Math.ceil(totalCost),
      deliveryTime: this.calculateDeliveryTime(distanceKm, urgency)
    };
  }

  calculateFuelCost(distanceKm) {
    const fuelRequired = distanceKm / this.kmPerLiter;
    return fuelRequired * this.fuelRate;
  }

  calculateLaborCost(distanceKm) {
    const estimatedDays = Math.max(1, Math.ceil(distanceKm / 400)); // 400km per day
    const driverCost = this.driverSalaryPerDay * estimatedDays;
    const helperCost = this.helperSalaryPerDay * estimatedDays;
    return driverCost + helperCost;
  }

  calculateMaintenanceCost(distanceKm) {
    // Maintenance cost: ₹2 per km (tyres, oil, repairs)
    return distanceKm * 2;
  }

  calculateCargoSpecificCost(weightKg, cargoType, options) {
    let cost = 0;
    
    // Base loading/unloading cost
    cost += 500; // Fixed loading cost
    
    // Weight-based cost
    cost += weightKg * 0.5; // ₹0.5 per kg
    
    // Cargo type specific costs
    const cargoMultipliers = {
      'vegetables': 1.0,
      'fruits': 1.2,
      'grains': 0.8,
      'dairy': 1.5,
      'livestock': 3.0,
      'other': 1.0
    };
    
    cost *= (cargoMultipliers[cargoType] || 1.0);
    
    // Additional options
    if (options.refrigerated) cost += 2000; // Refrigeration cost
    if (options.fragile) cost += 1000; // Special handling
    if (options.insurance) cost += weightKg * 0.1; // Insurance cost
    
    return cost;
  }

  calculateTollTaxCost(distanceKm) {
    // Average toll in India: ₹1.5 per km on highways
    return distanceKm * 1.5;
  }

  getUrgencyMultiplier(urgency) {
    const multipliers = {
      'standard': 1.0,
      'express': 1.4,
      'same_day': 2.5
    };
    return multipliers[urgency] || 1.0;
  }

  calculateDeliveryTime(distanceKm, urgency) {
    const averageDailyDistance = {
      'standard': 400,  // 400km per day (standard)
      'express': 600,   // 600km per day (express)
      'same_day': 800   // 800km per day (same day - multiple drivers)
    };
    
    const dailyKm = averageDailyDistance[urgency] || 400;
    const days = Math.max(1, Math.ceil(distanceKm / dailyKm));
    
    return `${days} day${days > 1 ? 's' : ''}`;
  }
}

export const costService = new CostService();