import type { Site, SiteGroup, Supplier, ProductReference } from './types';

// Sites (warehouses and stores) - Spain
export const warehouses: Site[] = [
  { id: 'wh-1', name: 'Madrid Central Warehouse', type: 'warehouse', region: 'Comunidad de Madrid' },
  { id: 'wh-2', name: 'Barcelona Warehouse', type: 'warehouse', region: 'Cataluna' },
  { id: 'wh-3', name: 'Valencia Warehouse', type: 'warehouse', region: 'Comunidad Valenciana' },
  { id: 'wh-4', name: 'Sevilla Warehouse', type: 'warehouse', region: 'Andalucia' },
];

export const stores: Site[] = [
  { id: 'st-1', name: 'Madrid Centro Store', type: 'store', region: 'Comunidad de Madrid' },
  { id: 'st-2', name: 'Madrid Vallecas Store', type: 'store', region: 'Comunidad de Madrid' },
  { id: 'st-3', name: 'Alcala de Henares Store', type: 'store', region: 'Comunidad de Madrid' },
  { id: 'st-4', name: 'Barcelona Diagonal Store', type: 'store', region: 'Cataluna' },
  { id: 'st-5', name: 'Barcelona Sants Store', type: 'store', region: 'Cataluna' },
  { id: 'st-6', name: 'Tarragona Store', type: 'store', region: 'Cataluna' },
  { id: 'st-7', name: 'Valencia Centro Store', type: 'store', region: 'Comunidad Valenciana' },
  { id: 'st-8', name: 'Alicante Store', type: 'store', region: 'Comunidad Valenciana' },
  { id: 'st-9', name: 'Castellon Store', type: 'store', region: 'Comunidad Valenciana' },
  { id: 'st-10', name: 'Sevilla Centro Store', type: 'store', region: 'Andalucia' },
  { id: 'st-11', name: 'Malaga Store', type: 'store', region: 'Andalucia' },
  { id: 'st-12', name: 'Granada Store', type: 'store', region: 'Andalucia' },
];

export const allSites: Site[] = [...warehouses, ...stores];

// Site groups - Spanish regions
export const siteGroups: SiteGroup[] = [
  { id: 'grp-centro', name: 'Centro Zone', sites: stores.filter(s => s.region === 'Comunidad de Madrid') },
  { id: 'grp-cataluna', name: 'Cataluna Zone', sites: stores.filter(s => s.region === 'Cataluna') },
  { id: 'grp-levante', name: 'Levante Zone', sites: stores.filter(s => s.region === 'Comunidad Valenciana') },
  { id: 'grp-sur', name: 'Sur Zone', sites: stores.filter(s => s.region === 'Andalucia') },
];

// Suppliers - Spanish market
export const suppliers: Supplier[] = [
  {
    id: 'sup-1',
    name: 'Herramientas Pro Espana',
    code: 'HPE',
    siteConfiguration: 'national',
    availableChannels: ['direct', 'stock'],
    defaultSiteGroups: [],
  },
  {
    id: 'sup-2',
    name: 'Bricomart Iberica',
    code: 'BMI',
    siteConfiguration: 'group',
    availableChannels: ['direct'],
    defaultSiteGroups: [siteGroups[0], siteGroups[1]],
  },
  {
    id: 'sup-3',
    name: 'Ferreteria Garcia',
    code: 'FGR',
    siteConfiguration: 'group',
    availableChannels: ['direct', 'stock'],
    defaultSiteGroups: [siteGroups[2], siteGroups[3]],
  },
  {
    id: 'sup-4',
    name: 'Suministros del Sur',
    code: 'SDS',
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
