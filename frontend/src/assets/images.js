/**
 * AGRITrust — Comprehensive Visual Asset & Image Registry
 * High-definition agricultural produce, multi-modal transport, cold chain infrastructure,
 * physical verification evidence, and loss prevention laboratory photography.
 */

export const ASSETS = {
  // Hero & Overview Banners
  HERO_BANNER: '/images/hero_banner.jpg',
  MULTIMODAL_BANNER: '/images/multimodal_modes.jpg',
  PRODUCE_INSPECTION_BANNER: '/images/produce_inspection.jpg',
  COLD_STORAGE_CHAMBER_BANNER: '/images/cold_storage_chamber.jpg',
  SIDE_BY_SIDE_EVIDENCE: '/images/side_by_side_evidence.jpg',
  LOSS_DISCREPANCY_LAB: '/images/loss_discrepancy.jpg',

  // Produce Categories & Varieties
  PRODUCE: {
    'Alphonso Mango': {
      name: 'Alphonso Mango (Devgad / Ratnagiri)',
      category: 'Fresh Fruits',
      url: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=800&q=80',
      fallback: '/images/produce_inspection.jpg',
      tempRange: '10.0°C - 13.0°C',
      humidityRange: '85% - 90% RH',
      shelfLifeDays: 21,
      giTag: 'GI Certified (Devgad)',
      color: '#F59E0B'
    },
    'Table Grapes': {
      name: 'Crimson Table Grapes (Nashik)',
      category: 'Fresh Fruits',
      url: 'https://images.unsplash.com/photo-1537640538966-79f369143f8f?auto=format&fit=crop&w=800&q=80',
      fallback: '/images/produce_inspection.jpg',
      tempRange: '0.0°C - 2.0°C',
      humidityRange: '90% - 95% RH',
      shelfLifeDays: 45,
      giTag: 'Nashik Valley Export',
      color: '#8B5CF6'
    },
    'Vine Tomatoes': {
      name: 'Polyhouse Vine Tomatoes (Pune)',
      category: 'Fresh Vegetables',
      url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&q=80',
      fallback: '/images/loss_discrepancy.jpg',
      tempRange: '12.0°C - 15.0°C',
      humidityRange: '85% - 90% RH',
      shelfLifeDays: 18,
      giTag: 'Grade A Hydroponic',
      color: '#EF4444'
    },
    'Red Onions': {
      name: 'Lasalgaon Export Red Onions',
      category: 'Dry Produce',
      url: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=800&q=80',
      fallback: '/images/cold_storage_chamber.jpg',
      tempRange: '0.0°C - 4.0°C',
      humidityRange: '65% - 70% RH',
      shelfLifeDays: 120,
      giTag: 'Lasalgaon Mandi Grade',
      color: '#B91C1C'
    },
    'Royal Delicious Apples': {
      name: 'Shimla Royal Delicious Apples',
      category: 'Fresh Fruits',
      url: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=800&q=80',
      fallback: '/images/cold_storage_chamber.jpg',
      tempRange: '-0.5°C - 3.0°C',
      humidityRange: '90% - 95% RH',
      shelfLifeDays: 180,
      giTag: 'Himachal CA Grade',
      color: '#DC2626'
    },
    'Baby Spinach': {
      name: 'Hydroponic Baby Spinach',
      category: 'Leafy Greens',
      url: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=800&q=80',
      fallback: '/images/cold_storage_chamber.jpg',
      tempRange: '0.0°C - 2.0°C',
      humidityRange: '95% - 100% RH',
      shelfLifeDays: 10,
      giTag: 'Fresh Cut Organic',
      color: '#16A34A'
    },
    'Hass Avocados': {
      name: 'Premium Hass Avocados',
      category: 'Subtropical Fruits',
      url: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=800&q=80',
      fallback: '/images/produce_inspection.jpg',
      tempRange: '5.0°C - 8.0°C',
      humidityRange: '85% - 90% RH',
      shelfLifeDays: 28,
      giTag: 'GlobalGAP Export',
      color: '#15803D'
    },
    'Organic Strawberries': {
      name: 'Mahabaleshwar Winter Strawberries',
      category: 'Berries',
      url: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=800&q=80',
      fallback: '/images/produce_inspection.jpg',
      tempRange: '0.0°C - 2.0°C',
      humidityRange: '90% - 95% RH',
      shelfLifeDays: 7,
      giTag: 'Mahabaleshwar GI',
      color: '#E11D48'
    }
  },

  // Transport Modes Photography
  TRANSPORT: {
    ROAD: {
      mode: 'ROAD',
      title: 'Refrigerated Reefer Truck (Multi-Temp)',
      image: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80',
      fallback: '/images/multimodal_modes.jpg',
      specs: '32ft & 40ft High Cube Reefer Units with Carrier Transicold & IoT GPS telemetry'
    },
    AIR: {
      mode: 'AIR',
      title: 'Boeing 777F Air Cargo & Active Temp ULD Containers',
      image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=800&q=80',
      fallback: '/images/multimodal_modes.jpg',
      specs: 'Envirotainer RAP e2 dry-ice compressor ULDs with IATA CEIV cold-chain validation'
    },
    MARINE: {
      mode: 'MARINE',
      title: 'Ocean Reefer Container Vessel & Terminal',
      image: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=800&q=80',
      fallback: '/images/multimodal_modes.jpg',
      specs: '40ft High-Cube CA Reefer (Daikin/StarCool) with satellite AIS telemetry link'
    },
    MULTIMODAL: {
      mode: 'MULTIMODAL',
      title: 'Intermodal Road + Ocean / Air Transfer',
      image: '/images/multimodal_modes.jpg',
      fallback: '/images/hero_banner.jpg',
      specs: 'Cross-dock intermodal transfer with synchronized cold-chain handover verification'
    }
  },

  // Quality Inspection Tools & Evidence
  INSPECTION: {
    OFFICER_ASSESSMENT: '/images/produce_inspection.jpg',
    SIDE_BY_SIDE_EVIDENCE: '/images/side_by_side_evidence.jpg',
    BRIX_REFRACTOMETER: 'https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?auto=format&fit=crop&w=800&q=80',
    PULP_TEMPERATURE_PROBE: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
    DIGITAL_SCALE: 'https://images.unsplash.com/photo-1584744982491-665216d95f8b?auto=format&fit=crop&w=800&q=80',
    TAMPER_SEAL: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80'
  },

  // Cold Chain Facilities
  FACILITIES: {
    CA_CHAMBER: '/images/cold_storage_chamber.jpg',
    PRE_COOLING: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
    DOCK_SEAL: 'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=800&q=80'
  },

  // Loss Prevention Laboratory
  LOSS_PREVENTION: {
    FORENSIC_LAB: '/images/loss_discrepancy.jpg',
    DISCREPANCY_COMPARE: '/images/loss_discrepancy.jpg'
  }
};

/**
 * Returns matching produce metadata or default Alphonso Mango
 */
export function getProduceAsset(produceName) {
  if (!produceName) return ASSETS.PRODUCE['Alphonso Mango'];
  for (const [key, val] of Object.entries(ASSETS.PRODUCE)) {
    if (produceName.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(produceName.toLowerCase())) {
      return val;
    }
  }
  return ASSETS.PRODUCE['Alphonso Mango'];
}

/**
 * Returns matching transport mode asset
 */
export function getTransportAsset(mode) {
  const m = (mode || 'ROAD').toUpperCase();
  return ASSETS.TRANSPORT[m] || ASSETS.TRANSPORT.ROAD;
}
