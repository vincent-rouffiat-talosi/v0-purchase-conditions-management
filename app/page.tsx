'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Edit3,
  History,
  Package,
  AlertCircle,
  Check,
  Building2,
  Truck,
  Warehouse,
  LayoutGrid,
} from 'lucide-react';
import { ReferencesTable } from '@/components/references-table';
import { ModificationWizard } from '@/components/modification-wizard';
import { SummaryPanel } from '@/components/summary-panel';
import { productReferences, suppliers } from '@/lib/mock-data';
import type { ProductReference, ModificationAction, CoherenceAlert } from '@/lib/types';

export default function PurchaseConditionsPage() {
  const [references, setReferences] = useState<ProductReference[]>(productReferences);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [actions, setActions] = useState<ModificationAction[]>([]);
  const [alerts, setAlerts] = useState<CoherenceAlert[]>([]);

  const selectedReferences = useMemo(
    () => references.filter(r => selectedIds.includes(r.id)),
    [references, selectedIds]
  );

  const stats = useMemo(() => {
    const supplierCounts = new Map<string, number>();
    const channelCounts = { direct: 0, stock: 0 };

    references.forEach(ref => {
      ref.purchaseConditions.forEach(pc => {
        supplierCounts.set(pc.supplierId, (supplierCounts.get(pc.supplierId) || 0) + 1);
        channelCounts[pc.channel]++;
      });
    });

    return {
      totalRefs: references.length,
      supplierCounts,
      channelCounts,
    };
  }, [references]);

  const handleApplyChanges = (newActions: ModificationAction[], newAlerts: CoherenceAlert[]) => {
    setActions(prev => [...prev, ...newActions]);
    setAlerts(prev => [...prev, ...newAlerts]);

    // Apply changes to references (simplified for prototype)
    setReferences(prev => {
      const updated = [...prev];
      newActions.forEach(action => {
        action.referenceIds.forEach(refId => {
          const index = updated.findIndex(r => r.id === refId);
          if (index !== -1) {
            const ref = { ...updated[index] };
            
            if (action.type === 'change_supplier' && action.details.newSupplierId) {
              ref.purchaseConditions = ref.purchaseConditions.map(pc => ({
                ...pc,
                supplierId: action.details.newSupplierId!,
              }));
              if (action.details.newBarcode) {
                ref.barcode = action.details.newBarcode + ref.id.slice(-6);
              }
              if (action.details.newSupplierReference) {
                ref.supplierReference = action.details.newSupplierReference + ref.id.slice(-6);
              }
            }

            if (action.type === 'change_channel' && action.details.newChannel) {
              ref.purchaseConditions = ref.purchaseConditions.map(pc => ({
                ...pc,
                channel: action.details.newChannel!,
                sites: action.details.newSites || [],
              }));
            }

            if (action.type === 'change_sites' && action.details.newSites) {
              ref.purchaseConditions = ref.purchaseConditions.map(pc => ({
                ...pc,
                sites: action.details.newSites!,
              }));
            }

            updated[index] = ref;
          }
        });
      });
      return updated;
    });

    setSelectedIds([]);
    setSummaryOpen(true);
  };

  const handleUndo = () => {
    if (actions.length > 0) {
      setActions(prev => prev.slice(0, -1));
      setAlerts(prev => {
        // Remove alerts associated with the last action
        const lastAction = actions[actions.length - 1];
        return prev.filter(
          a => !a.referenceIds?.some(id => lastAction.referenceIds.includes(id))
        );
      });
      // In a real app, you'd restore the previous state from a history stack
    }
  };

  const handleClear = () => {
    setActions([]);
    setAlerts([]);
    setReferences(productReferences);
  };

  const errorCount = alerts.filter(a => a.severity === 'error').length;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-accent/10">
                  <LayoutGrid className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold">Purchase Conditions</h1>
                  <p className="text-sm text-muted-foreground">
                    Supply management
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Stats */}
              <div className="hidden md:flex items-center gap-4 mr-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Package className="h-4 w-4" />
                  <span>{stats.totalRefs} references</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>{suppliers.length} suppliers</span>
                </div>
              </div>

              {/* Bulk modifications button */}
              <Link href="/bulk">
                <Button variant="outline" className="gap-2 bg-transparent">
                  <Package className="h-4 w-4" />
                  <span className="hidden sm:inline">Bulk Modifications</span>
                </Button>
              </Link>

              {/* Suppliers config button */}
              <Link href="/suppliers">
                <Button variant="outline" className="gap-2 bg-transparent">
                  <Building2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Suppliers</span>
                </Button>
              </Link>

              {/* History button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSummaryOpen(true)}
                    className="relative"
                  >
                    <History className="h-4 w-4" />
                    {actions.length > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-accent text-accent-foreground text-xs flex items-center justify-center">
                        {actions.length}
                      </span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Modification history</TooltipContent>
              </Tooltip>

              {/* Modify button */}
              <Button
                onClick={() => setWizardOpen(true)}
                disabled={selectedIds.length === 0}
                className="gap-2"
              >
                <Edit3 className="h-4 w-4" />
                Modify
                {selectedIds.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {selectedIds.length}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Status bar */}
          {(actions.length > 0 || alerts.length > 0) && (
            <div className="px-6 py-2 bg-secondary/30 border-t border-border flex items-center gap-4 text-sm">
              {errorCount > 0 ? (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errorCount} coherence error(s)
                </Badge>
              ) : actions.length > 0 ? (
                <Badge className="gap-1 bg-success text-success-foreground">
                  <Check className="h-3 w-3" />
                  {actions.length} modification(s) applied
                </Badge>
              ) : null}
              
              <span className="text-muted-foreground">
                {actions.reduce((sum, a) => sum + a.referenceIds.length, 0)} reference(s) modified
              </span>
            </div>
          )}
        </header>

        {/* Stats cards */}
        <div className="px-6 py-4 border-b border-border bg-secondary/20">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-card border border-border">
              <div className="p-2 rounded bg-accent/10">
                <Truck className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Direct Channel</p>
                <p className="text-lg font-semibold">{stats.channelCounts.direct}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-card border border-border">
              <div className="p-2 rounded bg-accent/10">
                <Warehouse className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Stock Channel</p>
                <p className="text-lg font-semibold">{stats.channelCounts.stock}</p>
              </div>
            </div>
            {Array.from(stats.supplierCounts.entries())
              .slice(0, 4)
              .map(([supplierId, count]) => {
                const supplier = suppliers.find(s => s.id === supplierId);
                return (
                  <div
                    key={supplierId}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg bg-card border border-border"
                  >
                    <div className="p-2 rounded bg-secondary">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{supplier?.code}</p>
                      <p className="text-lg font-semibold">{count}</p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Main content */}
        <main className="p-6">
          <ReferencesTable
            references={references}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        </main>

        {/* Modification wizard */}
        <ModificationWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          selectedReferences={selectedReferences}
          onApplyChanges={handleApplyChanges}
        />

        {/* Summary panel */}
        <SummaryPanel
          open={summaryOpen}
          onOpenChange={setSummaryOpen}
          actions={actions}
          alerts={alerts}
          onUndo={handleUndo}
          onClear={handleClear}
        />
      </div>
    </TooltipProvider>
  );
}
