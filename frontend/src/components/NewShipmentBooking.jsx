import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  Plane,
  Ship,
  Sparkles,
  ShieldCheck,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileText,
  DollarSign,
  Info,
  Calendar,
  Layers,
  Thermometer,
  ChevronRight,
  RefreshCw,
  Sliders,
  Check,
  X,
  ExternalLink,
  Box,
  Scale,
  Camera,
  Upload,
  Eye,
  Shield,
  Send,
  HelpCircle,
  ArrowUpDown,
  Lock,
  Globe,
  Tag
} from 'lucide-react';
import { ASSETS } from '../assets/images';
import SmartImage from './SmartImage';
import { 
  createConsignmentRequest, 
  fetchConsignments, 
  fetchConsignmentDetail, 
  submitConsignmentCorrections,
  bookVerifiedConsignment 
} from '../api';

// Supported 3 Freight Modes Specification
const TRANSPORT_MODES = {
  ROAD: {
    id: 'ROAD',
    name: 'Road Freight',
    subtitle: 'Reefer Trucks & Intercity FTL Fleet',
    icon: Truck,
    badge: 'DOOR-TO-DOOR',
    color: '#018180',
    bgLight: '#E6F4F4',
    border: '#CFE8E7',
    description: 'Direct door-to-door temperature-controlled reefer transport. Optimal for domestic, interstate, and regional farm-to-retail deliveries.',
    features: ['Real-time continuous GPS & temp telemetry', 'Single custody vehicle seal', 'Flexible farm-gate pickup', 'Multi-drop receiving docks'],
    baseSpeedKmh: 48,
    costPerKmKg: 0.0075,
    fixedHandling: 1500,
    spoilageFactor: 1.0
  },
  AIR: {
    id: 'AIR',
    name: 'Air Freight',
    subtitle: 'Dedicated Cargo Aircraft & ULD Reefer',
    icon: Plane,
    badge: 'EXPRESS PERISHABLE',
    color: '#7C3AED',
    bgLight: '#F3E8FF',
    border: '#DDD6FE',
    description: 'Ultra-fast cargo aircraft transit using active temperature-controlled Unit Load Devices (ULD). Best for urgent, high-value, and delicate perishables.',
    features: ['Airport-to-airport express velocity', 'Controlled atmosphere cargo bay', 'Phytosanitary green-channel clearance', 'First-mile & last-mile road drayage required'],
    baseSpeedKmh: 680,
    costPerKmKg: 0.042,
    fixedHandling: 8500,
    spoilageFactor: 0.25
  },
  MARINE: {
    id: 'MARINE',
    name: 'Marine / Sea Freight',
    subtitle: '20ft/40ft High-Cube Reefer Containers',
    icon: Ship,
    badge: 'HIGH-VOLUME BULK',
    color: '#0284C7',
    bgLight: '#E0F2FE',
    border: '#BAE6FD',
    description: 'High-volume containerized ocean shipping equipped with Controlled Atmosphere (CA) reefer compressors. Ideal for major export consignments.',
    features: ['Low freight cost per kilogram', 'Dual redundant generator sets', 'Deep sea AIS tracking & black box', 'Port-to-port corridor + container drayage'],
    baseSpeedKmh: 28,
    costPerKmKg: 0.0028,
    fixedHandling: 16500,
    spoilageFactor: 1.85
  }
};

// Preset Agricultural & Perishable Produce Profiles
const PRODUCE_CATEGORIES = [
  {
    type: 'FRUITS',
    label: '🍎 Fresh Fruits',
    presets: [
      { name: 'Alphonso Mango (Devgad / Ratnagiri)', tempMin: 10.0, tempMax: 13.0, shelfLifeDays: 21, packing: '5-Ply Ventilated Corrugated Cartons (CFB)' },
      { name: 'Thompson Seedless Table Grapes', tempMin: 0.0, tempMax: 2.0, shelfLifeDays: 45, packing: '5kg Ventilated Boxes with SO2 Pads' },
      { name: 'Pomegranate (Bhagawa GI)', tempMin: 5.0, tempMax: 7.0, shelfLifeDays: 60, packing: '4kg Master Cartons with Foam Sleeves' },
      { name: 'Kashmir Royal Delicious Apples', tempMin: -1.0, tempMax: 2.0, shelfLifeDays: 90, packing: '18kg Telescopic Tray Cartons' }
    ]
  },
  {
    type: 'VEGETABLES',
    label: '🥦 Fresh Vegetables',
    presets: [
      { name: 'Polyhouse Vine Tomatoes', tempMin: 12.0, tempMax: 15.0, shelfLifeDays: 18, packing: 'Reusable Plastic Crates (RPC)' },
      { name: 'Green Bell Peppers (Capsicum)', tempMin: 7.0, tempMax: 10.0, shelfLifeDays: 25, packing: 'Ventilated Corrugated Boxes' },
      { name: 'Fresh Green Peas', tempMin: 0.0, tempMax: 2.0, shelfLifeDays: 14, packing: 'Perforated Nitrogen-Flushed Bags' },
      { name: 'Nashik Red Onions', tempMin: 0.0, tempMax: 4.0, shelfLifeDays: 120, packing: 'Mesh Leno Bags with Pallet Strapping' }
    ]
  },
  {
    type: 'DAIRY',
    label: '🥛 Dairy & Liquid Food',
    presets: [
      { name: 'Pasteurized Fresh Milk & Cream', tempMin: 2.0, tempMax: 4.0, shelfLifeDays: 7, packing: 'Insulated Bulk Crates / Pouches' },
      { name: 'Buffalo Mozzarella & Artisanal Cheese', tempMin: 2.0, tempMax: 5.0, shelfLifeDays: 30, packing: 'Vacuum Sealed Nitrogen Barrier Packs' },
      { name: 'Organic Butter & Ghee Packs', tempMin: 0.0, tempMax: 4.0, shelfLifeDays: 90, packing: 'Thermal Foil Lined Master Cartons' }
    ]
  },
  {
    type: 'SEAFOOD',
    label: '🐟 Seafood & Marine Produce',
    presets: [
      { name: 'Fresh Chilled Vannamei Prawns', tempMin: -1.0, tempMax: 2.0, shelfLifeDays: 8, packing: 'Expanded Polystyrene (EPS) Boxes with Gel Ice' },
      { name: 'Wild Caught Atlantic Salmon Fillets', tempMin: 0.0, tempMax: 2.0, shelfLifeDays: 10, packing: 'Insulated Dry Ice Master Bins' }
    ]
  },
  {
    type: 'MEAT',
    label: '🥩 Meat & Poultry',
    presets: [
      { name: 'Fresh Farm Chilled Poultry', tempMin: -1.0, tempMax: 2.0, shelfLifeDays: 6, packing: 'Vacuum Skin Packaging (VSP) in EPS Bins' },
      { name: 'Prime Export Mutton / Lamb Cuts', tempMin: 0.0, tempMax: 3.0, shelfLifeDays: 14, packing: 'Modified Atmosphere Packaging (MAP)' }
    ]
  },
  {
    type: 'FROZEN',
    label: '❄️ Frozen Foods & Concentrates',
    presets: [
      { name: 'IQF Frozen Mixed Berries & Pulp', tempMin: -20.0, tempMax: -18.0, shelfLifeDays: 365, packing: 'Heavy-Duty Bulk Reefer Bins' },
      { name: 'Frozen Mango Puree Aseptic Drums', tempMin: -18.0, tempMax: -15.0, shelfLifeDays: 540, packing: '200L Aseptic Bag-in-Drums on Pallets' }
    ]
  },
  {
    type: 'GRAINS',
    label: '🌾 Grains & High-Value Cargo',
    presets: [
      { name: 'Organic Basmati Export Rice', tempMin: 15.0, tempMax: 20.0, shelfLifeDays: 720, packing: 'Multi-Wall Moisture Barrier Jute Bags' }
    ]
  }
];

export default function NewShipmentBooking({ onBookingConfirmed, onNavigateVerificationQueue }) {
  const [activeSubTab, setActiveSubTab] = useState('booking-form'); // 'booking-form' | 'compare-modes' | 'verification-pipeline'

  // Generate unique Consignment ID
  const generateNewConsignmentId = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `CSG-${new Date().getFullYear()}-${randomSuffix}`;
  };

  // Consignment Form State
  const [formData, setFormData] = useState({
    consignment_id: generateNewConsignmentId(),
    product_category: 'FRUITS',
    product_name: 'Alphonso Mango (Devgad / Ratnagiri)',
    quantity_value: 2500,
    quantity_unit: 'KG', // 'KG' | 'MT'
    package_count: 250,
    packaging_type: '5-Ply Ventilated Corrugated Cartons (CFB)',
    is_international: false,
    pickup_address: 'Sahyadri Agro Hub Gate #2, Dindori Road',
    pickup_city: 'Nashik',
    pickup_pincode: '422001',
    delivery_address: 'FreshMart Central Distribution Hub, Sector 19',
    delivery_city: 'Mumbai',
    delivery_pincode: '400707',
    pickup_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    delivery_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    shelf_life_days: 21,
    target_temp_min: 10.0,
    target_temp_max: 13.0,
    cargo_value_inr: 450000,
    require_insurance: true,
    special_handling: 'Pre-cooled to 11.5°C before dispatch. Maintain ethylene scrubbing and avoid crate inversion.',
    customer_photos: [
      'https://images.unsplash.com/photo-1553279768-865429fa0078?w=600',
      'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=600'
    ]
  });

  // Mode comparison selection & sort states
  const [selectedTransportMode, setSelectedTransportMode] = useState('ROAD');
  const [comparisonSortKey, setComparisonSortKey] = useState('cost'); // 'cost' | 'transitTime' | 'spoilageRisk'
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'
  
  // Pipeline & Async State
  const [consignmentsList, setConsignmentsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [selectedConsignmentDetail, setSelectedConsignmentDetail] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionPayload, setCorrectionPayload] = useState({ notes: '', photos: '' });
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [activeBookingConsignment, setActiveBookingConsignment] = useState(null);

  // Load user consignments
  const loadConsignments = async () => {
    try {
      setLoading(true);
      const res = await fetchConsignments();
      if (res?.data) {
        setConsignmentsList(res.data);
      }
    } catch (err) {
      console.error('Failed to load consignments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConsignments();
  }, []);

  // Compute total weight in KG
  const totalWeightKg = useMemo(() => {
    const val = parseFloat(formData.quantity_value) || 0;
    return formData.quantity_unit === 'MT' ? val * 1000 : val;
  }, [formData.quantity_value, formData.quantity_unit]);

  // Distance estimation based on city pairs
  const estimatedDistanceKm = useMemo(() => {
    const pCity = (formData.pickup_city || '').toLowerCase();
    const dCity = (formData.delivery_city || '').toLowerCase();

    if (formData.is_international) {
      if (dCity.includes('dubai') || dCity.includes('jebel')) return 2200;
      if (dCity.includes('rotterdam') || dCity.includes('london')) return 6800;
      return 3500;
    }

    if (pCity.includes('nashik') && (dCity.includes('mumbai') || dCity.includes('vashi'))) return 175;
    if (pCity.includes('nashik') && dCity.includes('delhi')) return 1320;
    if (pCity.includes('pune') && dCity.includes('bangalore')) return 840;
    if (pCity.includes('mumbai') && dCity.includes('chennai')) return 1340;
    return 450;
  }, [formData.pickup_city, formData.delivery_city, formData.is_international]);

  // 3-Mode Calculation Matrix
  const modeComparisons = useMemo(() => {
    const weight = totalWeightKg > 0 ? totalWeightKg : 1000;
    const distance = estimatedDistanceKm;
    const shelfLife = parseFloat(formData.shelf_life_days) || 14;

    return Object.values(TRANSPORT_MODES).map(mode => {
      // 1. Transit Time in Hours
      let transitHours = Math.max(2, Math.round((distance / mode.baseSpeedKmh) * 1.2));
      let isAvailable = true;
      let availabilityReason = 'Route fully serviceable with active refrigerated carriers';

      // Marine availability constraint on domestic inland routes
      if (mode.id === 'MARINE') {
        transitHours = Math.max(72, Math.round((distance / mode.baseSpeedKmh) + 36)); // Sea transit + port drayage
        if (!formData.is_international && !formData.delivery_city.toLowerCase().includes('port') && !formData.delivery_city.toLowerCase().includes('mumbai') && !formData.delivery_city.toLowerCase().includes('chennai') && !formData.delivery_city.toLowerCase().includes('cochin')) {
          isAvailable = false;
          availabilityReason = 'Direct maritime corridor unavailable for inland domestic destination. Coastal feeder required.';
        }
      }

      // Air availability constraint on very short distances (<120km)
      if (mode.id === 'AIR') {
        transitHours = Math.max(5, Math.round(distance / mode.baseSpeedKmh + 4)); // Flight time + 4h airport handling
        if (distance < 120) {
          isAvailable = false;
          availabilityReason = 'Short distance route below minimum 120km flight corridor threshold.';
        }
      }

      // 2. Cost Calculation
      const baseFreight = distance * weight * mode.costPerKmKg;
      const reeferPowerSurcharge = baseFreight * 0.14; // Cold chain active temperature tax
      const handlingFees = mode.fixedHandling;
      const insuranceCost = formData.require_insurance ? (parseFloat(formData.cargo_value_inr) || 0) * 0.0025 : 0;
      const totalCost = Math.round(baseFreight + reeferPowerSurcharge + handlingFees + insuranceCost);

      // 3. Spoilage Risk Calculation (Kinetic shelf life decay)
      const transitDays = transitHours / 24;
      const decayRatio = (transitDays / shelfLife) * mode.spoilageFactor;
      let spoilageScore = Math.min(95, Math.max(1.5, Math.round(decayRatio * 100 * 10) / 10));
      let riskLevel = 'LOW';
      if (spoilageScore > 25) riskLevel = 'MEDIUM';
      if (spoilageScore > 50) riskLevel = 'HIGH';
      if (spoilageScore > 75) riskLevel = 'CRITICAL';

      return {
        modeId: mode.id,
        modeName: mode.name,
        subtitle: mode.subtitle,
        icon: mode.icon,
        badge: mode.badge,
        color: mode.color,
        bgLight: mode.bgLight,
        border: mode.border,
        description: mode.description,
        features: mode.features,
        distanceKm: distance,
        transitHours: transitHours,
        transitDurationStr: transitHours < 24 ? `${transitHours} Hours` : `${(transitHours / 24).toFixed(1)} Days (${transitHours}h)`,
        totalCostInr: totalCost,
        costPerKg: (totalCost / weight).toFixed(2),
        spoilageScore: spoilageScore,
        riskLevel: riskLevel,
        isAvailable: isAvailable,
        availabilityReason: availabilityReason,
        isEstimated: true,
        itemized: {
          baseFreight: Math.round(baseFreight),
          reeferSurcharge: Math.round(reeferPowerSurcharge),
          handlingFees: handlingFees,
          insuranceCost: Math.round(insuranceCost)
        }
      };
    });
  }, [totalWeightKg, estimatedDistanceKm, formData]);

  // Sorted comparisons
  const sortedComparisons = useMemo(() => {
    return [...modeComparisons].sort((a, b) => {
      let valA, valB;
      if (comparisonSortKey === 'cost') {
        valA = a.totalCostInr;
        valB = b.totalCostInr;
      } else if (comparisonSortKey === 'transitTime') {
        valA = a.transitHours;
        valB = b.transitHours;
      } else if (comparisonSortKey === 'spoilageRisk') {
        valA = a.spoilageScore;
        valB = b.spoilageScore;
      }
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });
  }, [modeComparisons, comparisonSortKey, sortDirection]);

  // Handle Preset produce selection
  const handleSelectProducePreset = (preset, catType) => {
    setFormData(prev => ({
      ...prev,
      product_category: catType,
      product_name: preset.name,
      target_temp_min: preset.tempMin,
      target_temp_max: preset.tempMax,
      shelf_life_days: preset.shelfLifeDays,
      packaging_type: preset.packing
    }));
  };

  // Form submission handler -> Submits to Mandatory Physical Verification Pipeline
  const handleSubmitBookingRequest = async (e) => {
    e.preventDefault();
    setFeedback(null);

    // Form Validations
    if (!formData.product_name?.trim()) {
      setFeedback({ type: 'error', message: 'Please enter a valid agricultural product or cargo item name.' });
      return;
    }
    if (totalWeightKg <= 0) {
      setFeedback({ type: 'error', message: 'Cargo quantity must be greater than zero.' });
      return;
    }
    if (!formData.pickup_address?.trim() || !formData.pickup_city?.trim()) {
      setFeedback({ type: 'error', message: 'Complete pickup location details are required.' });
      return;
    }
    if (!formData.delivery_address?.trim() || !formData.delivery_city?.trim()) {
      setFeedback({ type: 'error', message: 'Complete destination and delivery address details are required.' });
      return;
    }

    try {
      setLoading(true);
      const payload = {
        pickup_location: `${formData.pickup_address}, ${formData.pickup_city}`,
        pickup_pincode: formData.pickup_pincode || '422001',
        destination_location: `${formData.delivery_address}, ${formData.delivery_city}`,
        destination_pincode: formData.delivery_pincode || '400707',
        product_category: formData.product_category,
        product_name: formData.product_name,
        variety: 'Export Certified Grade A',
        material_description: `${formData.packaging_type} — ${formData.special_handling}`,
        declared_quantity_kg: totalWeightKg,
        declared_package_count: parseInt(formData.package_count) || 100,
        packaging_type: formData.packaging_type,
        packaging_requirements: formData.special_handling,
        storage_requirements: `Maintain setpoint ${formData.target_temp_min}°C to ${formData.target_temp_max}°C`,
        requires_temperature_control: true,
        target_temp_min: parseFloat(formData.target_temp_min),
        target_temp_max: parseFloat(formData.target_temp_max),
        preferred_transport_mode: selectedTransportMode,
        expected_pickup_date: formData.pickup_date,
        urgency_level: 'STANDARD',
        declared_cargo_value_inr: parseFloat(formData.cargo_value_inr) || 100000,
        customer_photos: formData.customer_photos,
        customer_notes: `[NEW MULTI-MODAL BOOKING REQUEST - MODE: ${selectedTransportMode}] ${formData.special_handling}`
      };

      const res = await createConsignmentRequest(payload);
      if (res?.data || res?.consignment_id) {
        setFeedback({
          type: 'success',
          message: `Consignment ${res.data?.consignment_id || formData.consignment_id} submitted successfully! It has entered "Pending Physical Verification" status. A certified Verification Officer will inspect the produce before final dispatch booking.`
        });
        await loadConsignments();
        setActiveSubTab('verification-pipeline');
      } else {
        throw new Error(res?.message || 'Server error creating consignment');
      }
    } catch (err) {
      console.error('Submission error:', err);
      setFeedback({
        type: 'error',
        message: `Submission failed: ${err.message || 'FastAPI connection error'}`
      });
    } finally {
      setLoading(false);
    }
  };

  // Submit corrections for rejected / correction required consignments
  const handleCorrectionSubmit = async (consignmentId) => {
    if (!correctionPayload.notes?.trim()) {
      alert('Please enter descriptive correction details and evidence.');
      return;
    }
    try {
      setLoading(true);
      await submitConsignmentCorrections(consignmentId, {
        description: correctionPayload.notes,
        photos: correctionPayload.photos || 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=600',
        request_reinspection: true
      });
      setShowCorrectionModal(false);
      await loadConsignments();
      alert('Corrections submitted! The consignment has been returned to the Physical Verification Queue for re-inspection.');
    } catch (err) {
      alert(`Failed to submit corrections: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Final transport booking confirmation (unlocked ONLY when APPROVED)
  const handleFinalBookingConfirm = async () => {
    if (!activeBookingConsignment) return;
    try {
      setLoading(true);
      await bookVerifiedConsignment(activeBookingConsignment.consignment_id, {
        selected_mode: selectedTransportMode,
        special_handling_instructions: formData.special_handling
      });
      setShowBookingModal(false);
      await loadConsignments();
      alert(`🎉 Booking confirmed for Consignment ${activeBookingConsignment.consignment_id}! Carrier assignment request dispatched to Logistics Provider.`);
      if (onBookingConfirmed) onBookingConfirmed(activeBookingConsignment);
    } catch (err) {
      alert(`Booking confirmation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 1. HERO BANNER & MULTI-MODAL POSITIONING */}
      <div className="card" style={{
        padding: '24px',
        background: 'linear-gradient(135deg, #E6F4F4 0%, #FFFFFF 100%)',
        border: '1px solid var(--border-card)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div style={{ maxWidth: '680px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="badge badge-normal" style={{ fontSize: '11px', padding: '3px 10px', background: '#FFFFFF', borderColor: 'var(--color-primary-teal)', color: 'var(--color-primary-teal)', fontWeight: '800' }}>
              ✦ MULTI-MODAL COLD CHAIN INTELLIGENCE
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>
              3-Mode Freight System (Road · Air · Marine)
            </span>
          </div>

          <h1 className="font-display" style={{ fontSize: '22px', fontWeight: '900', color: '#111827', margin: 0, letterSpacing: '-0.3px' }}>
            New Shipment Booking & Transport Comparison
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.5' }}>
            Submit your perishables for <b>mandatory farm-gate physical inspection</b>, evaluate real-time multi-modal rate cards across Road, Air, and Marine container shipping, and execute verified bookings.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <ShieldCheck size={16} color="var(--accent-emerald)" />
              <b>Mandatory Physical Verification</b>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Thermometer size={16} color="var(--color-primary-teal)" />
              <b>Active Reefer Telematics</b>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Globe size={16} color="#7C3AED" />
              <b>Domestic & Export Corridors</b>
            </span>
          </div>
        </div>

        {/* Action Pills & Refresh */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
          <button
            type="button"
            onClick={loadConsignments}
            disabled={loading}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            <span>Refresh Pipeline</span>
          </button>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {consignmentsList.length} Active Consignments in System
          </span>
        </div>
      </div>

      {/* 2. SUB-SECTION NAVIGATION BAR */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '2px',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
          <button
            type="button"
            onClick={() => setActiveSubTab('booking-form')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
              background: activeSubTab === 'booking-form' ? '#FFFFFF' : 'transparent',
              border: '1px solid',
              borderColor: activeSubTab === 'booking-form' ? 'var(--border-card) var(--border-card) #FFFFFF var(--border-card)' : 'transparent',
              color: activeSubTab === 'booking-form' ? 'var(--color-primary-teal)' : 'var(--text-secondary)',
              fontWeight: activeSubTab === 'booking-form' ? '800' : '600',
              fontSize: '13px',
              cursor: 'pointer',
              marginBottom: '-1px'
            }}
          >
            <FileText size={16} />
            <span>1. New Shipment Booking Form</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('compare-modes')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
              background: activeSubTab === 'compare-modes' ? '#FFFFFF' : 'transparent',
              border: '1px solid',
              borderColor: activeSubTab === 'compare-modes' ? 'var(--border-card) var(--border-card) #FFFFFF var(--border-card)' : 'transparent',
              color: activeSubTab === 'compare-modes' ? 'var(--color-primary-teal)' : 'var(--text-secondary)',
              fontWeight: activeSubTab === 'compare-modes' ? '800' : '600',
              fontSize: '13px',
              cursor: 'pointer',
              marginBottom: '-1px'
            }}
          >
            <Layers size={16} />
            <span>2. Compare 3 Transport Modes</span>
            <span className="badge badge-info" style={{ fontSize: '10px', padding: '1px 6px' }}>Road · Air · Sea</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('verification-pipeline')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
              background: activeSubTab === 'verification-pipeline' ? '#FFFFFF' : 'transparent',
              border: '1px solid',
              borderColor: activeSubTab === 'verification-pipeline' ? 'var(--border-card) var(--border-card) #FFFFFF var(--border-card)' : 'transparent',
              color: activeSubTab === 'verification-pipeline' ? 'var(--color-primary-teal)' : 'var(--text-secondary)',
              fontWeight: activeSubTab === 'verification-pipeline' ? '800' : '600',
              fontSize: '13px',
              cursor: 'pointer',
              marginBottom: '-1px'
            }}
          >
            <ShieldCheck size={16} />
            <span>3. Physical Verification Pipeline</span>
            <span style={{
              fontSize: '10px',
              fontWeight: '800',
              padding: '1px 6px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-primary-teal)',
              color: '#FFFFFF'
            }}>
              {consignmentsList.length}
            </span>
          </button>
        </div>
      </div>

      {/* FEEDBACK BANNER */}
      {feedback && (
        <div className="card" style={{
          padding: '14px 18px',
          background: feedback.type === 'success' ? '#DCFCE7' : '#FEE2E2',
          border: `1px solid ${feedback.type === 'success' ? '#86EFAC' : '#FCA5A5'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {feedback.type === 'success' ? <CheckCircle2 size={18} color="#15803D" /> : <AlertTriangle size={18} color="#DC2626" />}
            <span style={{ fontSize: '13px', fontWeight: '700', color: feedback.type === 'success' ? '#14532D' : '#991B1B' }}>
              {feedback.message}
            </span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="btn btn-secondary btn-sm" style={{ padding: '2px 8px' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-SECTION 1: COMPREHENSIVE SHIPMENT BOOKING FORM */}
      {/* ========================================================================= */}
      {activeSubTab === 'booking-form' && (
        <form onSubmit={handleSubmitBookingRequest} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Top Info Notice: Mandatory Physical Verification */}
          <div style={{
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <ShieldCheck size={20} color="#16A34A" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '12px', color: '#166534', lineHeight: '1.5' }}>
              <b style={{ color: '#14532D' }}>Mandatory Physical Verification Rule:</b> All newly booked consignments are assigned to a certified Verification Officer. Actual net weight, package integrity, internal pulp temperature, and defect tolerances must be physically validated at the farm gate before transport dispatch is authorized.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
            
            {/* CARD A: Consignment & Produce Profile */}
            <div className="card" style={{ padding: '22px', background: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Box size={18} color="var(--color-primary-teal)" />
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#111827', margin: 0 }}>
                    A. Consignment & Produce Info
                  </h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="font-mono" style={{ fontSize: '12px', fontWeight: '800', color: 'var(--color-primary-teal)' }}>
                    {formData.consignment_id}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, consignment_id: generateNewConsignmentId() }))}
                    title="Generate new ID"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    <RefreshCw size={13} />
                  </button>
                </div>
              </div>

              {/* Produce Preset Quick-Selector */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                  Select Produce Category Preset:
                </label>
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {PRODUCE_CATEGORIES.map(cat => (
                    <button
                      key={cat.type}
                      type="button"
                      onClick={() => handleSelectProducePreset(cat.presets[0], cat.type)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: formData.product_category === cat.type ? '1px solid var(--color-primary-teal)' : '1px solid var(--border-card)',
                        background: formData.product_category === cat.type ? '#E6F4F4' : '#FFFFFF',
                        color: formData.product_category === cat.type ? 'var(--color-primary-teal)' : 'var(--text-secondary)',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Product Name Input */}
              <div>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>
                  Product or Food Item Name <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.product_name}
                  onChange={e => setFormData({ ...formData, product_name: e.target.value })}
                  placeholder="e.g. Export Alphonso Mango, Seedless Grapes, Fresh Milk"
                  className="form-input"
                  style={{ fontWeight: '600' }}
                />
              </div>

              {/* Quantity & Unit Toggle */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>
                    Total Declared Quantity <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={formData.quantity_value}
                    onChange={e => setFormData({ ...formData, quantity_value: e.target.value })}
                    className="form-input font-mono"
                    style={{ fontWeight: '800' }}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>Unit</label>
                  <div style={{ display: 'flex', height: '38px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-card)', overflow: 'hidden' }}>
                    {['KG', 'MT'].map(unit => (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => setFormData({ ...formData, quantity_unit: unit })}
                        style={{
                          flex: 1,
                          border: 'none',
                          background: formData.quantity_unit === unit ? 'var(--color-primary-teal)' : '#FFFFFF',
                          color: formData.quantity_unit === unit ? '#FFFFFF' : 'var(--text-secondary)',
                          fontWeight: '800',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        {unit}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Package Count & Packaging Type */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>Package Count</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.package_count}
                    onChange={e => setFormData({ ...formData, package_count: e.target.value })}
                    className="form-input font-mono"
                    style={{ fontWeight: '700' }}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>Packaging Material Type</label>
                  <select
                    value={formData.packaging_type}
                    onChange={e => setFormData({ ...formData, packaging_type: e.target.value })}
                    className="form-select"
                    style={{ fontSize: '12px', fontWeight: '600' }}
                  >
                    <option value="5-Ply Ventilated Corrugated Cartons (CFB)">5-Ply Ventilated Corrugated Cartons (CFB)</option>
                    <option value="Reusable Plastic Perforated Crates (RPC)">Reusable Plastic Perforated Crates (RPC)</option>
                    <option value="Vacuum Sealed Nitrogen Barrier Packs">Vacuum Sealed Nitrogen Barrier Packs</option>
                    <option value="Palletized Drums with Thermal Blanket">Palletized Drums with Thermal Blanket</option>
                    <option value="Insulated Dry Ice Coolers">Insulated Dry Ice Coolers</option>
                    <option value="Heavy-Duty Bulk Reefer Bins">Heavy-Duty Bulk Reefer Bins</option>
                  </select>
                </div>
              </div>

              {/* Shelf-Life & Temperature Parameters */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '11px', fontWeight: '700' }}>Shelf Life (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.shelf_life_days}
                    onChange={e => setFormData({ ...formData, shelf_life_days: e.target.value })}
                    className="form-input font-mono"
                    style={{ fontWeight: '700' }}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '11px', fontWeight: '700' }}>Target Min (°C)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.target_temp_min}
                    onChange={e => setFormData({ ...formData, target_temp_min: e.target.value })}
                    className="form-input font-mono"
                    style={{ fontWeight: '700', color: 'var(--color-primary-teal)' }}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '11px', fontWeight: '700' }}>Target Max (°C)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.target_temp_max}
                    onChange={e => setFormData({ ...formData, target_temp_max: e.target.value })}
                    className="form-input font-mono"
                    style={{ fontWeight: '700', color: '#DC2626' }}
                  />
                </div>
              </div>

            </div>

            {/* CARD B: Route, Dates & Commercial Details */}
            <div className="card" style={{ padding: '22px', background: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={18} color="var(--color-primary-teal)" />
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#111827', margin: 0 }}>
                    B. Origin, Destination & Commercials
                  </h3>
                </div>

                {/* Domestic vs International Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: formData.is_international ? '#7C3AED' : '#15803D' }}>
                    {formData.is_international ? '🌍 International Export' : '🇮🇳 Domestic Freight'}
                  </span>
                  <input
                    type="checkbox"
                    checked={formData.is_international}
                    onChange={e => setFormData({ ...formData, is_international: e.target.checked })}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                </div>
              </div>

              {/* Pickup Address & City / PIN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>
                  Pickup Address & Farm-Gate Location <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.pickup_address}
                  onChange={e => setFormData({ ...formData, pickup_address: e.target.value })}
                  placeholder="Street / Orchard Gate Number / APMC Terminal"
                  className="form-input"
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
                  <input
                    type="text"
                    required
                    value={formData.pickup_city}
                    onChange={e => setFormData({ ...formData, pickup_city: e.target.value })}
                    placeholder="Origin City (e.g. Nashik)"
                    className="form-input"
                  />
                  <input
                    type="text"
                    value={formData.pickup_pincode}
                    onChange={e => setFormData({ ...formData, pickup_pincode: e.target.value })}
                    placeholder="Pickup PIN / Postal Code"
                    className="form-input font-mono"
                  />
                </div>
              </div>

              {/* Delivery Address & City / PIN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>
                  Destination Delivery Address & Receiving Dock <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.delivery_address}
                  onChange={e => setFormData({ ...formData, delivery_address: e.target.value })}
                  placeholder="Receiving Dock / Cold Storage Hub / Retail Mart"
                  className="form-input"
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
                  <input
                    type="text"
                    required
                    value={formData.delivery_city}
                    onChange={e => setFormData({ ...formData, delivery_city: e.target.value })}
                    placeholder="Destination City (e.g. Mumbai, Dubai)"
                    className="form-input"
                  />
                  <input
                    type="text"
                    value={formData.delivery_pincode}
                    onChange={e => setFormData({ ...formData, delivery_pincode: e.target.value })}
                    placeholder="Destination PIN / Postal Code"
                    className="form-input font-mono"
                  />
                </div>
              </div>

              {/* Pickup and Delivery Target Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>
                    Scheduled Pickup Date <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.pickup_date}
                    onChange={e => setFormData({ ...formData, pickup_date: e.target.value })}
                    className="form-input font-mono"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>
                    Expected Delivery Date <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.delivery_date}
                    onChange={e => setFormData({ ...formData, delivery_date: e.target.value })}
                    className="form-input font-mono"
                  />
                </div>
              </div>

              {/* Cargo Value & Insurance */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>
                    Declared Invoice Cargo Value (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.cargo_value_inr}
                    onChange={e => setFormData({ ...formData, cargo_value_inr: e.target.value })}
                    className="form-input font-mono"
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: '4px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.require_insurance}
                      onChange={e => setFormData({ ...formData, require_insurance: e.target.checked })}
                    />
                    <span>Full Cargo Insurance (+0.25%)</span>
                  </label>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '22px' }}>
                    Est. Premium: ₹{Math.round((parseFloat(formData.cargo_value_inr) || 0) * 0.0025).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Special Handling Notes */}
              <div>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>Special Handling & Reefer Setpoint Notes</label>
                <textarea
                  rows="2"
                  value={formData.special_handling}
                  onChange={e => setFormData({ ...formData, special_handling: e.target.value })}
                  placeholder="e.g. Keep cartons upright, avoid ethylene mixing, continuous reefer power logging required."
                  className="form-input"
                  style={{ fontSize: '12px' }}
                />
              </div>

            </div>

          </div>

          {/* CARD C: Preferred Transport Mode Selection & Submit Bar */}
          <div className="card" style={{ padding: '22px', background: '#FFFFFF', borderTop: '3px solid var(--color-primary-teal)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#111827', margin: 0 }}>
                  C. Preferred Transport Mode Selection
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Select initial transport mode. Detailed rate comparisons and spoilage risk are calculated in Tab 2.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveSubTab('compare-modes')}
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--color-primary-teal)', borderColor: 'var(--color-primary-teal)' }}
              >
                <span>View Full Mode Comparison Matrix</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {/* 3 Transport Mode Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              {modeComparisons.map(m => {
                const Icon = m.icon;
                const isSelected = selectedTransportMode === m.modeId;
                return (
                  <div
                    key={m.modeId}
                    onClick={() => m.isAvailable && setSelectedTransportMode(m.modeId)}
                    style={{
                      padding: '16px',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected ? `2px solid ${m.color}` : '1px solid var(--border-card)',
                      background: isSelected ? m.bgLight : (m.isAvailable ? '#FFFFFF' : 'var(--bg-secondary)'),
                      cursor: m.isAvailable ? 'pointer' : 'not-allowed',
                      opacity: m.isAvailable ? 1 : 0.6,
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: isSelected ? m.color : '#F3F4F6',
                            color: isSelected ? '#FFFFFF' : '#4B5563',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Icon size={18} />
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: '800', color: '#111827' }}>{m.modeName}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{m.badge}</div>
                          </div>
                        </div>

                        {isSelected && (
                          <div style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            background: m.color,
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Check size={14} />
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '8px', background: isSelected ? '#FFFFFF' : 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Est. Freight Cost</div>
                          <div className="font-mono" style={{ fontSize: '13px', fontWeight: '800', color: '#111827' }}>
                            ₹{m.totalCostInr.toLocaleString('en-IN')}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Est. Transit Time</div>
                          <div className="font-mono" style={{ fontSize: '13px', fontWeight: '800', color: '#111827' }}>
                            {m.transitDurationStr}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: '11px', color: m.isAvailable ? 'var(--text-secondary)' : '#DC2626', fontWeight: '600' }}>
                      {m.isAvailable ? `Spoilage Risk: ${m.spoilageScore}% (${m.riskLevel})` : m.availabilityReason}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Submit Action */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-warning" style={{ fontSize: '11px', padding: '4px 10px' }}>
                  STATUS ON SUBMISSION: PENDING_VERIFICATION
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  (Physical officer inspection required before transport execution)
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{
                  background: 'linear-gradient(135deg, var(--color-primary-teal), var(--color-teal-dark))',
                  padding: '12px 28px',
                  fontSize: '14px',
                  fontWeight: '800',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(1, 129, 128, 0.3)'
                }}
              >
                {loading ? <RefreshCw size={16} className="spin" /> : <Send size={16} />}
                <span>Submit Consignment for Physical Verification</span>
              </button>
            </div>
          </div>

        </form>
      )}

      {/* ========================================================================= */}
      {/* SUB-SECTION 2: MULTI-MODAL TRANSPORT COMPARISON (ROAD · AIR · MARINE) */}
      {/* ========================================================================= */}
      {activeSubTab === 'compare-modes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Comparison Controls & Sorting */}
          <div className="card" style={{ padding: '18px 22px', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#111827' }}>
                Multi-Modal Transport Comparison Matrix (3 Supported Modes)
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Route: <b>{formData.pickup_city || 'Nashik'}</b> ({formData.pickup_pincode || '422001'}) ➔ <b>{formData.delivery_city || 'Mumbai'}</b> ({formData.delivery_pincode || '400707'}) · Cargo: <b>{totalWeightKg.toLocaleString()} KG</b>
              </div>
            </div>

            {/* Sorting Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>Sort By:</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[
                  { key: 'cost', label: '💰 Lowest Cost' },
                  { key: 'transitTime', label: '⚡ Shortest Transit Time' },
                  { key: 'spoilageRisk', label: '🛡️ Lowest Spoilage Risk' }
                ].map(sort => (
                  <button
                    key={sort.key}
                    type="button"
                    onClick={() => {
                      if (comparisonSortKey === sort.key) {
                        setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                      } else {
                        setComparisonSortKey(sort.key);
                        setSortDirection('asc');
                      }
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: comparisonSortKey === sort.key ? '1px solid var(--color-primary-teal)' : '1px solid var(--border-card)',
                      background: comparisonSortKey === sort.key ? '#E6F4F4' : '#FFFFFF',
                      color: comparisonSortKey === sort.key ? 'var(--color-primary-teal)' : 'var(--text-secondary)',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>{sort.label}</span>
                    {comparisonSortKey === sort.key && (
                      <ArrowUpDown size={11} style={{ opacity: 0.8 }} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Comparison Matrix Table */}
          <div className="card" style={{ padding: '0', overflow: 'hidden', background: '#FFFFFF' }}>
            <div className="table-container">
              <table className="table" style={{ margin: 0 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-subtle)' }}>
                    <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: '800', color: '#111827' }}>Transport Mode</th>
                    <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: '800', color: '#111827' }}>Estimated Cost</th>
                    <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: '800', color: '#111827' }}>Estimated Transit Time</th>
                    <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: '800', color: '#111827' }}>Spoilage Risk</th>
                    <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: '800', color: '#111827' }}>Service Availability</th>
                    <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: '800', color: '#111827', textAlign: 'right' }}>Select Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedComparisons.map(m => {
                    const Icon = m.icon;
                    const isSelected = selectedTransportMode === m.modeId;
                    return (
                      <tr 
                        key={m.modeId}
                        style={{
                          background: isSelected ? '#F4FBFB' : '#FFFFFF',
                          borderBottom: '1px solid var(--border-subtle)'
                        }}
                      >
                        {/* Mode Title & Icon */}
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '8px',
                              background: m.bgLight,
                              border: `1px solid ${m.border}`,
                              color: m.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <Icon size={20} />
                            </div>
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: '800', color: '#111827' }}>
                                {m.modeName}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {m.subtitle}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Estimated Cost */}
                        <td style={{ padding: '16px' }}>
                          <div className="font-mono" style={{ fontSize: '16px', fontWeight: '800', color: '#111827' }}>
                            ₹{m.totalCostInr.toLocaleString('en-IN')}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            ₹{m.costPerKg} / kg · <span className="badge badge-demo" style={{ fontSize: '9px', padding: '1px 4px' }}>Estimated</span>
                          </div>
                        </td>

                        {/* Estimated Transit Time */}
                        <td style={{ padding: '16px' }}>
                          <div className="font-mono" style={{ fontSize: '15px', fontWeight: '800', color: '#111827' }}>
                            {m.transitDurationStr}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Distance: ~{m.distanceKm} km
                          </div>
                        </td>

                        {/* Spoilage Risk Score */}
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span 
                              className={`badge ${m.riskLevel === 'LOW' ? 'badge-normal' : m.riskLevel === 'MEDIUM' ? 'badge-warning' : 'badge-danger'}`}
                              style={{ fontWeight: '800', fontSize: '11px' }}
                            >
                              {m.riskLevel} ({m.spoilageScore}%)
                            </span>
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
                            Arrhenius decay estimate
                          </div>
                        </td>

                        {/* Service Availability */}
                        <td style={{ padding: '16px' }}>
                          {m.isAvailable ? (
                            <span className="badge badge-normal" style={{ fontSize: '11px' }}>
                              ✓ Available
                            </span>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span className="badge badge-danger" style={{ fontSize: '10px', width: 'fit-content' }}>
                                ✕ Unavailable
                              </span>
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)', maxWidth: '200px' }}>
                                {m.availabilityReason}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Action Selection Button */}
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <button
                            type="button"
                            disabled={!m.isAvailable}
                            onClick={() => {
                              setSelectedTransportMode(m.modeId);
                              setActiveSubTab('booking-form');
                            }}
                            className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                            style={{
                              background: isSelected ? 'var(--color-primary-teal)' : undefined,
                              color: isSelected ? '#FFFFFF' : undefined,
                              fontWeight: '700'
                            }}
                          >
                            {isSelected ? '✓ Selected' : 'Select Mode'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Itemized Cost Breakdown Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {modeComparisons.map(m => {
              const Icon = m.icon;
              return (
                <div key={m.modeId} className="card" style={{ padding: '18px', background: '#FFFFFF', border: `1px solid ${m.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <Icon size={18} color={m.color} />
                    <span style={{ fontSize: '14px', fontWeight: '800', color: '#111827' }}>
                      {m.modeName} — Itemized Cost Elements
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Base Line-Haul Freight:</span>
                      <span className="font-mono">₹{m.itemized.baseFreight.toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Reefer Compressor Surcharge:</span>
                      <span className="font-mono">₹{m.itemized.reeferSurcharge.toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Terminal & Drayage Handling:</span>
                      <span className="font-mono">₹{m.itemized.handlingFees.toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Transit Insurance (0.25%):</span>
                      <span className="font-mono">₹{m.itemized.insuranceCost.toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)', fontWeight: '800', color: '#111827', fontSize: '13px' }}>
                      <span>Estimated Total:</span>
                      <span className="font-mono">₹{m.totalCostInr.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    {m.description}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-SECTION 3: PHYSICAL VERIFICATION PIPELINE & BOOKING FINALIZATION */}
      {/* ========================================================================= */}
      {activeSubTab === 'verification-pipeline' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="card" style={{ padding: '20px', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#111827' }}>
                Physical Verification Status Pipeline
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Track certified officer inspection decisions, submit required corrections, and execute approved transport bookings.
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveSubTab('booking-form')}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--color-primary-teal)' }}
            >
              <span>+ Book Another Consignment</span>
            </button>
          </div>

          {consignmentsList.length === 0 ? (
            <div className="panel" style={{ padding: '48px 24px', textAlign: 'center', background: '#FFFFFF', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-card)' }}>
              <ShieldCheck size={36} color="var(--text-dim)" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#111827' }}>No Consignment Requests Yet</div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '420px', margin: '4px auto 16px' }}>
                Submit a new agricultural produce consignment in Tab 1 to initiate the mandatory physical verification workflow.
              </p>
              <button
                type="button"
                onClick={() => setActiveSubTab('booking-form')}
                className="btn btn-primary btn-sm"
              >
                Create First Consignment
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {consignmentsList.map(item => {
                const isApproved = item.status === 'APPROVED' || item.status === 'VERIFIED';
                const isPending = item.status === 'PENDING_VERIFICATION' || item.status === 'INSPECTION_SCHEDULED' || item.status === 'UNDER_INSPECTION';
                const isCorrectionReq = item.status === 'REQUIRES_CORRECTION';
                const isRejected = item.status === 'REJECTED';
                const isBooked = item.status === 'TRANSPORT_BOOKING_CONFIRMED' || item.status === 'DISPATCHED' || item.status === 'DELIVERED';

                return (
                  <div
                    key={item.consignment_id}
                    className="card"
                    style={{
                      padding: '18px 22px',
                      background: '#FFFFFF',
                      borderLeft: `5px solid ${isApproved ? '#16A34A' : isCorrectionReq ? '#D97706' : isRejected ? '#DC2626' : isBooked ? '#7C3AED' : 'var(--color-primary-teal)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '16px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', maxWidth: '650px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        background: isApproved ? '#DCFCE7' : isCorrectionReq ? '#FEF3C7' : isRejected ? '#FEE2E2' : '#E6F4F4',
                        color: isApproved ? '#15803D' : isCorrectionReq ? '#B45309' : isRejected ? '#DC2626' : 'var(--color-primary-teal)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <ShieldCheck size={22} />
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                          <span className="font-mono" style={{ fontSize: '14px', fontWeight: '800', color: '#111827' }}>
                            {item.consignment_id}
                          </span>
                          <span className={`badge ${isApproved ? 'badge-normal' : isCorrectionReq ? 'badge-warning' : isRejected ? 'badge-danger' : isBooked ? 'badge-info' : 'badge-demo'}`}>
                            {item.status?.replace('_', ' ')}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Mode: <b>{item.preferred_transport_mode || 'ROAD'}</b>
                          </span>
                        </div>

                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                          {item.product_name} · <span className="font-mono">{item.declared_quantity_kg?.toLocaleString()} KG</span> ({item.declared_package_count || 100} packages)
                        </div>

                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          From: <b>{item.pickup_location}</b> ➔ To: <b>{item.destination_location}</b>
                        </div>

                        {/* Officer Notes if available */}
                        {item.officer_notes && (
                          <div style={{ marginTop: '8px', padding: '6px 10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                            <b>Officer Inspection Notes:</b> {item.officer_notes}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons based on status */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      
                      {/* Action 1: When Pending */}
                      {isPending && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                          <Clock size={14} />
                          <span>Awaiting Physical Verification</span>
                        </div>
                      )}

                      {/* Action 2: When Correction Required */}
                      {isCorrectionReq && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedConsignmentDetail(item);
                            setShowCorrectionModal(true);
                          }}
                          className="btn btn-sm"
                          style={{ background: '#D97706', color: '#FFFFFF', fontWeight: '700' }}
                        >
                          Submit Corrections
                        </button>
                      )}

                      {/* Action 3: When Approved -> Ready to confirm Transport Booking */}
                      {isApproved && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveBookingConsignment(item);
                            setShowBookingModal(true);
                          }}
                          className="btn btn-primary btn-sm"
                          style={{ background: '#16A34A', borderColor: '#15803D', fontWeight: '800' }}
                        >
                          ✓ Confirm Transport Booking
                        </button>
                      )}

                      {/* Action 4: When Booked */}
                      {isBooked && (
                        <span className="badge badge-normal" style={{ fontSize: '11px', padding: '4px 10px' }}>
                          ✓ Transport Confirmed
                        </span>
                      )}

                      {/* Detail View Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedConsignmentDetail(item);
                          setShowDetailModal(true);
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '6px 10px' }}
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CORRECTIONS SUBMISSION MODAL */}
      {/* ========================================================================= */}
      {showCorrectionModal && selectedConsignmentDetail && (
        <div className="modal-backdrop" onClick={() => setShowCorrectionModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '550px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={20} color="#D97706" />
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#111827', margin: 0 }}>
                  Submit Consignment Corrections
                </h3>
              </div>
              <button type="button" onClick={() => setShowCorrectionModal(false)} className="btn btn-secondary btn-sm"><X size={14} /></button>
            </div>

            <div style={{ padding: '10px 14px', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 'var(--radius-md)', fontSize: '12px', color: '#92400E', marginBottom: '14px' }}>
              <b>Officer Rejection Reason:</b> {selectedConsignmentDetail.officer_notes || 'Defective packaging or temperature setpoint discrepancy noted during physical inspection.'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>Corrective Actions Taken</label>
                <textarea
                  rows="3"
                  value={correctionPayload.notes}
                  onChange={e => setCorrectionPayload({ ...correctionPayload, notes: e.target.value })}
                  placeholder="e.g. Replaced damaged outer cartons with 5-ply CFB, re-calibrated pulp temp to 11.2°C, and verified net weight."
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: '700' }}>Corrective Photo Evidence URL</label>
                <input
                  type="text"
                  value={correctionPayload.photos}
                  onChange={e => setCorrectionPayload({ ...correctionPayload, photos: e.target.value })}
                  placeholder="https://..."
                  className="form-input"
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button type="button" onClick={() => setShowCorrectionModal(false)} className="btn btn-secondary">Cancel</button>
              <button
                type="button"
                onClick={() => handleCorrectionSubmit(selectedConsignmentDetail.consignment_id)}
                disabled={loading}
                className="btn btn-primary"
                style={{ background: '#D97706' }}
              >
                Submit for Re-Inspection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: FINAL TRANSPORT BOOKING CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {showBookingModal && activeBookingConsignment && (
        <div className="modal-backdrop" onClick={() => setShowBookingModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={20} color="#16A34A" />
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#111827', margin: 0 }}>
                  Confirm Final Transport Booking
                </h3>
              </div>
              <button type="button" onClick={() => setShowBookingModal(false)} className="btn btn-secondary btn-sm"><X size={14} /></button>
            </div>

            <div style={{ padding: '12px 16px', background: '#DCFCE7', border: '1px solid #86EFAC', borderRadius: 'var(--radius-md)', fontSize: '12px', color: '#166534', marginBottom: '16px' }}>
              ✓ <b>Physical Verification Complete:</b> Consignment {activeBookingConsignment.consignment_id} was physically verified and approved by the certified Inspection Officer.
            </div>

            {/* Booking Summary Review */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', background: 'var(--bg-secondary)', padding: '14px', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Consignment ID:</span>
                <span className="font-mono" style={{ fontWeight: '800' }}>{activeBookingConsignment.consignment_id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Commodity & Weight:</span>
                <span style={{ fontWeight: '700' }}>{activeBookingConsignment.product_name} ({activeBookingConsignment.declared_quantity_kg} KG)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Selected Transport Mode:</span>
                <span style={{ fontWeight: '800', color: 'var(--color-primary-teal)' }}>{selectedTransportMode} FREIGHT</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Route:</span>
                <span>{activeBookingConsignment.pickup_location} ➔ {activeBookingConsignment.destination_location}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setShowBookingModal(false)} className="btn btn-secondary">Back</button>
              <button
                type="button"
                onClick={handleFinalBookingConfirm}
                disabled={loading}
                className="btn btn-primary"
                style={{ background: '#16A34A', fontWeight: '800' }}
              >
                Confirm & Dispatch to Carrier Fleet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CONSIGNMENT DETAIL LIGHTBOX MODAL */}
      {/* ========================================================================= */}
      {showDetailModal && selectedConsignmentDetail && (
        <div className="modal-backdrop" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={20} color="var(--color-primary-teal)" />
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#111827', margin: 0 }}>
                  Consignment Detail: {selectedConsignmentDetail.consignment_id}
                </h3>
              </div>
              <button type="button" onClick={() => setShowDetailModal(false)} className="btn btn-secondary btn-sm"><X size={14} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px', marginBottom: '16px' }}>
              <div style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ color: 'var(--text-muted)' }}>Status</div>
                <div style={{ fontWeight: '800', color: '#111827', marginTop: '2px' }}>{selectedConsignmentDetail.status}</div>
              </div>
              <div style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ color: 'var(--text-muted)' }}>Preferred Transport Mode</div>
                <div style={{ fontWeight: '800', color: 'var(--color-primary-teal)', marginTop: '2px' }}>{selectedConsignmentDetail.preferred_transport_mode || 'ROAD'}</div>
              </div>
              <div style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ color: 'var(--text-muted)' }}>Declared Quantity</div>
                <div className="font-mono" style={{ fontWeight: '800', color: '#111827', marginTop: '2px' }}>{selectedConsignmentDetail.declared_quantity_kg} KG</div>
              </div>
              <div style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ color: 'var(--text-muted)' }}>Target Temp Range</div>
                <div className="font-mono" style={{ fontWeight: '800', color: '#111827', marginTop: '2px' }}>{selectedConsignmentDetail.target_temp_min}°C – {selectedConsignmentDetail.target_temp_max}°C</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              <div><b>Pickup:</b> {selectedConsignmentDetail.pickup_location}</div>
              <div><b>Destination:</b> {selectedConsignmentDetail.destination_location}</div>
              <div><b>Packaging:</b> {selectedConsignmentDetail.packaging_type}</div>
              {selectedConsignmentDetail.officer_notes && (
                <div style={{ padding: '8px 10px', background: '#F3F4F6', borderRadius: 'var(--radius-sm)' }}>
                  <b>Officer Notes:</b> {selectedConsignmentDetail.officer_notes}
                </div>
              )}
            </div>

            <button type="button" onClick={() => setShowDetailModal(false)} className="btn btn-secondary" style={{ width: '100%' }}>
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
