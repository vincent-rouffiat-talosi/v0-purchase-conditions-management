'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { Separator } from '@/components/ui/separator';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Building2,
  Truck,
  Warehouse,
  MapPin,
  Globe,
  Users,
  Plus,
  Trash2,
  AlertCircle,
  ArrowRightLeft,
  GripVertical,
  Store,
} from 'lucide-react';
import type { Supplier, Site, SiteGroup, SiteConfiguration, Channel } from '@/lib/types';
import { stores, warehouses } from '@/lib/mock-data';

interface SupplierConfigWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier;
  onSave: (supplierId: string, config: SiteConfiguration, groups: SiteGroup[], channel: Channel | null) => void;
}

interface WizardState {
  configurationType: SiteConfiguration;
  selectedChannel: Channel | null;
  groups: SiteGroup[];
  newGroupName: string;
  transferSource: string | null;
  transferTargets: Set<string>;
}

const STEPS = [
  { id: 1, title: 'Zone Type', description: 'National or Site Group' },
  { id: 2, title: 'Channel', description: 'Delivery type' },
  { id: 3, title: 'Site Groups', description: 'Group configuration' },
  { id: 4, title: 'Confirmation', description: 'Summary' },
];

export function SupplierConfigWizard({
  open,
  onOpenChange,
  supplier,
  onSave,
}: SupplierConfigWizardProps) {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>({
    configurationType: supplier.siteConfiguration,
    selectedChannel: supplier.availableChannels[0] || null,
    groups: supplier.defaultSiteGroups.length > 0 
      ? JSON.parse(JSON.stringify(supplier.defaultSiteGroups))
      : [],
    newGroupName: '',
    transferSource: null,
    transferTargets: new Set(),
  });

  // Reset state when dialog opens with new supplier
  useEffect(() => {
    if (open) {
      setStep(1);
      setState({
        configurationType: supplier.siteConfiguration,
        selectedChannel: supplier.availableChannels[0] || null,
        groups: supplier.defaultSiteGroups.length > 0 
          ? JSON.parse(JSON.stringify(supplier.defaultSiteGroups))
          : [],
        newGroupName: '',
        transferSource: null,
        transferTargets: new Set(),
      });
    }
  }, [open, supplier]);

  // Get available sites based on selected channel
  const availableSites = useMemo((): Site[] => {
    if (state.selectedChannel === 'stock') {
      return warehouses;
    }
    return stores;
  }, [state.selectedChannel]);

  // Get sites already assigned to groups
  const assignedSiteIds = useMemo(() => {
    return new Set(state.groups.flatMap(g => g.sites.map(s => s.id)));
  }, [state.groups]);

  // Get unassigned sites
  const unassignedSites = useMemo(() => {
    return availableSites.filter(s => !assignedSiteIds.has(s.id));
  }, [availableSites, assignedSiteIds]);

  // Determine total steps based on configuration type
  const totalSteps = state.configurationType === 'national' ? 2 : 4;

  // Adjust step display for national config (skip step 2 & 3)
  const getDisplaySteps = () => {
    if (state.configurationType === 'national') {
      return [STEPS[0], STEPS[3]];
    }
    return STEPS;
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return true;
      case 2:
        return state.selectedChannel !== null;
      case 3:
        // At least one group with at least one site
        return state.groups.some(g => g.sites.length > 0);
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (state.configurationType === 'national' && step === 1) {
      setStep(4); // Skip to confirmation for national
    } else if (step < 4) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (state.configurationType === 'national' && step === 4) {
      setStep(1); // Go back to step 1 for national
    } else if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSave = () => {
    if (state.configurationType === 'national') {
      onSave(supplier.id, 'national', [], null);
    } else {
      const validGroups = state.groups.filter(g => g.sites.length > 0);
      onSave(supplier.id, 'group', validGroups, state.selectedChannel);
    }
  };

  const handleAddGroup = () => {
    if (!state.newGroupName.trim()) return;
    const newGroup: SiteGroup = {
      id: `grp-${Date.now()}`,
      name: state.newGroupName.trim(),
      sites: [],
    };
    setState(prev => ({
      ...prev,
      groups: [...prev.groups, newGroup],
      newGroupName: '',
    }));
  };

  const handleRemoveGroup = (groupId: string) => {
    setState(prev => ({
      ...prev,
      groups: prev.groups.filter(g => g.id !== groupId),
    }));
  };

  const handleToggleSiteInGroup = (groupId: string, site: Site) => {
    setState(prev => ({
      ...prev,
      groups: prev.groups.map(g => {
        if (g.id !== groupId) return g;
        const hassite = g.sites.some(s => s.id === site.id);
        return {
          ...g,
          sites: hassite ? g.sites.filter(s => s.id !== site.id) : [...g.sites, site],
        };
      }),
    }));
  };

  const handleAddSitesToGroup = (groupId: string, sites: Site[]) => {
    setState(prev => ({
      ...prev,
      groups: prev.groups.map(g => {
        if (g.id !== groupId) return g;
        const existingIds = new Set(g.sites.map(s => s.id));
        const newSites = sites.filter(s => !existingIds.has(s.id));
        return { ...g, sites: [...g.sites, ...newSites] };
      }),
    }));
  };

  const handleRemoveSitesFromGroup = (groupId: string, siteIds: string[]) => {
    setState(prev => ({
      ...prev,
      groups: prev.groups.map(g => {
        if (g.id !== groupId) return g;
        return { ...g, sites: g.sites.filter(s => !siteIds.includes(s.id)) };
      }),
    }));
  };

  const handleTransferSites = (fromGroupId: string, toGroupId: string, siteIds: string[]) => {
    setState(prev => {
      const fromGroup = prev.groups.find(g => g.id === fromGroupId);
      const sitesToTransfer = fromGroup?.sites.filter(s => siteIds.includes(s.id)) || [];
      
      return {
        ...prev,
        groups: prev.groups.map(g => {
          if (g.id === fromGroupId) {
            return { ...g, sites: g.sites.filter(s => !siteIds.includes(s.id)) };
          }
          if (g.id === toGroupId) {
            const existingIds = new Set(g.sites.map(s => s.id));
            const newSites = sitesToTransfer.filter(s => !existingIds.has(s.id));
            return { ...g, sites: [...g.sites, ...newSites] };
          }
          return g;
        }),
      };
    });
  };

  const displaySteps = getDisplaySteps();
  const currentStepIndex = displaySteps.findIndex(s => s.id === step);

  // Step 1: Configuration type selection
  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="p-4 rounded-lg bg-secondary/30 space-y-2">
        <p className="text-sm text-muted-foreground">
          Select the configuration type to define how sites will be managed for this supplier.
        </p>
      </div>

      <RadioGroup
        value={state.configurationType}
        onValueChange={value => setState(prev => ({ ...prev, configurationType: value as SiteConfiguration }))}
        className="grid grid-cols-1 gap-4"
      >
        <label
          htmlFor="config-national"
          className="flex items-start gap-4 p-4 rounded-lg border-2 border-border cursor-pointer hover:bg-secondary/50 transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent/5"
        >
          <RadioGroupItem value="national" id="config-national" className="mt-1" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-accent/10">
                <Globe className="h-5 w-5 text-accent" />
              </div>
              <span className="font-semibold">National</span>
            </div>
            <p className="text-sm text-muted-foreground">
              All sites in the business unit are automatically included. 
              A single purchase price applies to all sites.
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Store className="h-3 w-3" />
              <span>{stores.length} stores + {warehouses.length} warehouses</span>
            </div>
          </div>
        </label>

        <label
          htmlFor="config-group"
          className="flex items-start gap-4 p-4 rounded-lg border-2 border-border cursor-pointer hover:bg-secondary/50 transition-colors has-[:checked]:border-chart-2 has-[:checked]:bg-chart-2/5"
        >
          <RadioGroupItem value="group" id="config-group" className="mt-1" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-chart-2/10">
                <Users className="h-5 w-5 text-chart-2" />
              </div>
              <span className="font-semibold">Site Group</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Sites are organized in custom groups. 
              Each group can have a different purchase price.
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>Flexible configuration per group</span>
            </div>
          </div>
        </label>
      </RadioGroup>
    </div>
  );

  // Step 2: Channel selection
  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="p-4 rounded-lg bg-secondary/30 space-y-2">
        <p className="text-sm text-muted-foreground">
          Select the delivery channel to define the type of sites to configure.
        </p>
        <p className="text-xs text-muted-foreground">
          <strong>Business rule:</strong> A site group must contain only sites of the same type (stores OR warehouses).
        </p>
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-medium">Delivery Channel</Label>
        <RadioGroup
          value={state.selectedChannel || ''}
          onValueChange={value => setState(prev => ({ 
            ...prev, 
            selectedChannel: value as Channel,
            // Reset groups when channel changes (sites are different)
            groups: [],
          }))}
          className="grid grid-cols-1 gap-3"
        >
          {supplier.availableChannels.includes('direct') && (
            <label
              htmlFor="channel-direct"
              className="flex items-start gap-4 p-4 rounded-lg border-2 border-border cursor-pointer hover:bg-secondary/50 transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent/5"
            >
              <RadioGroupItem value="direct" id="channel-direct" className="mt-1" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <Truck className="h-5 w-5 text-accent" />
                  </div>
                  <span className="font-semibold">Direct (stores)</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Direct delivery from supplier to stores. Groups will be configured with stores.
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Store className="h-3 w-3" />
                  <span>{stores.length} stores available</span>
                </div>
              </div>
            </label>
          )}

          {supplier.availableChannels.includes('stock') && (
            <label
              htmlFor="channel-stock"
              className="flex items-start gap-4 p-4 rounded-lg border-2 border-border cursor-pointer hover:bg-secondary/50 transition-colors has-[:checked]:border-chart-2 has-[:checked]:bg-chart-2/5"
            >
              <RadioGroupItem value="stock" id="channel-stock" className="mt-1" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-chart-2/10">
                    <Warehouse className="h-5 w-5 text-chart-2" />
                  </div>
                  <span className="font-semibold">Stock (warehouses)</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Delivery to central warehouses. Groups will be configured with warehouses.
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Warehouse className="h-3 w-3" />
                  <span>{warehouses.length} warehouses available</span>
                </div>
              </div>
            </label>
          )}
        </RadioGroup>
      </div>
    </div>
  );

  // Step 3: Groups configuration
  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="p-4 rounded-lg bg-secondary/30 space-y-2">
        <p className="text-sm text-muted-foreground">
          Create and configure your site groups. Each group can contain multiple sites.
        </p>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1 text-accent">
            <Check className="h-3 w-3" />
            {assignedSiteIds.size} site(s) assigned
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <AlertCircle className="h-3 w-3" />
            {unassignedSites.length} unassigned site(s)
          </span>
        </div>
      </div>

      {/* Add new group */}
      <div className="flex gap-2">
        <Input
          placeholder="New group name..."
          value={state.newGroupName}
          onChange={e => setState(prev => ({ ...prev, newGroupName: e.target.value }))}
          onKeyDown={e => e.key === 'Enter' && handleAddGroup()}
        />
        <Button onClick={handleAddGroup} disabled={!state.newGroupName.trim()} className="gap-2">
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      {/* Groups list */}
      <div className="space-y-4">
        {state.groups.length === 0 ? (
          <div className="p-8 rounded-lg border-2 border-dashed border-border text-center">
            <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No groups created. Add your first group above.
            </p>
          </div>
        ) : (
          state.groups.map(group => (
            <GroupCard
              key={group.id}
              group={group}
              availableSites={availableSites}
              assignedSiteIds={assignedSiteIds}
              otherGroups={state.groups.filter(g => g.id !== group.id)}
              onRemoveGroup={() => handleRemoveGroup(group.id)}
              onToggleSite={site => handleToggleSiteInGroup(group.id, site)}
              onAddSites={sites => handleAddSitesToGroup(group.id, sites)}
              onRemoveSites={siteIds => handleRemoveSitesFromGroup(group.id, siteIds)}
              onTransferSites={(targetGroupId, siteIds) => handleTransferSites(group.id, targetGroupId, siteIds)}
            />
          ))
        )}
      </div>

      {/* Unassigned sites warning */}
      {unassignedSites.length > 0 && state.groups.length > 0 && (
        <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-warning mt-0.5" />
            <div>
              <p className="text-sm font-medium text-warning">Unassigned sites</p>
              <p className="text-xs text-muted-foreground mt-1">
                {unassignedSites.length} site(s) are not in a group. 
                These sites will not be included in the configuration.
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {unassignedSites.slice(0, 5).map(site => (
                  <Badge key={site.id} variant="outline" className="text-xs">
                    {site.name}
                  </Badge>
                ))}
                {unassignedSites.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{unassignedSites.length - 5} more
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Step 4: Confirmation
  const renderStep4 = () => {
    const totalSites = state.configurationType === 'national' 
      ? availableSites.length 
      : state.groups.reduce((sum, g) => sum + g.sites.length, 0);

    return (
      <div className="space-y-6">
        <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-accent/10">
              <Check className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="font-medium">Configuration ready to be applied</p>
              <p className="text-sm text-muted-foreground">
                Review settings before confirming
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Supplier info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">{supplier.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{supplier.code}</p>
            </div>
          </div>

          <Separator />

          {/* Configuration summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-border space-y-2">
              <p className="text-xs text-muted-foreground">Zone Type</p>
              <div className="flex items-center gap-2">
                {state.configurationType === 'national' ? (
                  <>
                    <Globe className="h-5 w-5 text-accent" />
                    <span className="font-medium">National</span>
                  </>
                ) : (
                  <>
                    <Users className="h-5 w-5 text-chart-2" />
                    <span className="font-medium">Site Group</span>
                  </>
                )}
              </div>
            </div>

            {state.configurationType === 'group' && (
              <div className="p-4 rounded-lg border border-border space-y-2">
                <p className="text-xs text-muted-foreground">Channel</p>
                <div className="flex items-center gap-2">
                  {state.selectedChannel === 'direct' ? (
                    <>
                      <Truck className="h-5 w-5 text-accent" />
                      <span className="font-medium">Direct</span>
                    </>
                  ) : (
                    <>
                      <Warehouse className="h-5 w-5 text-chart-2" />
                      <span className="font-medium">Stock</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sites details */}
          <div className="p-4 rounded-lg border border-border space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Configured Sites</p>
              <Badge variant="secondary">{totalSites} site(s)</Badge>
            </div>

            {state.configurationType === 'national' ? (
              <p className="text-sm text-muted-foreground">
                All sites will be automatically included.
              </p>
            ) : (
              <div className="space-y-2">
                {state.groups.filter(g => g.sites.length > 0).map(group => (
                  <div key={group.id} className="flex items-center justify-between p-2 rounded bg-secondary/30">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-chart-2" />
                      <span className="text-sm font-medium">{group.name}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {group.sites.length} site(s)
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Warning for unassigned sites */}
          {state.configurationType === 'group' && unassignedSites.length > 0 && (
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
              <div className="flex items-center gap-2 text-warning text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{unassignedSites.length} site(s) will not be assigned to a group</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[85vh] flex flex-col overflow-hidden p-0">
        {/* Header - fixed */}
        <div className="px-6 pt-6 pb-4 shrink-0 border-b border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {supplier.name} Configuration
            </DialogTitle>
            <DialogDescription>
              Define the zone type and configure site groups for this supplier.
            </DialogDescription>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex items-center gap-2 pt-4">
            {displaySteps.map((s, index) => (
              <div key={s.id} className="flex items-center gap-2 flex-1">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                    s.id === step
                      ? 'bg-accent text-accent-foreground'
                      : s.id < step || (state.configurationType === 'national' && s.id === 4 && step === 4)
                        ? 'bg-accent/20 text-accent'
                        : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {(s.id < step || (state.configurationType === 'national' && s.id === 4 && step === 4 && index < currentStepIndex)) ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="hidden sm:block flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${s.id === step ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {s.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{s.description}</p>
                </div>
                {index < displaySteps.length - 1 && (
                  <div className="hidden sm:block w-8 h-px bg-border" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step content - scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </div>

        {/* Navigation - fixed */}
        <div className="shrink-0 px-6 py-4 border-t border-border bg-background">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={step === 1}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-transparent">
                Cancel
              </Button>
              {step === 4 ? (
                <Button onClick={handleSave} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                  <Check className="h-4 w-4" />
                  Confirm
                </Button>
              ) : (
                <Button onClick={handleNext} disabled={!canProceed()} className="gap-2">
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Group card component with full management capabilities
function GroupCard({
  group,
  availableSites,
  assignedSiteIds,
  otherGroups,
  onRemoveGroup,
  onToggleSite,
  onAddSites,
  onRemoveSites,
  onTransferSites,
}: {
  group: SiteGroup;
  availableSites: Site[];
  assignedSiteIds: Set<string>;
  otherGroups: SiteGroup[];
  onRemoveGroup: () => void;
  onToggleSite: (site: Site) => void;
  onAddSites: (sites: Site[]) => void;
  onRemoveSites: (siteIds: string[]) => void;
  onTransferSites: (targetGroupId: string, siteIds: string[]) => void;
}) {
  const [showAddSites, setShowAddSites] = useState(false);
  const [selectedForTransfer, setSelectedForTransfer] = useState<Set<string>>(new Set());
  const [transferTargetGroup, setTransferTargetGroup] = useState<string | null>(null);

  const unassignedSites = availableSites.filter(s => !assignedSiteIds.has(s.id));

  const handleToggleForTransfer = (siteId: string) => {
    setSelectedForTransfer(prev => {
      const next = new Set(prev);
      if (next.has(siteId)) {
        next.delete(siteId);
      } else {
        next.add(siteId);
      }
      return next;
    });
  };

  const handleTransfer = () => {
    if (transferTargetGroup && selectedForTransfer.size > 0) {
      onTransferSites(transferTargetGroup, [...selectedForTransfer]);
      setSelectedForTransfer(new Set());
      setTransferTargetGroup(null);
    }
  };

  return (
    <div className="p-4 rounded-lg border border-border bg-card space-y-4">
      {/* Group header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <Users className="h-4 w-4 text-chart-2" />
          <span className="font-medium">{group.name}</span>
          <Badge variant="secondary" className="text-xs">
            {group.sites.length} site(s)
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onRemoveGroup}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Sites in group */}
      {group.sites.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {group.sites.map(site => (
              <Badge
                key={site.id}
                variant={selectedForTransfer.has(site.id) ? 'default' : 'secondary'}
                className={`gap-1 cursor-pointer transition-colors ${
                  selectedForTransfer.has(site.id) 
                    ? 'bg-chart-2 text-chart-2-foreground' 
                    : 'hover:bg-destructive/10 hover:text-destructive'
                }`}
                onClick={() => handleToggleForTransfer(site.id)}
              >
                <MapPin className="h-3 w-3" />
                {site.name}
              </Badge>
            ))}
          </div>

          {/* Transfer controls */}
          {selectedForTransfer.size > 0 && otherGroups.length > 0 && (
            <div className="flex items-center gap-2 p-2 rounded bg-secondary/30">
              <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs">{selectedForTransfer.size} site(s) selected</span>
              <select
                className="text-xs bg-secondary border border-border rounded px-2 py-1"
                value={transferTargetGroup || ''}
                onChange={e => setTransferTargetGroup(e.target.value || null)}
              >
                <option value="">Transfer to...</option>
                {otherGroups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-xs bg-transparent"
                disabled={!transferTargetGroup}
                onClick={handleTransfer}
              >
                Transfer
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs"
                onClick={() => {
                  setSelectedForTransfer(new Set());
                  setTransferTargetGroup(null);
                }}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Add sites */}
      {!showAddSites ? (
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 bg-transparent"
          onClick={() => setShowAddSites(true)}
          disabled={unassignedSites.length === 0}
        >
          <Plus className="h-4 w-4" />
          Add sites ({unassignedSites.length} available)
        </Button>
      ) : (
        <div className="space-y-2 p-3 rounded bg-secondary/20 border border-border">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium">Select sites to add</p>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs"
              onClick={() => setShowAddSites(false)}
            >
              Close
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-auto">
            {unassignedSites.map(site => (
              <label
                key={site.id}
                className="flex items-center gap-2 p-2 rounded border border-border cursor-pointer hover:bg-secondary/50 transition-colors"
              >
                <Checkbox
                  checked={false}
                  onCheckedChange={() => {
                    onAddSites([site]);
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{site.name}</p>
                  <p className="text-xs text-muted-foreground">{site.region}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {group.sites.length === 0 && !showAddSites && (
        <p className="text-xs text-muted-foreground text-center py-2">
          No sites in this group
        </p>
      )}
    </div>
  );
}
