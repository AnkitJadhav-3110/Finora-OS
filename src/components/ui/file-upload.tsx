import * as React from 'react';
import { useCallback, useState } from 'react';
import { Upload, X, Image, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { validateFile, ACCEPTED_IMAGE_TYPES } from '@/utils/validation';
import { toast } from 'sonner';

interface FileUploadProps {
  value?: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  accept?: string;
  maxSize?: number;
  label?: string;
  previewType?: 'square' | 'wide';
  className?: string;
}

export function FileUpload({
  value,
  onChange,
  onClear,
  accept = 'image/*',
  label = 'Upload file',
  previewType = 'square',
  className,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    const validation = validateFile(file);
    
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    setIsUploading(true);
    setProgress(0);

    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 50);

    const reader = new FileReader();
    reader.onload = (e) => {
      clearInterval(progressInterval);
      setProgress(100);
      
      setTimeout(() => {
        onChange(e.target?.result as string);
        setIsUploading(false);
        setProgress(0);
        toast.success('File uploaded successfully');
      }, 200);
    };
    reader.onerror = () => {
      clearInterval(progressInterval);
      setIsUploading(false);
      setProgress(0);
      toast.error('Failed to read file');
    };
    reader.readAsDataURL(file);
  }, [onChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleClear = useCallback(() => {
    onChange('');
    onClear?.();
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [onChange, onClear]);

  if (value) {
    return (
      <div className={cn('relative group', className)}>
        <div className={cn(
          'relative rounded-lg overflow-hidden border border-border bg-muted/30',
          previewType === 'square' ? 'w-20 h-20' : 'h-16 w-auto min-w-[100px] max-w-[200px]'
        )}>
          <img 
            src={value} 
            alt="Uploaded image preview" 
            className="w-full h-full object-contain"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={handleClear}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5">
          <CheckCircle2 className="w-3 h-3 text-white" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-4 cursor-pointer transition-all duration-200',
          'flex flex-col items-center justify-center gap-2 min-h-[100px]',
          isDragging 
            ? 'border-primary bg-primary/5 scale-[1.02]' 
            : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30',
          isUploading && 'pointer-events-none'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="hidden"
        />
        
        {isUploading ? (
          <div className="w-full space-y-2">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Upload className="w-4 h-4 animate-bounce" />
              <span>Uploading...</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        ) : (
          <>
            <div className={cn(
              'p-2 rounded-full transition-colors',
              isDragging ? 'bg-primary/10' : 'bg-muted'
            )}>
              <Image className={cn(
                'w-5 h-5 transition-colors',
                isDragging ? 'text-primary' : 'text-muted-foreground'
              )} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                {isDragging ? 'Drop file here' : label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Drag & drop or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Max 2MB • JPEG, PNG, WebP, SVG
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
