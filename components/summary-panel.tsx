'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  X,
  Building2,
  Truck,
  Warehouse,
  MapPin,
  Package,
  Undo2,
  History,
} from 'lucide-react';
import type { ModificationAction, CoherenceAlert } from '@/lib/types';
import { suppliers, allSites } from '@/lib/mock-data';

interface SummaryPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions: ModificationAction[];
  alerts: CoherenceAlert[];
  onUndo: () => void;
  onClear: () => void;
}

export function SummaryPanel({
  open,
  onOpenChange,
  actions,
  alerts,
  onUndo,
  onClear,
}: SummaryPanelProps) {
  const getSupplierName = (id: string): string => {
    return suppliers.find(s => s.id === id)?.name || 'Inconnu';
  };

  const getSiteName = (id: string): string => {
    return allSites.find(s => s.id === id)?.name || 'Inconnu';
  };

  const errorCount = alerts.filter(a => a.severity === 'error').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;

  const totalAffectedRefs = actions.reduce((sum, a) => sum + a.referenceIds.length, 0);

  const ActionIcon = ({ type }: { type: ModificationAction['type'] }) => {
    switch (type) {
      case 'change_supplier':
        return <Building2 className="h-4 w-4" />;
      case 'change_channel':
        return <Truck className="h-4 w-4" />;
      case 'change_sites':
        return <MapPin className="h-4 w-4" />;
    }
  };

  const actionLabel = (type: ModificationAction['type']): string => {
    switch (type) {
      case 'change_supplier':
        return 'Supplier change';
      case 'change_channel':
        return 'Channel change';
      case 'change_sites':
        return 'Site modification';
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Modification Summary
          </SheetTitle>
          <SheetDescription>
            {actions.length === 0
              ? 'No modifications in progress'
              : `${actions.length} action(s) - ${totalAffectedRefs} reference(s) affected`}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 py-4">
            {/* Status overview */}
            {actions.length > 0 && (
              <div className="flex items-center gap-3">
                {errorCount > 0 ? (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errorCount} error(s)
                  </Badge>
                ) : (
                  <Badge className="gap-1 bg-success text-success-foreground">
                    <Check className="h-3 w-3" />
                    Coherent
                  </Badge>
                )}
                {warningCount > 0 && (
                  <Badge variant="outline" className="gap-1 border-warning text-warning">
                    <AlertTriangle className="h-3 w-3" />
                    {warningCount} warning(s)
                  </Badge>
                )}
              </div>
            )}

            {/* Actions list */}
            {actions.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Applied actions</h4>
                {actions.map((action, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg bg-card border border-border space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded bg-accent/10 text-accent">
                          <ActionIcon type={action.type} />
                        </div>
                        <span className="font-medium text-sm">{actionLabel(action.type)}</span>
                      </div>
                      <Badge variant="secondary" className="gap-1">
                        <Package className="h-3 w-3" />
                        {action.referenceIds.length} ref(s)
                      </Badge>
                    </div>

                    {/* Supplier change details */}
                    {action.type === 'change_supplier' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 p-3 rounded bg-secondary/30">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Previous supplier</p>
                            <p className="text-sm font-medium">
                              {action.details.oldSupplierId ? getSupplierName(action.details.oldSupplierId) : '-'}
                            </p>
                            <Badge variant="outline" className="text-xs mt-1">
                              {action.details.oldSupplierConfig === 'national' ? 'National' : 'Group'}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">New supplier</p>
                            <p className="text-sm font-medium text-accent">
                              {action.details.newSupplierId ? getSupplierName(action.details.newSupplierId) : '-'}
                            </p>
                            <Badge className="text-xs mt-1 bg-accent text-accent-foreground">
                              {action.details.newSupplierConfig === 'national' ? 'National' : 'Group'}
                            </Badge>
                          </div>
                        </div>
                        
                        {action.details.newChannel && (
                          <div className="flex items-center gap-2 text-sm">
                            {action.details.newChannel === 'stock' ? (
                              <Warehouse className="h-4 w-4 text-accent" />
                            ) : (
                              <Truck className="h-4 w-4 text-accent" />
                            )}
                            <span>Channel: <strong>{action.details.newChannel === 'stock' ? 'Stock' : 'Direct'}</strong></span>
                          </div>
                        )}

                        {action.details.barcodeUpdates && Object.keys(action.details.barcodeUpdates).length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">
                              Barcodes and references modified ({Object.keys(action.details.barcodeUpdates).length})
                            </p>
                            <div className="max-h-[120px] overflow-auto space-y-1">
                              {action.referenceDetails?.slice(0, 5).map(ref => (
                                <div key={ref.id} className="text-xs p-2 rounded bg-secondary/20 grid grid-cols-3 gap-2">
                                  <span className="font-mono truncate">{ref.sku}</span>
                                  <span className="font-mono text-muted-foreground">
                                    {action.details.barcodeUpdates?.[ref.id]?.old} → <span className="text-accent">{action.details.barcodeUpdates?.[ref.id]?.new}</span>
                                  </span>
                                  <span className="font-mono text-muted-foreground">
                                    {action.details.supplierRefUpdates?.[ref.id]?.old} → <span className="text-accent">{action.details.supplierRefUpdates?.[ref.id]?.new}</span>
                                  </span>
                                </div>
                              ))}
                              {(action.referenceDetails?.length || 0) > 5 && (
                                <p className="text-xs text-muted-foreground text-center">
                                  +{(action.referenceDetails?.length || 0) - 5} other reference(s)
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Channel change details */}
                    {action.type === 'change_channel' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 p-3 rounded bg-secondary/30">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Previous channel</p>
                            <div className="flex items-center gap-2">
                              {action.details.oldChannel === 'stock' ? (
                                <Warehouse className="h-4 w-4" />
                              ) : (
                                <Truck className="h-4 w-4" />
                              )}
                              <span className="text-sm font-medium">
                                {action.details.oldChannel === 'stock' ? 'Stock' : 'Direct'}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {action.details.oldSites?.length || 0} site(s)
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">New channel</p>
                            <div className="flex items-center gap-2 text-accent">
                              {action.details.newChannel === 'stock' ? (
                                <Warehouse className="h-4 w-4" />
                              ) : (
                                <Truck className="h-4 w-4" />
                              )}
                              <span className="text-sm font-medium">
                                {action.details.newChannel === 'stock' ? 'Stock' : 'Direct'}
                              </span>
                            </div>
                            <p className="text-xs text-accent mt-1">
                              {action.details.newSites?.length || 0} site(s)
                            </p>
                          </div>
                        </div>

                        {action.referenceDetails && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Affected references</p>
                            <div className="flex flex-wrap gap-1">
                              {action.referenceDetails.slice(0, 6).map(ref => (
                                <Badge key={ref.id} variant="secondary" className="text-xs font-mono">
                                  {ref.sku}
                                </Badge>
                              ))}
                              {action.referenceDetails.length > 6 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{action.referenceDetails.length - 6}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Sites change details */}
                    {action.type === 'change_sites' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 p-3 rounded bg-secondary/30">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Sites precedents</p>
                            <p className="text-sm font-medium">{action.details.oldSites?.length || 0} site(s)</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Nouveaux sites</p>
                            <p className="text-sm font-medium text-accent">{action.details.newSites?.length || 0} site(s)</p>
                          </div>
                        </div>

                        {action.details.newSites && action.details.newSites.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {action.details.newSites.slice(0, 5).map(site => (
                              <Badge key={site.id} variant="outline" className="text-xs">
                                <MapPin className="h-3 w-3 mr-1" />
                                {site.name}
                              </Badge>
                            ))}
                            {action.details.newSites.length > 5 && (
                              <Badge variant="secondary" className="text-xs">
                                +{action.details.newSites.length - 5}
                              </Badge>
                            )}
                          </div>
                        )}

                        {action.referenceDetails && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Affected references</p>
                            <div className="flex flex-wrap gap-1">
                              {action.referenceDetails.slice(0, 6).map(ref => (
                                <Badge key={ref.id} variant="secondary" className="text-xs font-mono">
                                  {ref.sku}
                                </Badge>
                              ))}
                              {action.referenceDetails.length > 6 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{action.referenceDetails.length - 6}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Alerts */}
            {alerts.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Alertes de coherence</h4>
                {alerts.map((alert, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg space-y-2 ${
                      alert.severity === 'error'
                        ? 'bg-destructive/10 border border-destructive/20'
                        : 'bg-warning/10 border border-warning/20'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {alert.severity === 'error' ? (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-warning" />
                      )}
                      <span
                        className={`font-medium text-sm ${
                          alert.severity === 'error' ? 'text-destructive' : 'text-warning'
                        }`}
                      >
                        {alert.type === 'reference_without_sites'
                          ? 'Reference(s) sans site'
                          : 'Site(s) orphelin(s)'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.message}</p>

                    {alert.referenceIds && alert.referenceIds.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {alert.referenceIds.slice(0, 5).map(id => (
                          <Badge key={id} variant="secondary" className="text-xs">
                            {id}
                          </Badge>
                        ))}
                        {alert.referenceIds.length > 5 && (
                          <Badge variant="secondary" className="text-xs">
                            +{alert.referenceIds.length - 5}
                          </Badge>
                        )}
                      </div>
                    )}

                    {alert.siteIds && alert.siteIds.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {alert.siteIds.slice(0, 3).map(id => (
                          <Badge key={id} variant="secondary" className="text-xs">
                            {getSiteName(id)}
                          </Badge>
                        ))}
                        {alert.siteIds.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{alert.siteIds.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {actions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 rounded-full bg-secondary mb-4">
                  <History className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium">Aucune modification</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-[280px]">
                  Selectionnez des references et utilisez le bouton &quot;Modifier&quot; pour commencer.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        {actions.length > 0 && (
          <div className="flex gap-2 pt-4 border-t border-border">
            <Button variant="outline" onClick={onUndo} className="flex-1 bg-transparent">
              <Undo2 className="mr-2 h-4 w-4" />
              Annuler derniere
            </Button>
            <Button variant="destructive" onClick={onClear} className="flex-1">
              <X className="mr-2 h-4 w-4" />
              Tout effacer
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
