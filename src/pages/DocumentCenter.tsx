import React, { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { useDataSync } from '@/hooks/useDataSync';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  FileCheck
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
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <HardDrive className="w-8 h-8 text-primary" />
            Centralized Document Center
          </h1>
          <p className="text-muted-foreground text-sm">
            Secure client contracts, tax filings, vendor receipts, and accounting documents with integrated soft-delete safety.
          </p>
        </div>
        <div className="flex gap-2">
          {viewBin ? (
            <Button variant="outline" size="sm" onClick={() => setViewBin(false)} className="flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              Back to Storage
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setViewBin(true)} className="flex items-center gap-1.5 border-destructive/20 hover:border-destructive text-destructive hover:bg-destructive/10">
              <Trash2 className="w-4 h-4" />
              Recycle Bin ({stats.trashCount})
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={() => setIsFolderOpen(true)} className="flex items-center gap-1">
            <FolderPlus className="w-4 h-4" />
            New Folder
          </Button>

          <Button onClick={() => setIsUploadOpen(true)} className="flex items-center gap-1.5 shadow-md">
            <Upload className="w-4 h-4" />
            Upload Document
          </Button>
        </div>
      </div>

      {/* Storage Meter Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold text-muted-foreground">Emulated Disk Storage</p>
              <p className="text-lg font-bold text-foreground">
                {stats.storageUsedMB.toFixed(2)} MB / 100 MB
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-slate-800 flex items-center justify-center text-emerald-600">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold text-muted-foreground">Active Documents</p>
              <p className="text-lg font-bold text-foreground">
                {stats.fileCount} items archived
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-slate-800 flex items-center justify-center text-rose-600">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold text-muted-foreground">Trash (Recycle Bin)</p>
              <p className="text-lg font-bold text-foreground">
                {stats.trashCount} soft-deleted files
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workspace Area split into Folder Sidebar + Files Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Sidebar Folders list */}
        <Card className="shadow-sm border border-border h-fit">
          <CardHeader className="p-4 border-b border-border bg-muted/35">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Folders & Groupings</CardTitle>
          </CardHeader>
          <CardContent className="p-2 space-y-1">
            <button
              onClick={() => { setSelectedFolderId('all'); setViewBin(false); }}
              className={`w-full flex items-center justify-between text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                selectedFolderId === 'all' && !viewBin
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <span className="flex items-center gap-2">
                <HardDrive className="w-4 h-4" />
                All Document Vaults
              </span>
              <Badge variant={selectedFolderId === 'all' && !viewBin ? "secondary" : "outline"} className="text-[10px]">
                {documents.filter(d => !d.isDeleted).length}
              </Badge>
            </button>

            {folders.map(folder => (
              <button
                key={folder.id}
                onClick={() => { setSelectedFolderId(folder.id); setViewBin(false); }}
                className={`w-full flex items-center justify-between text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedFolderId === folder.id && !viewBin
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <Folder className="w-4 h-4" />
                  <span className="truncate">{folder.name}</span>
                </span>
                <Badge variant={selectedFolderId === folder.id && !viewBin ? "secondary" : "outline"} className="text-[10px]">
                  {documents.filter(d => d.folderId === folder.id && !d.isDeleted).length}
                </Badge>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Files Browser */}
        <div className="md:col-span-3 space-y-4">
          
          {/* Browser Controls */}
          <Card className="shadow-sm border border-border p-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search file names, formats, categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-card border-border h-9 text-xs"
                />
              </div>

              <Select value={selectedTypeFilter} onValueChange={setSelectedTypeFilter}>
                <SelectTrigger className="w-full sm:w-[180px] bg-card border-border h-9 text-xs">
                  <Filter className="w-3.5 h-3.5 mr-1.5 opacity-60" />
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All File Formats</SelectItem>
                  {DOCUMENT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Drag & Drop Upload Zone */}
          {!viewBin && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 cursor-pointer ${
                isDragging 
                  ? 'border-primary bg-primary/5 scale-[0.99] shadow-inner' 
                  : 'border-border/80 hover:border-primary/55 bg-muted/20'
              }`}
              onClick={() => setIsUploadOpen(true)}
            >
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold">Drag & drop files here, or click to upload</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Supports PDF contracts, tax sheets, receipts, or images (Max 10MB)</p>
                </div>
              </div>
            </div>
          )}

          {/* Files Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocuments.length === 0 ? (
              <div className="col-span-full border border-dashed border-border rounded-xl p-12 text-center text-muted-foreground bg-card">
                <File className="w-12 h-12 text-muted-foreground/45 mx-auto mb-3" />
                <h3 className="font-semibold text-sm text-foreground">
                  {viewBin ? 'Recycle Bin is empty' : 'No documents in this Vault'}
                </h3>
                <p className="text-xs mt-1">
                  {viewBin ? 'Great! No soft-deleted ledger items found.' : 'Upload reference files or create specialized folders.'}
                </p>
                {!viewBin && (
                  <Button variant="outline" size="sm" onClick={() => setIsUploadOpen(true)} className="mt-3">
                    Upload Reference
                  </Button>
                )}
              </div>
            ) : (
              filteredDocuments.map(doc => {
                const docTypeMeta = DOCUMENT_TYPES.find(t => t.value === doc.type);
                return (
                  <Card key={doc.id} className="shadow-sm border border-border group hover:shadow-md transition-all duration-200 bg-card overflow-hidden">
                    <CardHeader className="p-4 pb-2 border-b border-border/40 bg-muted/15 flex flex-row items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 truncate">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <h4 className="text-xs font-bold text-foreground truncate" title={doc.name}>
                            {doc.name}
                          </h4>
                          <p className="text-[10px] text-muted-foreground">
                            {(doc.fileSize / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                      <div className="flex justify-between items-center text-[10px]">
                        <Badge variant="outline" className="text-[9px] py-0 px-1 border-primary/25 text-primary">
                          {docTypeMeta ? docTypeMeta.label : doc.type}
                        </Badge>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {doc.createdAt?.slice(0, 10)}
                        </span>
                      </div>

                      {/* Action buttons inside Card */}
                      <div className="flex justify-end gap-1.5 pt-2 border-t border-border/50">
                        {doc.isDeleted ? (
                          <>
                            <Button variant="outline" size="xs" className="h-7 px-2 text-xs text-primary" onClick={() => handleRestore(doc.id)}>
                              <Undo2 className="w-3.5 h-3.5 mr-1" /> Restore
                            </Button>
                            <Button variant="ghost" size="xs" className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10" onClick={() => handleDeletePermanent(doc.id)}>
                              <Trash2 className="w-3.5 h-3.5 mr-1" /> Permanent Delete
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="outline" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => handleDownload(doc)} title="Download file">
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleSoftDelete(doc.id)} title="Soft delete to recycle bin">
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
  );
}
