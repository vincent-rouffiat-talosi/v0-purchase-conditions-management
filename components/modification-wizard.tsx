'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Building2,
  Truck,
  Warehouse,
  MapPin,
  Package,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react';
import type { ProductReference, Supplier, Channel, Site, ModificationAction, CoherenceAlert } from '@/lib/types';
import { suppliers, stores, warehouses, siteGroups } from '@/lib/mock-data';

type ModificationType = 'supplier' | 'channel' | 'sites';

interface ModificationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedReferences: ProductReference[];
  onApplyChanges: (actions: ModificationAction[], alerts: CoherenceAlert[]) => void;
}

interface WizardState {
  modificationType: ModificationType | null;
  newSupplierId: string | null;
  barcodesByReference: Record<string, string>; // referenceId -> new barcode (mandatory)
  supplierRefsByReference: Record<string, string>; // referenceId -> new supplier ref (mandatory)
  selectedChannelForSupplier: Channel | null; // When new supplier has multiple channels
  newChannel: Channel | null;
  selectedSites: Site[];
}

const initialState: WizardState = {
  modificationType: null,
  newSupplierId: null,
  barcodesByReference: {},
  supplierRefsByReference: {},
  selectedChannelForSupplier: null,
  newChannel: null,
  selectedSites: [],
};

export function ModificationWizard({
  open,
  onOpenChange,
  selectedReferences,
  onApplyChanges,
}: ModificationWizardProps) {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>(initialState);
  const [alerts, setAlerts] = useState<CoherenceAlert[]>([]);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setState(initialState);
      setAlerts([]);
    }
  }, [open]);

  const getNewSupplier = (): Supplier | undefined => {
    return suppliers.find(s => s.id === state.newSupplierId);
  };

  const getCurrentSuppliers = (): Supplier[] => {
    const supplierIds = new Set<string>();
    selectedReferences.forEach(ref => {
      ref.purchaseConditions.forEach(pc => supplierIds.add(pc.supplierId));
    });
    return suppliers.filter(s => supplierIds.has(s.id));
  };

  const getCurrentChannel = (): Channel | null => {
    if (state.newChannel) return state.newChannel;
    // For site modification, get the current channel from selected references
    const channels = new Set<Channel>();
    selectedReferences.forEach(ref => {
      ref.purchaseConditions.forEach(pc => channels.add(pc.channel));
    });
    // If all references have the same channel, return it
    if (channels.size === 1) return [...channels][0];
    return null;
  };

  const getAvailableSites = (): Site[] => {
    const channel = getCurrentChannel();
    if (channel === 'stock') {
      return warehouses;
    }
    if (channel === 'direct') {
      return stores;
    }
    // If mixed channels, show all sites
    return [...stores, ...warehouses];
  };

  const validateAndGenerateAlerts = (): CoherenceAlert[] => {
    const newAlerts: CoherenceAlert[] = [];

    if (state.modificationType === 'sites' && state.selectedSites.length === 0) {
      newAlerts.push({
        type: 'reference_without_sites',
        severity: 'error',
        message: `${selectedReferences.length} reference(s) seront sans site affecte`,
        referenceIds: selectedReferences.map(r => r.id),
      });
    }

    if (state.modificationType === 'channel' && state.selectedSites.length === 0) {
      const supplier = getNewSupplier() || getCurrentSuppliers()[0];
      if (supplier?.siteConfiguration === 'group') {
        newAlerts.push({
          type: 'reference_without_sites',
          severity: 'error',
          message: 'Configuration "groupe de sites" : vous devez selectionner au moins un site',
          referenceIds: selectedReferences.map(r => r.id),
        });
      }
    }

    // Check for orphan sites
    if (state.modificationType === 'sites') {
      const currentSiteIds = new Set<string>();
      selectedReferences.forEach(ref => {
        ref.purchaseConditions.forEach(pc => {
          pc.sites.forEach(site => currentSiteIds.add(site.id));
        });
      });

      const newSiteIds = new Set(state.selectedSites.map(s => s.id));
      const orphanSiteIds = [...currentSiteIds].filter(id => !newSiteIds.has(id));

      if (orphanSiteIds.length > 0) {
        newAlerts.push({
          type: 'orphan_sites',
          severity: 'warning',
          message: `${orphanSiteIds.length} site(s) ne seront plus affectes a ces references`,
          siteIds: orphanSiteIds,
        });
      }
    }

    return newAlerts;
  };

  const handleNext = () => {
    if (step === 3) {
      const newAlerts = validateAndGenerateAlerts();
      setAlerts(newAlerts);
    }
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleApply = () => {
    const actions: ModificationAction[] = [];

    if (state.modificationType === 'supplier' && state.newSupplierId) {
      const oldSuppliers = getCurrentSuppliers();
      const newSupplier = getNewSupplier();
      
      // Build barcode and supplier ref updates with old values
      const barcodeUpdates: Record<string, { old: string; new: string }> = {};
      const supplierRefUpdates: Record<string, { old: string; new: string }> = {};
      
      selectedReferences.forEach(ref => {
        if (state.barcodesByReference[ref.id]) {
          barcodeUpdates[ref.id] = {
            old: ref.barcode,
            new: state.barcodesByReference[ref.id]
          };
        }
        if (state.supplierRefsByReference[ref.id]) {
          supplierRefUpdates[ref.id] = {
            old: ref.supplierReference,
            new: state.supplierRefsByReference[ref.id]
          };
        }
      });

      actions.push({
        type: 'change_supplier',
        referenceIds: selectedReferences.map(r => r.id),
        referenceDetails: selectedReferences.map(r => ({
          id: r.id,
          sku: r.sku,
          name: r.name,
          barcode: r.barcode,
          supplierRef: r.supplierReference
        })),
        details: {
          oldSupplierId: oldSuppliers[0]?.id,
          oldSupplierConfig: oldSuppliers[0]?.siteConfiguration,
          newSupplierId: state.newSupplierId,
          newSupplierConfig: newSupplier?.siteConfiguration,
          barcodeUpdates,
          supplierRefUpdates,
          newChannel: state.selectedChannelForSupplier || undefined,
        },
      });
    }

    if (state.modificationType === 'channel' && state.newChannel) {
      // Get old channel from selected references
      const oldChannels = new Set<Channel>();
      const oldSites = new Set<Site>();
      selectedReferences.forEach(ref => {
        ref.purchaseConditions.forEach(pc => {
          oldChannels.add(pc.channel);
          pc.sites.forEach(s => oldSites.add(s));
        });
      });

      actions.push({
        type: 'change_channel',
        referenceIds: selectedReferences.map(r => r.id),
        referenceDetails: selectedReferences.map(r => ({
          id: r.id,
          sku: r.sku,
          name: r.name,
          barcode: r.barcode,
          supplierRef: r.supplierReference
        })),
        details: {
          oldChannel: [...oldChannels][0],
          newChannel: state.newChannel,
          oldSites: [...oldSites],
          newSites: state.selectedSites,
        },
      });
    }

    if (state.modificationType === 'sites') {
      const oldSites = new Set<Site>();
      selectedReferences.forEach(ref => {
        ref.purchaseConditions.forEach(pc => {
          pc.sites.forEach(s => oldSites.add(s));
        });
      });

      actions.push({
        type: 'change_sites',
        referenceIds: selectedReferences.map(r => r.id),
        referenceDetails: selectedReferences.map(r => ({
          id: r.id,
          sku: r.sku,
          name: r.name,
          barcode: r.barcode,
          supplierRef: r.supplierReference
        })),
        details: {
          oldSites: [...oldSites],
          newSites: state.selectedSites,
        },
      });
    }

    onApplyChanges(actions, alerts);
    onOpenChange(false);
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return state.modificationType !== null;
      case 2:
        if (state.modificationType === 'supplier') {
          if (!state.newSupplierId) return false;
          const newSupplier = getNewSupplier();
          // If supplier has multiple channels, one must be selected
          if (newSupplier && newSupplier.availableChannels.length > 1 && !state.selectedChannelForSupplier) {
            return false;
          }
          // All references must have barcode and supplier ref filled
          const allBarcodesSet = selectedReferences.every(ref => 
            state.barcodesByReference[ref.id]?.trim()
          );
          const allSupplierRefsSet = selectedReferences.every(ref => 
            state.supplierRefsByReference[ref.id]?.trim()
          );
          return allBarcodesSet && allSupplierRefsSet;
        }
        if (state.modificationType === 'channel') {
          return state.newChannel !== null;
        }
        return true;
      case 3:
        const supplier = getNewSupplier() || getCurrentSuppliers()[0];
        if (supplier?.siteConfiguration === 'national') {
          return true;
        }
        return state.selectedSites.length > 0;
      case 4:
        return !alerts.some(a => a.severity === 'error');
      default:
        return true;
    }
  };

  const toggleSite = (site: Site) => {
    setState(prev => {
      const exists = prev.selectedSites.some(s => s.id === site.id);
      if (exists) {
        return { ...prev, selectedSites: prev.selectedSites.filter(s => s.id !== site.id) };
      }
      return { ...prev, selectedSites: [...prev.selectedSites, site] };
    });
  };

  const toggleSiteGroup = (groupId: string) => {
    const group = siteGroups.find(g => g.id === groupId);
    if (!group) return;

    setState(prev => {
      const allSelected = group.sites.every(site =>
        prev.selectedSites.some(s => s.id === site.id)
      );

      if (allSelected) {
        return {
          ...prev,
          selectedSites: prev.selectedSites.filter(
            s => !group.sites.some(gs => gs.id === s.id)
          ),
        };
      }

      const newSites = [...prev.selectedSites];
      group.sites.forEach(site => {
        if (!newSites.some(s => s.id === site.id)) {
          newSites.push(site);
        }
      });
      return { ...prev, selectedSites: newSites };
    });
  };

  const selectAllSites = () => {
    const available = getAvailableSites();
    setState(prev => ({ ...prev, selectedSites: available }));
  };

  const clearAllSites = () => {
    setState(prev => ({ ...prev, selectedSites: [] }));
  };

  // Step 1: Choose modification type
  const renderStep1 = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Selectionnez le type de modification a appliquer aux {selectedReferences.length} reference(s) selectionnee(s).
      </p>
      <RadioGroup
        value={state.modificationType || ''}
        onValueChange={value => setState(prev => ({ ...prev, modificationType: value as ModificationType }))}
        className="space-y-3"
      >
        <label
          htmlFor="mod-supplier"
          className="flex items-start gap-4 p-4 rounded-lg border border-border cursor-pointer hover:bg-secondary/50 transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent/10"
        >
          <RadioGroupItem value="supplier" id="mod-supplier" className="mt-1" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-accent" />
              <span className="font-medium">Changer de fournisseur</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Modifier le fournisseur et mettre a jour les codes-barres et references fournisseur
            </p>
          </div>
        </label>

        <label
          htmlFor="mod-channel"
          className="flex items-start gap-4 p-4 rounded-lg border border-border cursor-pointer hover:bg-secondary/50 transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent/10"
        >
          <RadioGroupItem value="channel" id="mod-channel" className="mt-1" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-accent" />
              <span className="font-medium">Changer de circuit</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Passer de Direct a Stock ou inversement, avec mise a jour des sites
            </p>
          </div>
        </label>

        <label
          htmlFor="mod-sites"
          className="flex items-start gap-4 p-4 rounded-lg border border-border cursor-pointer hover:bg-secondary/50 transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent/10"
        >
          <RadioGroupItem value="sites" id="mod-sites" className="mt-1" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-accent" />
              <span className="font-medium">Modifier les affectations de sites</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Ajouter ou retirer des magasins ou entrepots de la liste d&apos;affectation
            </p>
          </div>
        </label>
      </RadioGroup>
    </div>
  );

  // Step 2: Configure modification details
  const renderStep2 = () => {
    if (state.modificationType === 'supplier') {
      const newSupplier = getNewSupplier();
      const hasMultipleChannels = newSupplier && newSupplier.availableChannels.length > 1;

      return (
        <div className="space-y-6">
          <div className="space-y-3">
            <Label>Nouveau fournisseur</Label>
            <Select
              value={state.newSupplierId || ''}
              onValueChange={value => setState(prev => ({ 
                ...prev, 
                newSupplierId: value,
                selectedChannelForSupplier: null // Reset channel when supplier changes
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selectionnez un fournisseur" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs px-1.5 py-0.5 bg-secondary rounded">
                        {s.code}
                      </span>
                      {s.name}
                      <span className="text-xs text-muted-foreground ml-2">
                        ({s.availableChannels.map(c => c === 'direct' ? 'Direct' : 'Stock').join(' + ')})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {state.newSupplierId && newSupplier && (
            <>
              {/* Supplier info */}
              <div className="p-3 rounded-lg bg-secondary/30 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>Type zone : <strong>{newSupplier.siteConfiguration === 'national' ? 'National' : 'Groupe de sites'}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <span>Circuits acceptes : </span>
                  {newSupplier.availableChannels.map(ch => (
                    <Badge key={ch} variant="outline" className="text-xs">
                      {ch === 'direct' ? 'Direct' : 'Stock'}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Channel selection if multiple channels available */}
              {hasMultipleChannels && (
                <div className="space-y-3">
                  <Label>Circuit de livraison</Label>
                  <RadioGroup
                    value={state.selectedChannelForSupplier || ''}
                    onValueChange={value => setState(prev => ({ 
                      ...prev, 
                      selectedChannelForSupplier: value as Channel,
                    }))}
                    className="space-y-2"
                  >
                    {newSupplier.availableChannels.map(ch => (
                      <label
                        key={ch}
                        htmlFor={`sup-channel-${ch}`}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-secondary/50 transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent/10"
                      >
                        <RadioGroupItem value={ch} id={`sup-channel-${ch}`} />
                        {ch === 'direct' ? (
                          <Truck className="h-4 w-4 text-accent" />
                        ) : (
                          <Warehouse className="h-4 w-4 text-accent" />
                        )}
                        <span className="font-medium">{ch === 'direct' ? 'Direct (magasins)' : 'Stock (entrepots)'}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
              )}

              <Separator />

              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <p className="text-sm text-warning font-medium">
                    Mise a jour obligatoire des codes-barres et references fournisseur
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Chaque reference doit avoir un nouveau code-barres et une nouvelle reference fournisseur.
                  </p>
                </div>

                <ScrollArea className="h-[250px] rounded-lg border border-border">
                  <div className="p-3 space-y-4">
                    {selectedReferences.map(ref => (
                      <div key={ref.id} className="p-3 rounded-lg bg-secondary/20 space-y-3">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{ref.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{ref.sku}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">
                              Code-barres actuel : <span className="font-mono">{ref.barcode}</span>
                            </Label>
                            <Input
                              placeholder="Nouveau code-barres"
                              className="font-mono text-sm"
                              value={state.barcodesByReference[ref.id] || ''}
                              onChange={e => setState(prev => ({
                                ...prev,
                                barcodesByReference: {
                                  ...prev.barcodesByReference,
                                  [ref.id]: e.target.value
                                }
                              }))}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">
                              Ref. four. actuelle : <span className="font-mono">{ref.supplierReference}</span>
                            </Label>
                            <Input
                              placeholder="Nouvelle ref. fournisseur"
                              className="font-mono text-sm"
                              value={state.supplierRefsByReference[ref.id] || ''}
                              onChange={e => setState(prev => ({
                                ...prev,
                                supplierRefsByReference: {
                                  ...prev.supplierRefsByReference,
                                  [ref.id]: e.target.value
                                }
                              }))}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                
                <p className="text-xs text-muted-foreground">
                  {selectedReferences.filter(ref => state.barcodesByReference[ref.id]?.trim() && state.supplierRefsByReference[ref.id]?.trim()).length} / {selectedReferences.length} reference(s) completee(s)
                </p>
              </div>
            </>
          )}
        </div>
      );
    }

    if (state.modificationType === 'channel') {
      return (
        <div className="space-y-4">
          <Label>Nouveau circuit de distribution</Label>
          <RadioGroup
            value={state.newChannel || ''}
            onValueChange={value => {
              setState(prev => ({
                ...prev,
                newChannel: value as Channel,
                selectedSites: [],
              }));
            }}
            className="space-y-3"
          >
            <label
              htmlFor="channel-direct"
              className="flex items-start gap-4 p-4 rounded-lg border border-border cursor-pointer hover:bg-secondary/50 transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent/10"
            >
              <RadioGroupItem value="direct" id="channel-direct" className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-accent" />
                  <span className="font-medium">Direct</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Livraison directe du fournisseur vers les magasins
                </p>
              </div>
            </label>

            <label
              htmlFor="channel-stock"
              className="flex items-start gap-4 p-4 rounded-lg border border-border cursor-pointer hover:bg-secondary/50 transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent/10"
            >
              <RadioGroupItem value="stock" id="channel-stock" className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Warehouse className="h-4 w-4 text-accent" />
                  <span className="font-medium">Stock</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Livraison vers les entrepots pour stockage et redistribution
                </p>
              </div>
            </label>
          </RadioGroup>
        </div>
      );
    }

    // Sites modification - show current configuration
    const currentSites = new Set<string>();
    const currentChannels = new Set<Channel>();
    selectedReferences.forEach(ref => {
      ref.purchaseConditions.forEach(pc => {
        currentChannels.add(pc.channel);
        pc.sites.forEach(site => currentSites.add(site.id));
      });
    });

    const channelLabel = currentChannels.size === 1 
      ? ([...currentChannels][0] === 'direct' ? 'Direct (magasins)' : 'Stock (entrepots)')
      : 'Mixte';

    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Configuration actuelle : {currentSites.size} site(s) affecte(s) aux references selectionnees.
        </p>
        <div className="p-4 rounded-lg bg-secondary/30 space-y-2">
          <div className="flex items-center gap-2">
            {[...currentChannels][0] === 'stock' ? (
              <Warehouse className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Truck className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm">Circuit actuel : <strong>{channelLabel}</strong></span>
          </div>
          <p className="text-sm text-muted-foreground">
            A l&apos;etape suivante, vous pourrez modifier les affectations de {[...currentChannels][0] === 'stock' ? 'entrepots' : 'magasins'}.
          </p>
        </div>
      </div>
    );
  };

  // Step 3: Site selection (if needed)
  const renderStep3 = () => {
    const supplier = getNewSupplier() || getCurrentSuppliers()[0];
    const isNational = supplier?.siteConfiguration === 'national';
    const availableSites = getAvailableSites();

    // For national configuration, site selection is not allowed
    if (isNational) {
      const channel = getCurrentChannel();
      const siteType = channel === 'stock' ? 'entrepots' : 'magasins';
      
      return (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
            <div className="flex items-center gap-2 text-accent">
              <Check className="h-4 w-4" />
              <span className="font-medium">Configuration nationale</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Le fournisseur est configure en mode &quot;National&quot;. Tous les {siteType} seront automatiquement affectes.
            </p>
            {state.modificationType === 'sites' && (
              <p className="text-sm text-warning mt-2">
                La modification unitaire des sites n&apos;est pas possible en configuration nationale.
              </p>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {availableSites.length} site(s) seront affectes automatiquement.
          </div>
        </div>
      );
    }

    const channel = getCurrentChannel();
    const groupedSites = channel === 'stock' 
      ? null 
      : siteGroups;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {state.selectedSites.length} site(s) selectionne(s)
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAllSites}>
              Tout selectionner
            </Button>
            <Button variant="outline" size="sm" onClick={clearAllSites}>
              Tout deselectionner
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[300px] rounded-lg border border-border">
          <div className="p-4 space-y-4">
            {groupedSites ? (
              groupedSites.map(group => {
                const allSelected = group.sites.every(site =>
                  state.selectedSites.some(s => s.id === site.id)
                );
                const someSelected = group.sites.some(site =>
                  state.selectedSites.some(s => s.id === site.id)
                );

                return (
                  <div key={group.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={allSelected}
                        ref={node => {
                          if (node) {
                            (node as HTMLButtonElement & { indeterminate: boolean }).indeterminate = someSelected && !allSelected;
                          }
                        }}
                        onCheckedChange={() => toggleSiteGroup(group.id)}
                      />
                      <span className="font-medium text-sm">{group.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {group.sites.length}
                      </Badge>
                    </div>
                    <div className="ml-6 space-y-1">
                      {group.sites.map(site => (
                        <label
                          key={site.id}
                          className="flex items-center gap-2 p-2 rounded hover:bg-secondary/50 cursor-pointer"
                        >
                          <Checkbox
                            checked={state.selectedSites.some(s => s.id === site.id)}
                            onCheckedChange={() => toggleSite(site)}
                          />
                          <Warehouse className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{site.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="space-y-1">
                {availableSites.map(site => (
                  <label
                    key={site.id}
                    className="flex items-center gap-2 p-2 rounded hover:bg-secondary/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={state.selectedSites.some(s => s.id === site.id)}
                      onCheckedChange={() => toggleSite(site)}
                    />
                    <Warehouse className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">{site.name}</span>
                    <Badge variant="outline" className="text-xs ml-auto">
                      {site.region}
                    </Badge>
                  </label>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    );
  };

  // Step 4: Summary and confirmation
  const renderStep4 = () => {
    const supplier = getNewSupplier();

    return (
      <div className="space-y-6">
        {/* Actions summary */}
        <div className="space-y-3">
          <h4 className="font-medium">Recapitulatif des modifications</h4>
          <div className="p-4 rounded-lg bg-secondary/30 space-y-2">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <strong>{selectedReferences.length}</strong> reference(s) concernee(s)
              </span>
            </div>

            {state.modificationType === 'supplier' && supplier && (
              <>
                <Separator className="my-2" />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Ancien fournisseur</p>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{getCurrentSuppliers()[0]?.name || '-'}</span>
                    </div>
                    <Badge variant="outline" className="text-xs mt-1">
                      {getCurrentSuppliers()[0]?.siteConfiguration === 'national' ? 'National' : 'Groupe'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Nouveau fournisseur</p>
                    <div className="flex items-center gap-2 text-accent">
                      <Building2 className="h-4 w-4" />
                      <span className="text-sm font-medium">{supplier.name}</span>
                    </div>
                    <Badge className="text-xs mt-1 bg-accent text-accent-foreground">
                      {supplier.siteConfiguration === 'national' ? 'National' : 'Groupe'}
                    </Badge>
                  </div>
                </div>
                {state.selectedChannelForSupplier && (
                  <div className="flex items-center gap-2 mt-3">
                    {state.selectedChannelForSupplier === 'stock' ? (
                      <Warehouse className="h-4 w-4 text-accent" />
                    ) : (
                      <Truck className="h-4 w-4 text-accent" />
                    )}
                    <span className="text-sm">
                      Circuit : <strong>{state.selectedChannelForSupplier === 'stock' ? 'Stock' : 'Direct'}</strong>
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <Check className="h-4 w-4 text-accent" />
                  <span className="text-sm">
                    {Object.keys(state.barcodesByReference).filter(k => state.barcodesByReference[k]).length} code(s)-barres et ref. fournisseur mis a jour
                  </span>
                </div>
              </>
            )}

            {state.modificationType === 'channel' && (
              <>
                <div className="flex items-center gap-2">
                  {state.newChannel === 'stock' ? (
                    <Warehouse className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Truck className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm">
                    Nouveau circuit : <strong>{state.newChannel === 'stock' ? 'Stock' : 'Direct'}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <strong>{state.selectedSites.length}</strong> site(s) affecte(s)
                  </span>
                </div>
              </>
            )}

            {state.modificationType === 'sites' && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <strong>{state.selectedSites.length}</strong> site(s) affecte(s)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Alertes de coherence</h4>
            <div className="space-y-2">
              {alerts.map((alert, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg flex items-start gap-3 ${
                    alert.severity === 'error'
                      ? 'bg-destructive/10 border border-destructive/20'
                      : 'bg-warning/10 border border-warning/20'
                  }`}
                >
                  {alert.severity === 'error' ? (
                    <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
                  )}
                  <div>
                    <p className={`text-sm font-medium ${
                      alert.severity === 'error' ? 'text-destructive' : 'text-warning'
                    }`}>
                      {alert.type === 'reference_without_sites'
                        ? 'Reference(s) sans site'
                        : 'Site(s) orphelin(s)'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {alerts.length === 0 && (
          <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
            <div className="flex items-center gap-2 text-accent">
              <Check className="h-4 w-4" />
              <span className="font-medium">Aucune alerte de coherence</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Les modifications sont coherentes et peuvent etre appliquees.
            </p>
          </div>
        )}
      </div>
    );
  };

  const stepTitles = [
    'Type de modification',
    'Configuration',
    'Selection des sites',
    'Confirmation',
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Modification en masse</DialogTitle>
          <DialogDescription>
            Etape {step} sur 4 : {stepTitles[step - 1]}
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 py-2">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`h-2 flex-1 rounded-full transition-colors ${
                  s <= step ? 'bg-accent' : 'bg-secondary'
                }`}
              />
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto py-4">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={step === 1 ? () => onOpenChange(false) : handleBack}
          >
            {step === 1 ? (
              'Annuler'
            ) : (
              <>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </>
            )}
          </Button>
          {step < 4 ? (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Suivant
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleApply}
              disabled={!canProceed()}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Check className="mr-2 h-4 w-4" />
              Appliquer les modifications
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
