// distance-service.js - Real distance calculation service
import { googleMapsApiKey } from './firebaseConfig.js';

class DistanceService {
  constructor() {
    this.apiKey = googleMapsApiKey;
    this.cache = new Map(); // Simple cache to avoid duplicate API calls
  }

  // Main function to calculate real distance
  async calculateRealDistance(origin, destination) {
    const cacheKey = `${origin}-${destination}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      console.log('Calculating distance from:', origin, 'to:', destination);
      
      // First, geocode addresses to get coordinates
      const originCoords = await this.geocodeAddress(origin);
      const destCoords = await this.geocodeAddress(destination);
      
      if (!originCoords || !destCoords) {
        throw new Error('Could not geocode addresses');
      }

      // Calculate road distance using Google Distance Matrix API
      const distance = await this.getRoadDistance(originCoords, destCoords);
      
      // Cache the result
      this.cache.set(cacheKey, distance);
      
      return distance;
      
    } catch (error) {
      console.error('Distance calculation failed:', error);
      // Fallback to straight-line distance
      return this.calculateStraightLineDistance(origin, destination);
    }
  }

  // Geocode address to coordinates
  async geocodeAddress(address) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${this.apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK' && data.results[0]) {
        const location = data.results[0].geometry.location;
        return {
          lat: location.lat,
          lng: location.lng
        };
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  // Get actual road distance using Distance Matrix API
  async getRoadDistance(originCoords, destCoords) {
    try {
      const origin = `${originCoords.lat},${originCoords.lng}`;
      const destination = `${destCoords.lat},${destCoords.lng}`;
      
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&key=${this.apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK' && data.rows[0].elements[0].status === 'OK') {
        const distanceMeters = data.rows[0].elements[0].distance.value;
        const distanceKm = distanceMeters / 1000;
        
        console.log('Road distance calculated:', distanceKm, 'km');
        return Math.ceil(distanceKm);
      } else {
        throw new Error('Distance Matrix API error: ' + data.status);
      }
    } catch (error) {
      console.error('Road distance calculation failed:', error);
      throw error;
    }
  }

  // Fallback: Calculate straight-line distance
  calculateStraightLineDistance(origin, destination) {
    // Common Indian city distances (fallback)
    const cityDistances = {
      // North India
      'delhi-chandigarh': 250, 'delhi-jaipur': 280, 'delhi-dehradun': 250,
      'delhi-lucknow': 550, 'delhi-amritsar': 450,
      
      // West India
      'mumbai-pune': 150, 'mumbai-ahmedabad': 530, 'mumbai-goa': 600,
      'mumbai-hyderabad': 700, 'mumbai-surat': 280,
      
      // South India
      'bangalore-chennai': 350, 'bangalore-hyderabad': 570, 
      'bangalore-kochi': 550, 'bangalore-coimbatore': 360,
      'chennai-hyderabad': 625, 'chennai-bangalore': 350,
      
      // East India
      'kolkata-patna': 550, 'kolkata-bhubaneswar': 440,
      'kolkata-guwahati': 980, 'kolkata-ranchi': 400,
      
      // Major routes
      'delhi-mumbai': 1400, 'delhi-bangalore': 2150, 'delhi-chennai': 2200,
      'delhi-kolkata': 1300, 'mumbai-chennai': 1300, 'mumbai-kolkata': 1650,
      'bangalore-delhi': 2150, 'chennai-kolkata': 1350,
      'hyderabad-mumbai': 700, 'hyderabad-delhi': 1250
    };
    
    const key = `${origin.toLowerCase()}-${destination.toLowerCase()}`;
    const reverseKey = `${destination.toLowerCase()}-${origin.toLowerCase()}`;
    
    const distance = cityDistances[key] || cityDistances[reverseKey];
    
    if (distance) {
      console.log('Using cached distance:', distance, 'km');
      return distance;
    }
    
    // Default average distance
    console.log('Using default distance: 800 km');
    return 800;
  }

  // Calculate delivery time based on distance and road conditions
  calculateDeliveryTime(distanceKm, urgency) {
    const averageSpeed = 45; // km/h considering Indian road conditions
    const drivingHoursPerDay = 10; // Maximum driving hours per day
    const restHoursPerDay = 2; // Rest breaks
    
    const totalHours = distanceKm / averageSpeed;
    const totalDays = Math.ceil(totalHours / drivingHoursPerDay);
    
    switch (urgency) {
      case 'same_day':
        return '24 hours (Express)';
      case 'express':
        const expressDays = Math.max(1, Math.ceil(totalDays * 0.6));
        return `${expressDays} day${expressDays > 1 ? 's' : ''} (Express)`;
      default:
        return `${totalDays} day${totalDays > 1 ? 's' : ''} (Standard)`;
    }
  }
}

// Create and export singleton instance
export const distanceService = new DistanceService();