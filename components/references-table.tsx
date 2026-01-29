'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter, ChevronDown, ChevronUp, Package, Truck, Warehouse } from 'lucide-react';
import type { ProductReference, Supplier, Channel } from '@/lib/types';
import { suppliers } from '@/lib/mock-data';

interface ReferencesTableProps {
  references: ProductReference[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

type SortField = 'sku' | 'name' | 'supplier' | 'channel';
type SortDirection = 'asc' | 'desc';

export function ReferencesTable({
  references,
  selectedIds,
  onSelectionChange,
}: ReferencesTableProps) {
  const [search, setSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('sku');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const getSupplier = (supplierId: string): Supplier | undefined => {
    return suppliers.find(s => s.id === supplierId);
  };

  const filteredAndSortedReferences = useMemo(() => {
    let result = [...references];

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        ref =>
          ref.sku.toLowerCase().includes(searchLower) ||
          ref.name.toLowerCase().includes(searchLower)
      );
    }

    // Supplier filter
    if (supplierFilter !== 'all') {
      result = result.filter(ref =>
        ref.purchaseConditions.some(pc => pc.supplierId === supplierFilter)
      );
    }

    // Channel filter
    if (channelFilter !== 'all') {
      result = result.filter(ref =>
        ref.purchaseConditions.some(pc => pc.channel === channelFilter)
      );
    }

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'sku':
          comparison = a.sku.localeCompare(b.sku);
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'supplier':
          const supA = getSupplier(a.purchaseConditions[0]?.supplierId)?.name || '';
          const supB = getSupplier(b.purchaseConditions[0]?.supplierId)?.name || '';
          comparison = supA.localeCompare(supB);
          break;
        case 'channel':
          comparison = (a.purchaseConditions[0]?.channel || '').localeCompare(
            b.purchaseConditions[0]?.channel || ''
          );
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [references, search, supplierFilter, channelFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredAndSortedReferences.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(filteredAndSortedReferences.map(r => r.id));
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(i => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="ml-1 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 h-4 w-4" />
    );
  };

  const ChannelBadge = ({ channel }: { channel: Channel }) => {
    if (channel === 'stock') {
      return (
        <Badge variant="secondary" className="gap-1">
          <Warehouse className="h-3 w-3" />
          Stock
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1">
        <Truck className="h-3 w-3" />
        Direct
      </Badge>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par SKU, nom..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Fournisseur" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les fournisseurs</SelectItem>
              {suppliers.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Circuit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les circuits</SelectItem>
              <SelectItem value="direct">Direct</SelectItem>
              <SelectItem value="stock">Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Selection info */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {filteredAndSortedReferences.length} reference(s) affichee(s)
        </span>
        {selectedIds.length > 0 && (
          <Badge variant="default" className="gap-1">
            <Package className="h-3 w-3" />
            {selectedIds.length} selectionnee(s)
          </Badge>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50 hover:bg-secondary/50">
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={
                    filteredAndSortedReferences.length > 0 &&
                    selectedIds.length === filteredAndSortedReferences.length
                  }
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                  onClick={() => handleSort('sku')}
                >
                  SKU
                  <SortIcon field="sku" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                  onClick={() => handleSort('name')}
                >
                  Designation
                  <SortIcon field="name" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                  onClick={() => handleSort('supplier')}
                >
                  Fournisseur
                  <SortIcon field="supplier" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                  onClick={() => handleSort('channel')}
                >
                  Circuit
                  <SortIcon field="channel" />
                </Button>
              </TableHead>
              <TableHead>Type zone</TableHead>
              <TableHead className="text-right">Sites</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedReferences.map(ref => {
              const mainCondition = ref.purchaseConditions[0];
              const supplier = getSupplier(mainCondition?.supplierId);
              const isSelected = selectedIds.includes(ref.id);

              return (
                <TableRow
                  key={ref.id}
                  className={isSelected ? 'bg-accent/10' : ''}
                  onClick={() => handleSelectOne(ref.id)}
                >
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleSelectOne(ref.id)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">{ref.sku}</TableCell>
                  <TableCell className="font-medium">{ref.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium px-1.5 py-0.5 bg-secondary rounded">
                        {supplier?.code}
                      </span>
                      <span className="text-sm">{supplier?.name}</span>
                      {supplier && (
                        <div className="flex items-center gap-1 ml-1">
                          {supplier.availableChannels.includes('direct') && (
                            <Truck className="h-3.5 w-3.5 text-muted-foreground" title="Direct" />
                          )}
                          {supplier.availableChannels.includes('stock') && (
                            <Warehouse className="h-3.5 w-3.5 text-muted-foreground" title="Stock" />
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {mainCondition && <ChannelBadge channel={mainCondition.channel} />}
                  </TableCell>
                  <TableCell>
                    {supplier && (
                      <Badge
                        variant={supplier.siteConfiguration === 'national' ? 'default' : 'outline'}
                        className={supplier.siteConfiguration === 'national' ? 'bg-accent text-accent-foreground' : ''}
                      >
                        {supplier.siteConfiguration === 'national' ? 'National' : 'Groupe'}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm text-muted-foreground">
                      {mainCondition?.sites.length || 0} site(s)
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
