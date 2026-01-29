'use client';

import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { RadioGroupItem } from "@/components/ui/radio-group"
import { RadioGroup } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { DialogDescription } from "@/components/ui/dialog"
import { DialogTitle } from "@/components/ui/dialog"
import { DialogHeader } from "@/components/ui/dialog"
import { DialogContent } from "@/components/ui/dialog"
import { Dialog } from "@/components/ui/dialog"
import { useMemo } from "react"
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Building2,
  Truck,
  Warehouse,
  Globe,
  Users,
  Settings,
  ArrowLeft,
  MapPin,
  Store,
  AlertCircle,
  Plus,
  Trash2,
  Check,
} from 'lucide-react';
import { suppliers as initialSuppliers, stores, warehouses } from '@/lib/mock-data';
import type { Supplier, SiteGroup, SiteConfiguration, Channel } from '@/lib/types';
import { SupplierConfigWizard } from '@/components/supplier-config-wizard';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const openConfigDialog = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setConfigDialogOpen(true);
  };

  const handleSaveConfig = (
    supplierId: string,
    newConfig: SiteConfiguration,
    newGroups: SiteGroup[],
    _channel: Channel | null
  ) => {
    setSuppliers(prev =>
      prev.map(s =>
        s.id === supplierId
          ? { ...s, siteConfiguration: newConfig, defaultSiteGroups: newGroups }
          : s
      )
    );
    setConfigDialogOpen(false);
    setSelectedSupplier(null);
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Building2 className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold">Configuration Fournisseurs</h1>
                  <p className="text-sm text-muted-foreground">
                    Gestion des zones et groupes de sites
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Store className="h-4 w-4" />
              <span>{stores.length} magasins disponibles</span>
            </div>
          </div>
        </header>

        {/* Info banner */}
        <div className="px-6 py-4 border-b border-border bg-secondary/20">
          <div className="flex items-start gap-3 max-w-3xl">
            <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                <strong className="text-foreground">Configuration Nationale :</strong> Tous les magasins de
                l&apos;unite commerciale sont inclus. Un prix d&apos;achat unique s&apos;applique.
              </p>
              <p>
                <strong className="text-foreground">Configuration Groupe de sites :</strong> Les magasins sont
                regroupes. Un prix d&apos;achat different peut s&apos;appliquer a chaque groupe.
              </p>
            </div>
          </div>
        </div>

        {/* Suppliers list */}
        <main className="p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {suppliers.map(supplier => (
              <SupplierCard
                key={supplier.id}
                supplier={supplier}
                onConfigure={() => openConfigDialog(supplier)}
              />
            ))}
          </div>
        </main>

        {/* Configuration wizard */}
        {selectedSupplier && (
          <SupplierConfigWizard
            open={configDialogOpen}
            onOpenChange={setConfigDialogOpen}
            supplier={selectedSupplier}
            onSave={handleSaveConfig}
          />
        )}
      </div>
    </TooltipProvider>
  );
}

// Supplier card component
function SupplierCard({
  supplier,
  onConfigure,
}: {
  supplier: Supplier;
  onConfigure: () => void;
}) {
  const isNational = supplier.siteConfiguration === 'national';
  const totalSitesInGroups = supplier.defaultSiteGroups.reduce(
    (sum, g) => sum + g.sites.length,
    0
  );

  return (
    <Card className="relative overflow-hidden">
      <div
        className={`absolute top-0 left-0 w-1 h-full ${isNational ? 'bg-accent' : 'bg-chart-2'}`}
      />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary">
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">{supplier.name}</CardTitle>
              <CardDescription className="font-mono text-xs">{supplier.code}</CardDescription>
            </div>
          </div>
          <Badge
            variant={isNational ? 'default' : 'outline'}
            className={isNational ? 'bg-accent text-accent-foreground' : ''}
          >
            {isNational ? (
              <>
                <Globe className="h-3 w-3 mr-1" />
                National
              </>
            ) : (
              <>
                <Users className="h-3 w-3 mr-1" />
                Groupe
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Channels */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Circuits :</span>
          <div className="flex items-center gap-1">
            {supplier.availableChannels.includes('direct') && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-1.5 rounded bg-secondary">
                    <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>Direct (magasins)</TooltipContent>
              </Tooltip>
            )}
            {supplier.availableChannels.includes('stock') && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-1.5 rounded bg-secondary">
                    <Warehouse className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>Stock (entrepots)</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Configuration details */}
        <div className="p-3 rounded-lg bg-secondary/30 space-y-2">
          {isNational ? (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-accent" />
              <span>
                Tous les sites ({supplier.availableChannels.includes('direct') ? stores.length : 0} magasins
                {supplier.availableChannels.includes('stock') && ` + ${warehouses.length} entrepots`})
              </span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-chart-2" />
                <span>{supplier.defaultSiteGroups.length} groupe(s) de sites</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{totalSitesInGroups} magasin(s) affectes</span>
              </div>
              {supplier.defaultSiteGroups.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {supplier.defaultSiteGroups.map(group => (
                    <Badge key={group.id} variant="secondary" className="text-xs">
                      {group.name} ({group.sites.length})
                    </Badge>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <Button variant="outline" className="w-full gap-2 bg-transparent" onClick={onConfigure}>
          <Settings className="h-4 w-4" />
          Configurer
        </Button>
      </CardContent>
    </Card>
  );
}
