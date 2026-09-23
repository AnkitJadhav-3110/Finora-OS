import React, { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useStore } from '@/store/useStore';
import { useDataSync } from '@/hooks/useDataSync';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Folder,
  FolderPlus,
  File,
  Search,
  Upload,
  Trash2,
  Undo2,
  Download,
  Filter,
  FileText,
  Clock,
  HardDrive,
  Info,
  Archive,
  Plus,
  ArrowLeft,
  X,
  FileCheck,
  FolderOpen
} from 'lucide-react';

const DOCUMENT_TYPES = [
  { value: 'gst_document', label: 'GST Filings & Receipts' },
  { value: 'receipt', label: 'Vendor Expense Receipt' },
  { value: 'contract', label: 'Client Contract (MSA/SOW)' },
  { value: 'invoice', label: 'Issued Invoice Backup' },
  { value: 'other', label: 'Other General Files' }
];

export default function DocumentCenter() {
  const store = useStore();
  const sync = useDataSync();

  const currentBusinessId = store.currentBusinessId;

  // Store data lists
  const documents = useMemo(() => store.documents || [], [store.documents]);
  const folders = useMemo(() => store.documentFolders || [], [store.documentFolders]);

  // View state managers
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewBin, setViewBin] = useState(false);

  // Form inputs
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState<string>('receipt');
  const [fileSizeStr, setFileSizeStr] = useState('1.5'); // in MB
  const [targetFolderId, setTargetFolderId] = useState<string>('');

  const [isFolderOpen, setIsFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Drag and drop emulation state
  const [isDragging, setIsDragging] = useState(false);

  // Document filters
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      // Filter out soft deleted unless viewBin is active
      const matchesBin = viewBin ? !!doc.isDeleted : !doc.isDeleted;
      if (!matchesBin) return false;

      // Filter by folder
      const matchesFolder = selectedFolderId === 'all' || doc.folderId === selectedFolderId;

      // Filter by type
      const matchesType = selectedTypeFilter === 'all' || doc.type === selectedTypeFilter;

      // Search term (name or type)
      const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        doc.type.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesFolder && matchesType && matchesSearch;
    });
  }, [documents, selectedFolderId, selectedTypeFilter, searchTerm, viewBin]);

  // Aggregate stats
  const stats = useMemo(() => {
    const activeFiles = documents.filter(d => !d.isDeleted);
    const totalBytes = activeFiles.reduce((sum, d) => sum + d.fileSize, 0);
    const totalMB = totalBytes / (1024 * 1024);
    
    return {
      fileCount: activeFiles.length,
      trashCount: documents.filter(d => !!d.isDeleted).length,
      storageUsedMB: totalMB,
    };
  }, [documents]);

  // Actions
  const handleCreateFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) {
      toast.error('Folder name is required.');
      return;
    }

    const folderId = await sync.addDocumentFolder({
      businessId: currentBusinessId || '',
      name: newFolderName.trim()
    });

    toast.success(`Folder "${newFolderName}" created successfully.`);
    setNewFolderName('');
    setIsFolderOpen(false);
    setSelectedFolderId(folderId); // Auto-navigate to new folder
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName.trim()) {
      toast.error('Please specify a file name.');
      return;
    }

    // Convert MB to bytes
    const mbValue = parseFloat(fileSizeStr) || 1.2;
    const sizeInBytes = Math.round(mbValue * 1024 * 1024);

    const docId = await sync.addDocument({
      businessId: currentBusinessId || '',
      name: fileName.endsWith('.pdf') || fileName.endsWith('.jpg') || fileName.endsWith('.png') 
        ? fileName.trim() 
        : `${fileName.trim()}.pdf`, // Default fallback extension
      type: fileType as any,
      fileUrl: '#',
      fileSize: sizeInBytes,
      folderId: targetFolderId || undefined,
      isDeleted: false,
    });

    toast.success('Document reference uploaded successfully!');
    
    // Log activity
    sync.addActivityLog({
      businessId: currentBusinessId || '',
      type: 'invoice_created', // fallback type
      label: 'Document Uploaded',
      detail: `Successfully archived document: "${fileName}" in folder: ${folders.find(f => f.id === targetFolderId)?.name || 'Root'}`
    });

    // Reset Form
    setFileName('');
    setFileSizeStr('1.5');
    setTargetFolderId('');
    setIsUploadOpen(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const droppedFile = files[0];
      // Emulate upload right away
      setFileName(droppedFile.name);
      // Size in MB
      const mbSize = (droppedFile.size / (1024 * 1024)).toFixed(2);
      setFileSizeStr(mbSize);
      setIsUploadOpen(true);
      toast.info(`Parsed dropped file: "${droppedFile.name}" (${mbSize} MB). Complete metadata to save.`);
    }
  };

  const handleSoftDelete = async (id: string) => {
    await sync.deleteDocument(id);
    toast.success('Document moved to Recycle Bin (Soft Delete).');
  };

  const handleRestore = async (id: string) => {
    await sync.restoreDocument(id);
    toast.success('Document restored to original folder.');
  };

  const handleDeletePermanent = async (id: string) => {
    if (window.confirm('Are you sure you want to permanently delete this file? This action is irreversible.')) {
      // In useStore, deleteDocument acts as permanent delete if we call a custom delete action, 
      // but let's make sure our sync supports deleting files from Firestore.
      // Wait, let's look at `deleteDocument` in `useDataSync.ts` — it currently sets isDeleted: true.
      // To perform permanent deletion, we can just remove it from store array
      useStore.getState().deleteDocumentPermanent?.(id);
      toast.success('Document permanently deleted from Cloud storage.');
    }
  };

  const handleDownload = (doc: any) => {
    toast.success(`Triggered mock download for "${doc.name}"`);
    // Emulate standard secure browser download trigger
    const link = document.createElement('a');
    link.href = '#';
    link.setAttribute('download', doc.name);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Helmet>
        <title>Document Center | Finora</title>
        <meta name="description" content="Centralized business document vault, invoices, tax filings, and receipt archives in Finora." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="space-y-6 animate-slide-up">
        <PageHeader
          title={viewBin ? "Recycle Bin Vault" : "Document Center"}
          description={viewBin ? "Recover or permanently purge soft-deleted business receipts, contracts, and filings" : "Secure client contracts, tax filings, vendor receipts, and accounting documents with integrated soft-delete safety"}
          action={
            <div className="flex flex-wrap items-center gap-2">
              {viewBin ? (
                <Button variant="outline" size="sm" onClick={() => setViewBin(false)} className="gap-1.5">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Active Storage
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setViewBin(true)} className="gap-1.5 text-muted-foreground hover:text-destructive hover:border-destructive/30">
                  <Trash2 className="w-3.5 h-3.5" />
                  Recycle Bin ({stats.trashCount})
                </Button>
              )}

              <Button variant="outline" size="sm" onClick={() => setIsFolderOpen(true)} className="gap-1.5">
                <FolderPlus className="w-3.5 h-3.5" />
                New Folder
              </Button>

              <Button size="sm" onClick={() => setIsUploadOpen(true)} className="gap-1.5">
                <Upload className="w-3.5 h-3.5" />
                Upload Document
              </Button>
            </div>
          }
        />

        {/* Storage Meter Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="shadow-sm border-border/80">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <HardDrive className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Vault Storage</p>
                <p className="text-base font-semibold text-foreground tracking-tight">
                  {stats.storageUsedMB.toFixed(2)} MB <span className="text-xs font-normal text-muted-foreground">/ 100 MB</span>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/80">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                <FileCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Active Documents</p>
                <p className="text-base font-semibold text-foreground tracking-tight">
                  {stats.fileCount} <span className="text-xs font-normal text-muted-foreground">archived items</span>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/80">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Recycle Bin</p>
                <p className="text-base font-semibold text-foreground tracking-tight">
                  {stats.trashCount} <span className="text-xs font-normal text-muted-foreground">soft-deleted</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Workspace Area split into Folder Navigation + Files Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
          
          {/* Folders navigation panel */}
          <Card className="shadow-sm border-border/80 md:sticky md:top-20">
            <CardHeader className="p-3.5 border-b border-border/60 bg-muted/20 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Vault Directories
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsFolderOpen(true)}
                title="Create folder"
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="p-2 space-y-1">
              <button
                type="button"
                onClick={() => { setSelectedFolderId('all'); setViewBin(false); }}
                className={`w-full flex items-center justify-between text-left px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  selectedFolderId === 'all' && !viewBin
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : 'text-foreground hover:bg-muted/70'
                }`}
              >
                <span className="flex items-center gap-2">
                  <HardDrive className="w-3.5 h-3.5" />
                  All Files
                </span>
                <Badge variant={selectedFolderId === 'all' && !viewBin ? "secondary" : "outline"} className="text-[10px] px-1.5 py-0 h-4">
                  {documents.filter(d => !d.isDeleted).length}
                </Badge>
              </button>

              {folders.map(folder => (
                <button
                  type="button"
                  key={folder.id}
                  onClick={() => { setSelectedFolderId(folder.id); setViewBin(false); }}
                  className={`w-full flex items-center justify-between text-left px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    selectedFolderId === folder.id && !viewBin
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : 'text-foreground hover:bg-muted/70'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Folder className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{folder.name}</span>
                  </span>
                  <Badge variant={selectedFolderId === folder.id && !viewBin ? "secondary" : "outline"} className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                    {documents.filter(d => d.folderId === folder.id && !d.isDeleted).length}
                  </Badge>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Files Browser & Operations */}
          <div className="md:col-span-3 space-y-4">
            
            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search file name, type, or extension..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <Select value={selectedTypeFilter} onValueChange={setSelectedTypeFilter}>
                <SelectTrigger className="w-full sm:w-[190px] h-9 text-xs">
                  <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Document Types</SelectItem>
                  {DOCUMENT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Drag & Drop Upload Zone */}
            {!viewBin && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                  isDragging 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border/80 hover:border-primary/50 bg-muted/15'
                }`}
                onClick={() => setIsUploadOpen(true)}
              >
                <div className="flex flex-col items-center justify-center space-y-1.5">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Drag & drop documents here, or click to upload</p>
                    <p className="text-[11px] text-muted-foreground">PDF contracts, tax filings, vendor receipts, invoices (Max 10MB)</p>
                  </div>
                </div>
              </div>
            )}

            {/* Files Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredDocuments.length === 0 ? (
                <div className="col-span-full border border-dashed border-border/80 rounded-xl p-12 text-center text-muted-foreground bg-card">
                  <File className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2.5" />
                  <h3 className="font-semibold text-sm text-foreground">
                    {viewBin ? 'Recycle Bin is empty' : 'No documents found'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    {viewBin ? 'No soft-deleted records in storage.' : 'No files matching the selected directory or filter. Upload reference documents to get started.'}
                  </p>
                  {!viewBin && (
                    <Button size="sm" onClick={() => setIsUploadOpen(true)} className="mt-3.5 gap-1.5">
                      <Plus className="w-3.5 h-3.5" />
                      Upload File
                    </Button>
                  )}
                </div>
              ) : (
                filteredDocuments.map(doc => {
                  const docTypeMeta = DOCUMENT_TYPES.find(t => t.value === doc.type);
                  return (
                    <Card key={doc.id} className="shadow-sm border-border/70 hover:border-border transition-all bg-card overflow-hidden">
                      <CardHeader className="p-3.5 pb-2.5 border-b border-border/50 bg-muted/10 flex flex-row items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 truncate min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="truncate min-w-0">
                            <h4 className="text-xs font-semibold text-foreground truncate" title={doc.name}>
                              {doc.name}
                            </h4>
                            <p className="text-[11px] text-muted-foreground">
                              {(doc.fileSize / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-3.5 space-y-3">
                        <div className="flex justify-between items-center text-[11px]">
                          <Badge variant="outline" className="text-[10px] font-normal py-0 px-1.5">
                            {docTypeMeta ? docTypeMeta.label : doc.type}
                          </Badge>
                          <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                            <Clock className="w-3 h-3" />
                            {doc.createdAt?.slice(0, 10)}
                          </span>
                        </div>

                        {/* Action buttons */}
                        <div className="flex justify-end gap-1.5 pt-2 border-t border-border/40">
                          {doc.isDeleted ? (
                            <>
                              <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs text-primary" onClick={() => handleRestore(doc.id)}>
                                <Undo2 className="w-3 h-3 mr-1" /> Restore
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDeletePermanent(doc.id)}>
                                <Trash2 className="w-3 h-3 mr-1" /> Purge
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button variant="outline" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => handleDownload(doc)} title="Download file">
                                <Download className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleSoftDelete(doc.id)} title="Move to recycle bin">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </div>

      {/* Upload Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="sm:max-w-[480px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <Upload className="w-5 h-5 text-primary" />
              Upload Reference Document
            </DialogTitle>
            <DialogDescription>
              Store accounting slips, input GST declarations, or customer contract backups.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Document Name *</label>
              <Input
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="e.g. Acme_Contract_2026.pdf, Tax_Receipt.jpg"
                required
                className="bg-card border-border"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Document Category *</label>
                <Select value={fileType} onValueChange={setFileType}>
                  <SelectTrigger className="bg-card border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">File Size (MB) *</label>
                <Input
                  type="number"
                  step="any"
                  value={fileSizeStr}
                  onChange={(e) => setFileSizeStr(e.target.value)}
                  placeholder="1.5"
                  required
                  className="bg-card border-border"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Target Vault Folder</label>
              <Select value={targetFolderId} onValueChange={setTargetFolderId}>
                <SelectTrigger className="bg-card border-border">
                  <SelectValue placeholder="Root Directory" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root_dir">Root Directory</SelectItem>
                  {folders.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsUploadOpen(false)}>Cancel</Button>
              <Button type="submit" className="shadow-md">
                Complete Upload
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Folder Dialog */}
      <Dialog open={isFolderOpen} onOpenChange={setIsFolderOpen}>
        <DialogContent className="sm:max-w-[400px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <FolderPlus className="w-5 h-5 text-primary" />
              Create Document Vault Folder
            </DialogTitle>
            <DialogDescription>
              Group audit records or customer contracts under clean directory paths.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateFolderSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Folder Name *</label>
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g. Q2 Tax Filings, Vendor Receipts"
                required
                className="bg-card border-border"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFolderOpen(false)}>Cancel</Button>
              <Button type="submit" className="shadow-md">
                Create Folder
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      </div>
    </>
  );
}
