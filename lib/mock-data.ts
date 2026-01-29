import type { Site, SiteGroup, Supplier, ProductReference } from './types';

// Sites (entrepots et magasins)
export const warehouses: Site[] = [
  { id: 'wh-1', name: 'Entrepot Paris Nord', type: 'warehouse', region: 'Ile-de-France' },
  { id: 'wh-2', name: 'Entrepot Lyon', type: 'warehouse', region: 'Auvergne-Rhone-Alpes' },
  { id: 'wh-3', name: 'Entrepot Marseille', type: 'warehouse', region: 'PACA' },
  { id: 'wh-4', name: 'Entrepot Bordeaux', type: 'warehouse', region: 'Nouvelle-Aquitaine' },
];

export const stores: Site[] = [
  { id: 'st-1', name: 'Magasin Paris 15', type: 'store', region: 'Ile-de-France' },
  { id: 'st-2', name: 'Magasin Paris 20', type: 'store', region: 'Ile-de-France' },
  { id: 'st-3', name: 'Magasin Versailles', type: 'store', region: 'Ile-de-France' },
  { id: 'st-4', name: 'Magasin Lyon Centre', type: 'store', region: 'Auvergne-Rhone-Alpes' },
  { id: 'st-5', name: 'Magasin Lyon Est', type: 'store', region: 'Auvergne-Rhone-Alpes' },
  { id: 'st-6', name: 'Magasin Grenoble', type: 'store', region: 'Auvergne-Rhone-Alpes' },
  { id: 'st-7', name: 'Magasin Marseille Nord', type: 'store', region: 'PACA' },
  { id: 'st-8', name: 'Magasin Marseille Sud', type: 'store', region: 'PACA' },
  { id: 'st-9', name: 'Magasin Nice', type: 'store', region: 'PACA' },
  { id: 'st-10', name: 'Magasin Bordeaux Centre', type: 'store', region: 'Nouvelle-Aquitaine' },
  { id: 'st-11', name: 'Magasin Bordeaux Lac', type: 'store', region: 'Nouvelle-Aquitaine' },
  { id: 'st-12', name: 'Magasin Toulouse', type: 'store', region: 'Occitanie' },
];

export const allSites: Site[] = [...warehouses, ...stores];

// Groupes de sites
export const siteGroups: SiteGroup[] = [
  { id: 'grp-north', name: 'Zone Nord', sites: stores.filter(s => s.region === 'Ile-de-France') },
  { id: 'grp-east', name: 'Zone Est', sites: stores.filter(s => s.region === 'Auvergne-Rhone-Alpes') },
  { id: 'grp-south', name: 'Zone Sud', sites: stores.filter(s => s.region === 'PACA' || s.region === 'Occitanie') },
  { id: 'grp-west', name: 'Zone Ouest', sites: stores.filter(s => s.region === 'Nouvelle-Aquitaine') },
];

// Fournisseurs
export const suppliers: Supplier[] = [
  {
    id: 'sup-1',
    name: 'Outillage Pro France',
    code: 'OPF',
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
    name: 'Quincaillerie Durand',
    code: 'QDU',
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

// Categories de produits
export const categories = [
  'Outillage electroportatif',
  'Outillage a main',
  'Quincaillerie',
  'Fixation',
  'Mesure et tracage',
  'Securite',
  'Rangement',
  'Consommables',
];

// References produits (generation de donnees)
const productNames = [
  'Perceuse sans fil 18V',
  'Visseuse electrique',
  'Marteau 500g',
  'Tournevis cruciforme',
  'Pince multiprise',
  'Scie sauteuse',
  'Niveau a bulle 60cm',
  'Metre ruban 5m',
  'Cle a molette',
  'Ponceuse orbitale',
  'Scie circulaire',
  'Rabot electrique',
  'Meuleuse angulaire',
  'Defonceuse',
  'Agrafeuse electrique',
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
