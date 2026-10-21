import {
  LayoutDashboard,
  Sprout,
  Package,
  PlusCircle,
  Warehouse,
  Camera,
  MapPin,
  Sparkles,
  DollarSign,
  Shield,
  QrCode,
  Truck,
  Compass,
  Radio,
  Thermometer,
  BellRing,
  AlertOctagon,
  BarChart3,
  Building2,
  Layers,
  ArrowDownLeft,
  PackageCheck,
  ArrowUpRight,
  Droplets,
  Calendar,
  ShoppingBag,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  ShieldCheck,
  FileText,
  Ship,
  Plane,
  Target,
  Scale,
  ClipboardCheck,
  FileCheck2,
  BadgeCheck,
  RotateCcw,
  Settings,
  Bell,
  ShieldAlert,
  FileSearch,
  Eye,
  Lock
} from 'lucide-react';

export const ROLES = {
  FARMER: 'FARMER',
  LOGISTICS: 'LOGISTICS',
  COLD_STORAGE: 'COLD_STORAGE',
  BUYER: 'BUYER',
  ADMIN: 'ADMIN',
  VERIFICATION_TEAM: 'VERIFICATION_TEAM'
};

export const ROLE_METADATA = {
  FARMER: {
    key: 'FARMER',
    title: 'Farmer / Producer',
    shortLabel: 'FARMER / EXPORTER',
    workspaceName: 'FARMER & EXPORTER PORTAL',
    tagline: 'Farm Gate, Booking & Perishable Freight Management',
    primaryColor: '#16A34A',
    bgLight: '#DCFCE7',
    borderLight: '#86EFAC',
    badgeText: 'FARMER / EXPORTER',
    defaultTab: 'dashboard'
  },
  LOGISTICS: {
    key: 'LOGISTICS',
    title: 'Logistics Provider',
    shortLabel: 'LOGISTICS & FLEET',
    workspaceName: 'LOGISTICS & FLEET PORTAL',
    tagline: '3-Mode Fleet Operations & Reefer Execution',
    primaryColor: '#0284C7',
    bgLight: '#E0F2FE',
    borderLight: '#7DD3FC',
    badgeText: 'LOGISTICS PROVIDER',
    defaultTab: 'dashboard'
  },
  COLD_STORAGE: {
    key: 'COLD_STORAGE',
    title: 'Cold Storage Owner',
    shortLabel: 'COLD STORAGE',
    workspaceName: 'COLD STORAGE PORTAL',
    tagline: 'Chamber Capacity & Pre-Cooling Infrastructure',
    primaryColor: '#018180',
    bgLight: '#E6F4F4',
    borderLight: '#CFE8E7',
    badgeText: 'COLD STORAGE',
    defaultTab: 'dashboard'
  },
  BUYER: {
    key: 'BUYER',
    title: 'Buyer / Retailer',
    shortLabel: 'BUYER / RETAILER',
    workspaceName: 'BUYER / RETAILER PORTAL',
    tagline: 'Produce Marketplace, Orders & Receiving Dock',
    primaryColor: '#D946EF',
    bgLight: '#FAE8FF',
    borderLight: '#F0ABFC',
    badgeText: 'BUYER / RETAILER',
    defaultTab: 'dashboard'
  },
  ADMIN: {
    key: 'ADMIN',
    title: 'Platform Administrator',
    shortLabel: 'ADMIN CONTROL TOWER',
    workspaceName: 'ADMIN / CONTROL TOWER PORTAL',
    tagline: 'System-Wide Ecosystem Governance & Loss Prevention',
    primaryColor: '#005E5D',
    bgLight: '#E6F4F4',
    borderLight: '#9DD3D2',
    badgeText: 'ADMIN',
    defaultTab: 'control-tower'
  },
  VERIFICATION_TEAM: {
    key: 'VERIFICATION_TEAM',
    title: 'Verification Team Officer',
    shortLabel: 'VERIFICATION TEAM',
    workspaceName: 'VERIFICATION TEAM PORTAL',
    tagline: 'Mandatory Farm-Gate & Dock Physical Cargo Inspection',
    primaryColor: '#059669',
    bgLight: '#ECFDF5',
    borderLight: '#6EE7B7',
    badgeText: 'VERIFIED OFFICER',
    defaultTab: 'dashboard'
  }
};

/**
 * STRICT ROLE-SPECIFIC SIDEBAR NAVIGATION CONFIGURATIONS
 * Reorganized according to AGRITRUST role responsibilities and specifications.
 */
export const ROLE_NAVIGATION = {
  // =========================================================================
  // 1. FARMER / EXPORTER PORTAL (11 Items in exact order)
  // =========================================================================
  FARMER: [
    {
      sectionId: 'farmer-portal',
      sectionLabel: 'FARMER / EXPORTER PORTAL',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          description: 'Total consignments, pending verification, active shipments, delivered shipments & payments overview'
        },
        {
          id: 'new-booking',
          label: 'New Shipment Booking',
          icon: PlusCircle,
          description: 'Add product & cargo details, pickup/destination, photos, weight, shelf life & temperature requirements'
        },
        {
          id: 'compare-modes',
          label: 'Compare Transport Modes',
          icon: Compass,
          description: 'Compare Road, Air & Marine freight estimated cost, transit time & spoilage risk'
        },
        {
          id: 'shipments',
          label: 'My Shipments',
          icon: Package,
          description: 'Drafts, pending physical verification, approved/rejected, awaiting booking, active & delivered shipments'
        },
        {
          id: 'tracking',
          label: 'Track Shipment',
          icon: MapPin,
          description: 'Live route map, last known location, checkpoints, handovers, temperature & humidity readings'
        },
        {
          id: 'quality-records',
          label: 'Product & Quality Records',
          icon: ShieldCheck,
          description: 'Product details, verification reports, quality & weight records, uploaded inspection evidence'
        },
        {
          id: 'cold-storage',
          label: 'Cold Storage Services',
          icon: Warehouse,
          description: 'Find nearby cold storage facilities, view availability & manage chamber storage bookings'
        },
        {
          id: 'payments',
          label: 'Payments & Transactions',
          icon: DollarSign,
          description: 'Freight estimates, confirmed charges, payment history, receipts & transaction status'
        },
        {
          id: 'disputes',
          label: 'Returns & Dispute Claims',
          icon: Scale,
          description: 'View claims related to your shipments, respond to evidence requests & track investigation outcomes'
        },
        {
          id: 'notifications',
          label: 'Notifications',
          icon: BellRing,
          description: 'Verification results, booking updates, shipment alerts, payment & claim updates'
        },
        {
          id: 'profile-settings',
          label: 'Profile & Settings',
          icon: Settings,
          description: 'Farmer/exporter profile details, farm registration, bank info & security settings'
        }
      ]
    }
  ],

  // =========================================================================
  // 2. BUYER / RETAILER PORTAL (10 Items in exact order)
  // =========================================================================
  BUYER: [
    {
      sectionId: 'buyer-portal',
      sectionLabel: 'BUYER / RETAILER PORTAL',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          description: 'Incoming shipments, expected deliveries, delivered orders & open disputes'
        },
        {
          id: 'marketplace',
          label: 'Find Products / Marketplace',
          icon: ShoppingBag,
          description: 'Browse verified produce listings, quantity, quality grade, origin & seller details'
        },
        {
          id: 'orders',
          label: 'My Orders',
          icon: Package,
          description: 'Order purchase history, seller and shipment references, payment escrow & fulfillment status'
        },
        {
          id: 'tracking',
          label: 'Track Incoming Shipments',
          icon: MapPin,
          description: 'Live shipment status, route checkpoints, GPS location & continuous temperature history'
        },
        {
          id: 'quality-verification',
          label: 'Quality Verification',
          icon: ShieldCheck,
          description: 'View approved verification reports, verified weight/quantity & authorized produce evidence'
        },
        {
          id: 'delivery-confirmation',
          label: 'Delivery Confirmation',
          icon: CheckCircle2,
          description: 'Confirm received quantity & condition, report discrepancies & upload receiving photos'
        },
        {
          id: 'disputes',
          label: 'Returns & Quality Disputes',
          icon: AlertTriangle,
          description: 'Initiate returns, raise quality disputes, upload defect evidence & request refunds/replacements'
        },
        {
          id: 'payments',
          label: 'Payments & Invoices',
          icon: DollarSign,
          description: 'Order payments, invoices, receipts and refund claim status'
        },
        {
          id: 'notifications',
          label: 'Notifications',
          icon: BellRing,
          description: 'Order confirmations, dispatch alerts, arrival ETAs & dispute resolutions'
        },
        {
          id: 'profile-settings',
          label: 'Profile & Settings',
          icon: Settings,
          description: 'Retail dock address, receiving preferences, company profile & security'
        }
      ]
    }
  ],

  // =========================================================================
  // 3. VERIFICATION TEAM PORTAL (9 Items in exact order)
  // =========================================================================
  VERIFICATION_TEAM: [
    {
      sectionId: 'verification-portal',
      sectionLabel: 'VERIFICATION TEAM PORTAL',
      items: [
        {
          id: 'dashboard',
          label: 'Verification Dashboard',
          icon: LayoutDashboard,
          description: 'Pending inspections, in progress, approved, rejected & re-inspection workload overview'
        },
        {
          id: 'pending-queue',
          label: 'Pending Verification Queue',
          icon: ClipboardCheck,
          description: 'New inspection requests, consignment details, farmer/exporter info & requested transport mode'
        },
        {
          id: 'physical-inspection',
          label: 'Physical Cargo Inspection',
          icon: FileCheck2,
          description: 'Verify actual weight/quantity, packaging, product condition, temp & upload inspection evidence'
        },
        {
          id: 'ai-quality-analysis',
          label: 'AI Quality Analysis',
          icon: Camera,
          description: 'View AI defect pre-screen, compare with physical findings & enforce certified human decisions'
        },
        {
          id: 'verification-decisions',
          label: 'Verification Decisions',
          icon: ShieldCheck,
          description: 'Issue final decisions: Approve, Reject with reason, or Request corrections & re-inspection'
        },
        {
          id: 'inspection-history',
          label: 'Inspection History',
          icon: FileText,
          description: 'Archived physical inspection dossiers, officer stamps, timestamps & decision history'
        },
        {
          id: 'return-inspection',
          label: 'Return Inspection',
          icon: RotateCcw,
          description: 'Inspect returned goods, record weight/condition and flag unsuitable or unsafe produce'
        },
        {
          id: 'notifications',
          label: 'Notifications',
          icon: BellRing,
          description: 'New assignment alerts, re-inspection submissions & platform notices'
        },
        {
          id: 'profile-settings',
          label: 'Profile & Settings',
          icon: Settings,
          description: 'Officer credentials, inspection badges, assigned regions & security'
        }
      ]
    }
  ],

  // =========================================================================
  // 4. LOGISTICS PROVIDER / FLEET PORTAL (11 Items in exact order)
  // =========================================================================
  LOGISTICS: [
    {
      sectionId: 'logistics-portal',
      sectionLabel: 'LOGISTICS PROVIDER PORTAL',
      items: [
        {
          id: 'dashboard',
          label: 'Logistics Dashboard',
          icon: LayoutDashboard,
          description: 'Confirmed booking requests, unassigned shipments, assets, in-transit, delays & alarms'
        },
        {
          id: 'booking-requests',
          label: 'Booking Requests',
          icon: Package,
          description: 'Eligible verified shipments, cargo weight/qty, origin/dest, transport mode & delivery date'
        },
        {
          id: 'fleet-management',
          label: 'Fleet & Asset Management',
          icon: Truck,
          description: 'Manage Road reefer trucks & drivers, Air carrier booking refs, Marine container & vessel details'
        },
        {
          id: 'shipment-assignment',
          label: 'Shipment Assignment',
          icon: Layers,
          description: 'Assign transport assets, assign responsible driver/crew, set planned pickup & delivery'
        },
        {
          id: 'live-tracking',
          label: 'Live Shipment Tracking',
          icon: MapPin,
          description: 'Interactive GIS map, planned route, checkpoints, live GPS, temperature & delay tracking'
        },
        {
          id: 'in-transit-monitoring',
          label: 'In-Transit Monitoring',
          icon: Radio,
          description: 'Continuous temperature excursions, humidity, door openings & reefer equipment telemetry'
        },
        {
          id: 'pickup-delivery',
          label: 'Pickup & Delivery Operations',
          icon: CheckCircle2,
          description: 'Confirm farm-gate pickup, dispatch seal verification, delivery handover & actual delivered weight'
        },
        {
          id: 'reverse-logistics',
          label: 'Reverse Logistics',
          icon: RotateCcw,
          description: 'Approved return pickup requests, reverse transport assignment, scheduling & return handover'
        },
        {
          id: 'incidents',
          label: 'Incidents & Operational Reports',
          icon: AlertOctagon,
          badgeKey: 'openIncidents',
          description: 'Log delays, equipment failures, route deviations, temperature incidents & evidence'
        },
        {
          id: 'notifications',
          label: 'Notifications',
          icon: BellRing,
          badgeKey: 'activeAlerts',
          description: 'Dispatch alerts, temperature alarms, assignment notices & arrival updates'
        },
        {
          id: 'profile-settings',
          label: 'Profile & Settings',
          icon: Settings,
          description: 'Carrier company details, fleet operator licenses, credentials & security'
        }
      ]
    }
  ],

  // =========================================================================
  // 5. COLD STORAGE PORTAL (10 Items in exact order)
  // =========================================================================
  COLD_STORAGE: [
    {
      sectionId: 'cold-storage-portal',
      sectionLabel: 'COLD STORAGE PORTAL',
      items: [
        {
          id: 'dashboard',
          label: 'Cold Storage Dashboard',
          icon: LayoutDashboard,
          description: 'Total capacity, occupied vs available space, active bookings & chamber alarms'
        },
        {
          id: 'facility-profile',
          label: 'Facility Profile',
          icon: Building2,
          description: 'Address, contact details, certified storage types, operating hours & audit status'
        },
        {
          id: 'capacity-availability',
          label: 'Capacity & Availability',
          icon: BarChart3,
          description: 'Chamber metric ton capacity, available pallets, product compatibility & storage duration'
        },
        {
          id: 'booking-requests',
          label: 'Storage Booking Requests',
          icon: Calendar,
          description: 'Review incoming storage booking requests, accept/reject & allocate chamber capacity'
        },
        {
          id: 'stored-inventory',
          label: 'Stored Inventory',
          icon: PackageCheck,
          description: 'Authorized stored inventory records, product weight/qty, entry & expected exit dates'
        },
        {
          id: 'temperature-monitoring',
          label: 'Temperature Monitoring',
          icon: Thermometer,
          description: 'Continuous chamber temperature & humidity logs, threshold violation alarms & sensors'
        },
        {
          id: 'inbound-outbound',
          label: 'Inbound & Outbound Handover',
          icon: ArrowDownLeft,
          description: 'Receiving confirmation, weight/qty records, dispatch handover & physical evidence'
        },
        {
          id: 'storage-reports',
          label: 'Storage Reports',
          icon: FileText,
          description: 'Chamber occupancy trends, energy efficiency, revenue per MT & compliance scorecards'
        },
        {
          id: 'notifications',
          label: 'Notifications',
          icon: BellRing,
          badgeKey: 'activeAlerts',
          description: 'Intake arrival alerts, temperature alarms, booking notices & dispatch reminders'
        },
        {
          id: 'profile-settings',
          label: 'Profile & Settings',
          icon: Settings,
          description: 'Facility owner details, certifications, chamber configuration & security'
        }
      ]
    }
  ],

  // =========================================================================
  // 6. ADMIN / CONTROL TOWER PORTAL (13 Items in exact order)
  // =========================================================================
  ADMIN: [
    {
      sectionId: 'admin-portal',
      sectionLabel: 'ADMIN / CONTROL TOWER PORTAL',
      items: [
        {
          id: 'control-tower',
          label: 'Admin Dashboard',
          icon: Target,
          description: 'Overall shipments, Road/Air/Marine freight summaries, pending verifications, alerts & system health'
        },
        {
          id: 'user-management',
          label: 'User & Role Management',
          icon: Users,
          description: 'Farmers, Buyers, Verification Team, Logistics, Cold Storage & Admin users/permissions'
        },
        {
          id: 'shipment-management',
          label: 'Shipment Management',
          icon: Package,
          description: 'Search all authorized shipments, booking/verification history & audit state transitions'
        },
        {
          id: 'transport-routes',
          label: 'Transport & Route Oversight',
          icon: Compass,
          description: 'Road, Air, and Marine routes, rate cards, carrier asset records & simulated/live data'
        },
        {
          id: 'verification-oversight',
          label: 'Verification Oversight',
          icon: ClipboardCheck,
          description: 'Inspection queue status, verification reports, rejections, re-inspections & inspector audit'
        },
        {
          id: 'live-monitoring',
          label: 'Live Monitoring & Control Tower',
          icon: Radio,
          description: 'Global multi-sensor telemetry, shipment GIS map, reefer status & operational alerts'
        },
        {
          id: 'alerts',
          label: 'Alerts & Incidents',
          icon: BellRing,
          badgeKey: 'activeAlerts',
          description: 'Temperature excursions, refrigeration problems, delays, route deviations & incident dossiers'
        },
        {
          id: 'disputes',
          label: 'Returns & Dispute Management',
          icon: Scale,
          badgeKey: 'openIncidents',
          description: 'Open claims, evidence review, investigation timeline, return pickups & escrow arbitration'
        },
        {
          id: 'loss-prevention',
          label: 'Loss Prevention & Investigation Engine',
          icon: ShieldAlert,
          description: 'Declared vs verified vs delivered quantity variance & quantitative telemetry reports'
        },
        {
          id: 'analytics',
          label: 'Analytics & Reports',
          icon: BarChart3,
          description: 'Shipment performance, transport-mode comparison, delay analysis, spoilage & loss reports'
        },
        {
          id: 'cold-storage-oversight',
          label: 'Cold Storage Oversight',
          icon: Warehouse,
          description: 'Facility certifications, chamber capacity summaries & temperature compliance audits'
        },
        {
          id: 'audit-logs',
          label: 'Audit Logs',
          icon: FileText,
          description: 'Immutable audit trail of user actions, permission changes, state transitions & claim decisions'
        },
        {
          id: 'system-settings',
          label: 'System Settings & Integrations',
          icon: Settings,
          description: 'API & sensor integration health, database status, rate cards & configurable thresholds'
        }
      ]
    }
  ]
};

/**
 * Returns the default initial landing tab for a given role
 */
export function getRoleDefaultTab(role) {
  const meta = ROLE_METADATA[role];
  return meta ? meta.defaultTab : 'dashboard';
}

/**
 * Returns whether a tab ID is permitted for a given role
 */
export function hasPermission(role, tabId) {
  if (!role) return false;
  if (role === ROLES.ADMIN) return true; // Admin has system-wide access

  const roleNav = ROLE_NAVIGATION[role];
  if (!roleNav) return false;

  // Flatten all items in role navigation
  const allowedIds = roleNav.flatMap(section => section.items.map(item => item.id));
  return allowedIds.includes(tabId);
}

/**
 * Gets the navigation sections for a specific role
 */
export function getRoleNavSections(role) {
  return ROLE_NAVIGATION[role] || ROLE_NAVIGATION.FARMER;
}
