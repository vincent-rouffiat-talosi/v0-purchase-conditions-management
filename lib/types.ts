// Types pour la gestion des conditions d'achat

export type Channel = 'direct' | 'stock';

export type SiteConfiguration = 'national' | 'group';

export interface Site {
  id: string;
  name: string;
  type: 'warehouse' | 'store';
  region: string;
}

export interface SiteGroup {
  id: string;
  name: string;
  sites: Site[];
}

export interface Supplier {
  id: string;
  name: string;
  code: string;
  siteConfiguration: SiteConfiguration;
  availableChannels: Channel[];
  defaultSiteGroups: SiteGroup[];
}

export interface PurchaseCondition {
  id: string;
  supplierId: string;
  channel: Channel;
  incoterm: string;
  sites: Site[];
}

export interface ProductReference {
  id: string;
  sku: string;
  name: string;
  category: string;
  barcode: string;
  supplierReference: string;
  purchaseConditions: PurchaseCondition[];
}

export interface ModificationAction {
  type: 'change_supplier' | 'change_channel' | 'change_sites';
  referenceIds: string[];
  referenceDetails?: Array<{ id: string; sku: string; name: string; barcode: string; supplierRef: string }>; // For detailed view
  details: {
    oldSupplierId?: string;
    oldSupplierConfig?: SiteConfiguration;
    newSupplierId?: string;
    newSupplierConfig?: SiteConfiguration;
    barcodeUpdates?: Record<string, { old: string; new: string }>; // referenceId -> barcode changes
    supplierRefUpdates?: Record<string, { old: string; new: string }>; // referenceId -> supplier ref changes
    oldChannel?: Channel;
    newChannel?: Channel;
    oldSites?: Site[];
    newSites?: Site[];
  };
}

export interface CoherenceAlert {
  type: 'reference_without_sites' | 'orphan_sites';
  severity: 'error' | 'warning';
  message: string;
  referenceIds?: string[];
  siteIds?: string[];
}

export interface ModificationSummary {
  actions: ModificationAction[];
  alerts: CoherenceAlert[];
  affectedReferences: number;
  affectedSites: number;
}
