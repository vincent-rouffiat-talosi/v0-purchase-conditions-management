'use client';

import dynamic from 'next/dynamic';
import { useState, useMemo, useCallback } from 'react';

// Force dynamic rendering to avoid ISR issues with large datasets
export const runtime = 'edge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Filter,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MapPin,
  RefreshCw,
  FileSpreadsheet,
  CheckSquare,
  Square,
  MoreHorizontal,
  Building2,
  Truck,
  Warehouse,
  Package,
  AlertCircle,
  Check,
  X,
  ArrowUpDown,
} from 'lucide-react';
import type { ProductReference, Site, Channel } from '@/lib/types';
import { productReferences, suppliers, stores, warehouses, siteGroups, categories } from '@/lib/mock-data';

const ITEMS_PER_PAGE_OPTIONS = [50, 100, 200, 500];

interface Filters {
  search: string;
  supplierId: string;
  channel: string;
  category: string;
  region: string;
  hasSites: string; // 'all' | 'with' | 'without'
}

const initialFilters: Filters = {
  search: '',
  supplierId: 'all',
  channel: 'all',
  category: 'all',
  region: 'all',
  hasSites: 'all',
};

// Get unique regions from stores
const regions = [...new Set(stores.map(s => s.region))];

export default function BulkModificationsPage() {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<'sku' | 'name' | 'supplier' | 'category'>('sku');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Dialogs
  const [showSitesDialog, setShowSitesDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [sitesAction, setSitesAction] = useState<'add' | 'remove' | 'replace'>('add');
  const [selectedSitesForAction, setSelectedSitesForAction] = useState<Set<string>>(new Set());
  const [selectedGroupForAction, setSelectedGroupForAction] = useState<string>('');

  // Filter references
  const filteredReferences = useMemo(() => {
    return productReferences.filter(ref => {
      const condition = ref.purchaseConditions[0];
      const supplier = suppliers.find(s => s.id === condition?.supplierId);
      
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          ref.sku.toLowerCase().includes(searchLower) ||
          ref.name.toLowerCase().includes(searchLower) ||
          ref.barcode.includes(filters.search) ||
          ref.supplierReference.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      
      // Supplier filter
      if (filters.supplierId !== 'all' && condition?.supplierId !== filters.supplierId) {
        return false;
      }
      
      // Channel filter
      if (filters.channel !== 'all' && condition?.channel !== filters.channel) {
        return false;
      }
      
      // Category filter
      if (filters.category !== 'all' && ref.category !== filters.category) {
        return false;
      }
      
      // Region filter
      if (filters.region !== 'all') {
        const hasRegion = condition?.sites.some(s => s.region === filters.region);
        if (!hasRegion) return false;
      }
      
      // Has sites filter
      if (filters.hasSites === 'with' && (!condition?.sites || condition.sites.length === 0)) {
        return false;
      }
      if (filters.hasSites === 'without' && condition?.sites && condition.sites.length > 0) {
        return false;
      }
      
      return true;
    });
  }, [filters]);

  // Sort references
  const sortedReferences = useMemo(() => {
    return [...filteredReferences].sort((a, b) => {
      let aVal: string;
      let bVal: string;
      
      switch (sortField) {
        case 'sku':
          aVal = a.sku;
          bVal = b.sku;
          break;
        case 'name':
          aVal = a.name;
          bVal = b.name;
          break;
        case 'supplier':
          aVal = suppliers.find(s => s.id === a.purchaseConditions[0]?.supplierId)?.name || '';
          bVal = suppliers.find(s => s.id === b.purchaseConditions[0]?.supplierId)?.name || '';
          break;
        case 'category':
          aVal = a.category;
          bVal = b.category;
          break;
        default:
          aVal = a.sku;
          bVal = b.sku;
      }
      
      const comparison = aVal.localeCompare(bVal);
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredReferences, sortField, sortOrder]);

  // Paginate
  const totalPages = Math.ceil(sortedReferences.length / itemsPerPage);
  const paginatedReferences = sortedReferences.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Selection helpers
  const isAllPageSelected = paginatedReferences.length > 0 && 
    paginatedReferences.every(ref => selectedIds.has(ref.id));
  
  const isSomePageSelected = paginatedReferences.some(ref => selectedIds.has(ref.id));

  const toggleSelectAll = () => {
    if (isAllPageSelected) {
      const newSelected = new Set(selectedIds);
      paginatedReferences.forEach(ref => newSelected.delete(ref.id));
      setSelectedIds(newSelected);
    } else {
      const newSelected = new Set(selectedIds);
      paginatedReferences.forEach(ref => newSelected.add(ref.id));
      setSelectedIds(newSelected);
    }
  };

  const selectAllFiltered = () => {
    const newSelected = new Set(selectedIds);
    filteredReferences.forEach(ref => newSelected.add(ref.id));
    setSelectedIds(newSelected);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Reset filters
  const resetFilters = () => {
    setFilters(initialFilters);
    setCurrentPage(1);
  };

  // Export to CSV (simulated Excel)
  const handleExport = useCallback((exportAll: boolean) => {
    const toExport = exportAll ? filteredReferences : 
      filteredReferences.filter(ref => selectedIds.has(ref.id));
    
    const headers = ['SKU', 'Nom', 'Categorie', 'Code-barres', 'Ref Fournisseur', 'Fournisseur', 'Circuit', 'Nb Sites', 'Sites'];
    const rows = toExport.map(ref => {
      const condition = ref.purchaseConditions[0];
      const supplier = suppliers.find(s => s.id === condition?.supplierId);
      return [
        ref.sku,
        ref.name,
        ref.category,
        ref.barcode,
        ref.supplierReference,
        supplier?.name || '',
        condition?.channel || '',
        condition?.sites.length || 0,
        condition?.sites.map(s => s.name).join('; ') || '',
      ].join(',');
    });
    
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `references_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportDialog(false);
  }, [filteredReferences, selectedIds]);

  // Apply sites action
  const applySitesAction = () => {
    const affectedRefs = selectedIds.size > 0 
      ? filteredReferences.filter(ref => selectedIds.has(ref.id))
      : filteredReferences;
    
    let sitesToApply: Site[] = [];
    if (selectedGroupForAction) {
      const group = siteGroups.find(g => g.id === selectedGroupForAction);
      sitesToApply = group?.sites || [];
    } else {
      sitesToApply = [...stores, ...warehouses].filter(s => selectedSitesForAction.has(s.id));
    }
    
    // In a real app, this would update the database
    console.log(`Action: ${sitesAction}`);
    console.log(`Affected references: ${affectedRefs.length}`);
    console.log(`Sites to apply:`, sitesToApply);
    
    setShowSitesDialog(false);
    setSelectedSitesForAction(new Set());
    setSelectedGroupForAction('');
    // Show success toast in real implementation
  };

  const activeFiltersCount = Object.entries(filters).filter(
    ([key, value]) => key !== 'search' && value !== 'all' && value !== ''
  ).length + (filters.search ? 1 : 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Modifications en masse</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {productReferences.length.toLocaleString()} references au total
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="gap-2 bg-transparent" onClick={() => setShowImportDialog(true)}>
                <Upload className="h-4 w-4" />
                Importer Excel
              </Button>
              <Button variant="outline" className="gap-2 bg-transparent" onClick={() => setShowExportDialog(true)}>
                <Download className="h-4 w-4" />
                Exporter
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* Filters Sidebar */}
          <aside className="w-72 flex-shrink-0">
            <Card className="sticky top-24">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filtres
                  </CardTitle>
                  {activeFiltersCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 text-xs">
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Reinitialiser
                    </Button>
                  )}
                </div>
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="w-fit">
                    {activeFiltersCount} filtre(s) actif(s)
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Recherche</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="SKU, nom, code-barres..."
                      value={filters.search}
                      onChange={e => {
                        setFilters(prev => ({ ...prev, search: e.target.value }));
                        setCurrentPage(1);
                      }}
                      className="pl-9"
                    />
                  </div>
                </div>

                <Separator />

                {/* Supplier */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Fournisseur</Label>
                  <Select 
                    value={filters.supplierId} 
                    onValueChange={v => {
                      setFilters(prev => ({ ...prev, supplierId: v }));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tous les fournisseurs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les fournisseurs</SelectItem>
                      {suppliers.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          <span className="flex items-center gap-2">
                            <Building2 className="h-3 w-3" />
                            {s.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Channel */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Circuit</Label>
                  <Select 
                    value={filters.channel} 
                    onValueChange={v => {
                      setFilters(prev => ({ ...prev, channel: v }));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tous les circuits" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les circuits</SelectItem>
                      <SelectItem value="direct">
                        <span className="flex items-center gap-2">
                          <Truck className="h-3 w-3" />
                          Direct
                        </span>
                      </SelectItem>
                      <SelectItem value="stock">
                        <span className="flex items-center gap-2">
                          <Warehouse className="h-3 w-3" />
                          Stock
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Categorie</Label>
                  <Select 
                    value={filters.category} 
                    onValueChange={v => {
                      setFilters(prev => ({ ...prev, category: v }));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Toutes les categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les categories</SelectItem>
                      {categories.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Region */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Region</Label>
                  <Select 
                    value={filters.region} 
                    onValueChange={v => {
                      setFilters(prev => ({ ...prev, region: v }));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Toutes les regions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les regions</SelectItem>
                      {regions.map(r => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Has sites */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Affectation sites</Label>
                  <Select 
                    value={filters.hasSites} 
                    onValueChange={v => {
                      setFilters(prev => ({ ...prev, hasSites: v }));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="with">Avec sites</SelectItem>
                      <SelectItem value="without">Sans sites</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{filteredReferences.length.toLocaleString()}</span> references
                  {selectedIds.size > 0 && (
                    <> | <span className="text-accent font-semibold">{selectedIds.size.toLocaleString()}</span> selectionnee(s)</>
                  )}
                </p>
                {selectedIds.size > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearSelection} className="h-7 text-xs">
                    <X className="h-3 w-3 mr-1" />
                    Deselectionner
                  </Button>
                )}
              </div>

              {/* Bulk Actions */}
              <div className="flex items-center gap-2">
                {(selectedIds.size > 0 || filteredReferences.length > 0) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="default" className="gap-2">
                        <MapPin className="h-4 w-4" />
                        Modifier les sites
                        {selectedIds.size > 0 && (
                          <Badge variant="secondary" className="ml-1">
                            {selectedIds.size}
                          </Badge>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setSitesAction('add'); setShowSitesDialog(true); }}>
                        <Check className="h-4 w-4 mr-2 text-accent" />
                        Ajouter des sites
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setSitesAction('remove'); setShowSitesDialog(true); }}>
                        <X className="h-4 w-4 mr-2 text-destructive" />
                        Retirer des sites
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => { setSitesAction('replace'); setShowSitesDialog(true); }}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Remplacer tous les sites
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            {/* Selection Bar */}
            {filteredReferences.length > itemsPerPage && (
              <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-secondary/30 border border-border">
                <span className="text-sm text-muted-foreground">Selection rapide:</span>
                <Button variant="outline" size="sm" onClick={selectAllFiltered} className="h-7 text-xs bg-transparent">
                  <CheckSquare className="h-3 w-3 mr-1" />
                  Selectionner les {filteredReferences.length.toLocaleString()} resultats
                </Button>
              </div>
            )}

            {/* Table */}
            <Card>
              <ScrollArea className="h-[calc(100vh-320px)]">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox 
                          checked={isAllPageSelected}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Selectionner tout"
                          className={isSomePageSelected && !isAllPageSelected ? 'data-[state=checked]:bg-accent/50' : ''}
                        />
                      </TableHead>
                      <TableHead className="w-32">
                        <Button variant="ghost" size="sm" onClick={() => toggleSort('sku')} className="h-8 -ml-3 font-medium">
                          SKU
                          <ArrowUpDown className="h-3 w-3 ml-1" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm" onClick={() => toggleSort('name')} className="h-8 -ml-3 font-medium">
                          Nom
                          <ArrowUpDown className="h-3 w-3 ml-1" />
                        </Button>
                      </TableHead>
                      <TableHead className="w-40">
                        <Button variant="ghost" size="sm" onClick={() => toggleSort('category')} className="h-8 -ml-3 font-medium">
                          Categorie
                          <ArrowUpDown className="h-3 w-3 ml-1" />
                        </Button>
                      </TableHead>
                      <TableHead className="w-40">
                        <Button variant="ghost" size="sm" onClick={() => toggleSort('supplier')} className="h-8 -ml-3 font-medium">
                          Fournisseur
                          <ArrowUpDown className="h-3 w-3 ml-1" />
                        </Button>
                      </TableHead>
                      <TableHead className="w-24">Circuit</TableHead>
                      <TableHead className="w-24 text-right">Sites</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedReferences.map(ref => {
                      const condition = ref.purchaseConditions[0];
                      const supplier = suppliers.find(s => s.id === condition?.supplierId);
                      const isSelected = selectedIds.has(ref.id);
                      
                      return (
                        <TableRow 
                          key={ref.id}
                          className={isSelected ? 'bg-accent/5' : ''}
                        >
                          <TableCell>
                            <Checkbox 
                              checked={isSelected}
                              onCheckedChange={() => {
                                const newSelected = new Set(selectedIds);
                                if (isSelected) {
                                  newSelected.delete(ref.id);
                                } else {
                                  newSelected.add(ref.id);
                                }
                                setSelectedIds(newSelected);
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-sm">{ref.sku}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium truncate max-w-[200px]">{ref.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{ref.barcode}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {ref.category}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm truncate max-w-[100px]">{supplier?.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="secondary" 
                              className={condition?.channel === 'direct' ? 'bg-accent/10 text-accent' : 'bg-chart-2/10 text-chart-2'}
                            >
                              {condition?.channel === 'direct' ? 'Direct' : 'Stock'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-medium">{condition?.sites.length || 0}</span>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>Voir details</DropdownMenuItem>
                                <DropdownMenuItem>Modifier sites</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>

              {/* Pagination */}
              <div className="flex items-center justify-between p-4 border-t border-border">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">Lignes par page:</span>
                  <Select 
                    value={itemsPerPage.toString()} 
                    onValueChange={v => {
                      setItemsPerPage(Number(v));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-20 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ITEMS_PER_PAGE_OPTIONS.map(n => (
                        <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} sur {totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8 bg-transparent"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(1)}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8 bg-transparent"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => prev - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8 bg-transparent"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => prev + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8 bg-transparent"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(totalPages)}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </main>
        </div>
      </div>

      {/* Sites Modification Dialog */}
      <Dialog open={showSitesDialog} onOpenChange={setShowSitesDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-accent" />
              {sitesAction === 'add' && 'Ajouter des sites'}
              {sitesAction === 'remove' && 'Retirer des sites'}
              {sitesAction === 'replace' && 'Remplacer les sites'}
            </DialogTitle>
            <DialogDescription>
              Cette action affectera {selectedIds.size > 0 ? selectedIds.size.toLocaleString() : filteredReferences.length.toLocaleString()} reference(s)
              {selectedIds.size === 0 && ' (tout le resultat filtre)'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-6">
            {/* Quick select by group */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Selection rapide par groupe</Label>
              <Select value={selectedGroupForAction} onValueChange={v => {
                setSelectedGroupForAction(v);
                if (v) {
                  const group = siteGroups.find(g => g.id === v);
                  setSelectedSitesForAction(new Set(group?.sites.map(s => s.id) || []));
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selectionner un groupe de sites" />
                </SelectTrigger>
                <SelectContent>
                  {siteGroups.map(g => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name} ({g.sites.length} sites)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Individual sites */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Ou selectionner des sites individuels</Label>
                <span className="text-xs text-muted-foreground">
                  {selectedSitesForAction.size} site(s) selectionne(s)
                </span>
              </div>
              
              <ScrollArea className="h-[300px] border rounded-lg">
                <div className="p-3 space-y-1">
                  {stores.map(site => (
                    <label
                      key={site.id}
                      className="flex items-center gap-3 p-2 rounded hover:bg-secondary/50 cursor-pointer"
                    >
                      <Checkbox 
                        checked={selectedSitesForAction.has(site.id)}
                        onCheckedChange={(checked) => {
                          const newSelected = new Set(selectedSitesForAction);
                          if (checked) {
                            newSelected.add(site.id);
                          } else {
                            newSelected.delete(site.id);
                          }
                          setSelectedSitesForAction(newSelected);
                          setSelectedGroupForAction('');
                        }}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{site.name}</p>
                        <p className="text-xs text-muted-foreground">{site.region}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSitesDialog(false)}>
              Annuler
            </Button>
            <Button 
              onClick={applySitesAction}
              disabled={selectedSitesForAction.size === 0}
              className={sitesAction === 'remove' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {sitesAction === 'add' && 'Ajouter les sites'}
              {sitesAction === 'remove' && 'Retirer les sites'}
              {sitesAction === 'replace' && 'Remplacer les sites'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-accent" />
              Exporter les references
            </DialogTitle>
            <DialogDescription>
              Choisissez les references a exporter au format CSV (compatible Excel)
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-4">
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3 h-auto py-4 bg-transparent"
              onClick={() => handleExport(false)}
              disabled={selectedIds.size === 0}
            >
              <CheckSquare className="h-5 w-5 text-accent" />
              <div className="text-left">
                <p className="font-medium">Exporter la selection</p>
                <p className="text-sm text-muted-foreground">
                  {selectedIds.size > 0 
                    ? `${selectedIds.size.toLocaleString()} reference(s) selectionnee(s)`
                    : 'Aucune reference selectionnee'}
                </p>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="w-full justify-start gap-3 h-auto py-4 bg-transparent"
              onClick={() => handleExport(true)}
            >
              <Package className="h-5 w-5 text-chart-2" />
              <div className="text-left">
                <p className="font-medium">Exporter tout le resultat filtre</p>
                <p className="text-sm text-muted-foreground">
                  {filteredReferences.length.toLocaleString()} reference(s)
                </p>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-accent" />
              Importer depuis Excel
            </DialogTitle>
            <DialogDescription>
              Importez un fichier CSV/Excel pour mettre a jour les sites en masse
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-accent/50 transition-colors cursor-pointer">
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              <p className="font-medium">Glissez-deposez votre fichier ici</p>
              <p className="text-sm text-muted-foreground mt-1">ou cliquez pour parcourir</p>
              <p className="text-xs text-muted-foreground mt-4">Formats acceptes: .csv, .xlsx</p>
            </div>

            <div className="p-4 rounded-lg bg-secondary/30 space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                Format attendu
              </p>
              <p className="text-xs text-muted-foreground">
                Le fichier doit contenir les colonnes: SKU, Sites (separes par ;)
              </p>
              <Button variant="link" className="h-auto p-0 text-xs">
                Telecharger un modele
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Annuler
            </Button>
            <Button disabled>
              Importer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
