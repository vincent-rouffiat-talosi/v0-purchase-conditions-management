import type { Site, SiteGroup, Supplier, ProductReference } from './types';

// Sites (warehouses and stores)
export const warehouses: Site[] = [
  { id: 'wh-1', name: 'Paris North Warehouse', type: 'warehouse', region: 'Ile-de-France' },
  { id: 'wh-2', name: 'Lyon Warehouse', type: 'warehouse', region: 'Auvergne-Rhone-Alpes' },
  { id: 'wh-3', name: 'Marseille Warehouse', type: 'warehouse', region: 'PACA' },
  { id: 'wh-4', name: 'Bordeaux Warehouse', type: 'warehouse', region: 'Nouvelle-Aquitaine' },
];

export const stores: Site[] = [
  { id: 'st-1', name: 'Paris 15 Store', type: 'store', region: 'Ile-de-France' },
  { id: 'st-2', name: 'Paris 20 Store', type: 'store', region: 'Ile-de-France' },
  { id: 'st-3', name: 'Versailles Store', type: 'store', region: 'Ile-de-France' },
  { id: 'st-4', name: 'Lyon Central Store', type: 'store', region: 'Auvergne-Rhone-Alpes' },
  { id: 'st-5', name: 'Lyon East Store', type: 'store', region: 'Auvergne-Rhone-Alpes' },
  { id: 'st-6', name: 'Grenoble Store', type: 'store', region: 'Auvergne-Rhone-Alpes' },
  { id: 'st-7', name: 'Marseille North Store', type: 'store', region: 'PACA' },
  { id: 'st-8', name: 'Marseille South Store', type: 'store', region: 'PACA' },
  { id: 'st-9', name: 'Nice Store', type: 'store', region: 'PACA' },
  { id: 'st-10', name: 'Bordeaux Central Store', type: 'store', region: 'Nouvelle-Aquitaine' },
  { id: 'st-11', name: 'Bordeaux Lake Store', type: 'store', region: 'Nouvelle-Aquitaine' },
  { id: 'st-12', name: 'Toulouse Store', type: 'store', region: 'Occitanie' },
];

export const allSites: Site[] = [...warehouses, ...stores];

// Site groups
export const siteGroups: SiteGroup[] = [
  { id: 'grp-north', name: 'North Zone', sites: stores.filter(s => s.region === 'Ile-de-France') },
  { id: 'grp-east', name: 'East Zone', sites: stores.filter(s => s.region === 'Auvergne-Rhone-Alpes') },
  { id: 'grp-south', name: 'South Zone', sites: stores.filter(s => s.region === 'PACA' || s.region === 'Occitanie') },
  { id: 'grp-west', name: 'West Zone', sites: stores.filter(s => s.region === 'Nouvelle-Aquitaine') },
];

// Suppliers
export const suppliers: Supplier[] = [
  {
    id: 'sup-1',
    name: 'Pro Tools France',
    code: 'PTF',
    siteConfiguration: 'national',
    availableChannels: ['direct', 'stock'],
    defaultSiteGroups: [],
  },
  {
    id: 'sup-2',
    name: 'Bricomat International',
    code: 'BMI',
    siteConfiguration: 'group',
    availableChannels: ['direct'],
    defaultSiteGroups: [siteGroups[0], siteGroups[1]],
  },
  {
    id: 'sup-3',
    name: 'Durand Hardware',
    code: 'DHW',
    siteConfiguration: 'group',
    availableChannels: ['direct', 'stock'],
    defaultSiteGroups: [siteGroups[2], siteGroups[3]],
  },
  {
    id: 'sup-4',
    name: 'Tools & More',
    code: 'T&M',
    siteConfiguration: 'national',
    availableChannels: ['stock'],
    defaultSiteGroups: [],
  },
];

// Product categories
export const categories = [
  'Power Tools',
  'Hand Tools',
  'Hardware',
  'Fasteners',
  'Measuring & Layout',
  'Safety Equipment',
  'Storage',
  'Consumables',
];

// Product references (data generation)
const productNames = [
  'Cordless Drill 18V',
  'Electric Screwdriver',
  'Hammer 500g',
  'Phillips Screwdriver',
  'Multi-grip Pliers',
  'Jigsaw',
  'Spirit Level 60cm',
  'Tape Measure 5m',
  'Adjustable Wrench',
  'Orbital Sander',
  'Circular Saw',
  'Electric Planer',
  'Angle Grinder',
  'Router',
  'Electric Stapler',
];

function generateBarcode(): string {
  return `30${Math.random().toString().slice(2, 15)}`;
}

function generateSupplierRef(supplierCode: string, index: number): string {
  return `${supplierCode}-${String(index).padStart(6, '0')}`;
}

export function generateProductReferences(count: number = 50): ProductReference[] {
  const references: ProductReference[] = [];
  
  for (let i = 0; i < count; i++) {
    const supplier = suppliers[i % suppliers.length];
    const productName = productNames[i % productNames.length];
    const category = categories[i % categories.length];
    const variant = Math.floor(i / productNames.length) + 1;
    
    const channel = supplier.availableChannels[0];
    const sites = channel === 'stock' 
      ? warehouses 
      : supplier.siteConfiguration === 'national' 
        ? stores 
        : supplier.defaultSiteGroups.flatMap(g => g.sites);
    
    references.push({
      id: `ref-${String(i + 1).padStart(5, '0')}`,
      sku: `SKU-${String(i + 1).padStart(6, '0')}`,
      name: variant > 1 ? `${productName} V${variant}` : productName,
      category,
      barcode: generateBarcode(),
      supplierReference: generateSupplierRef(supplier.code, i + 1),
      purchaseConditions: [{
        id: `pc-${i + 1}`,
        supplierId: supplier.id,
        channel,
        incoterm: 'DDP',
        sites,
      }],
    });
  }
  
  return references;
}

// Generate 500 references for demo (in production, data would come from API with pagination)
export const productReferences = generateProductReferences(500);
