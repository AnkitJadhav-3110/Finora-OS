import { useState } from 'react';
import { Calendar, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useStore, RecurringSchedule, InvoiceItem, InvoiceTemplate } from '@/store/useStore';
import { useDataSync } from '@/hooks/useDataSync';
import { toast } from 'sonner';

interface RecurringInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId?: string;
  clientId: string;
  invoiceData: {
    items: InvoiceItem[];
    notes: string;
    template: string;
  };
}

export function RecurringInvoiceDialog({
  open,
  onOpenChange,
  invoiceId,
  clientId,
  invoiceData,
}: RecurringInvoiceDialogProps) {
  const { currentBusinessId } = useStore();
  const { addRecurringSchedule } = useDataSync();
  const [frequency, setFrequency] = useState<'weekly' | 'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [autoSend, setAutoSend] = useState(false);

  const handleSave = async () => {
    if (!clientId) {
      toast.error('Please select a client first');
      return;
    }

    if (!currentBusinessId) {
      toast.error('Please select a business first');
      return;
    }

    const schedule: Omit<RecurringSchedule, 'id' | 'createdAt'> = {
      clientId,
      businessId: currentBusinessId,
      frequency,
      startDate,
      endDate: endDate || undefined,
      nextGenerationDate: startDate,
      isActive: true,
      autoSend,
      invoiceTemplate: {
        items: invoiceData.items,
        notes: invoiceData.notes,
        template: invoiceData.template as InvoiceTemplate,
      },
    };

    await addRecurringSchedule(schedule);
    toast.success(`Recurring invoice scheduled (${frequency})`);
    onOpenChange(false);
  };

  const getFrequencyDescription = () => {
    switch (frequency) {
      case 'weekly':
        return 'Every week on the same day';
      case 'monthly':
        return 'Every month on the same date';
      case 'quarterly':
        return 'Every 3 months on the same date';
      case 'yearly':
        return 'Every year on the same date';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" />
            Set Up Recurring Invoice
          </DialogTitle>
          <DialogDescription>
            Automatically generate invoices on a schedule
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Frequency</Label>
            <Select value={frequency} onValueChange={(v: 'weekly' | 'monthly' | 'quarterly' | 'yearly') => setFrequency(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{getFrequencyDescription()}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date (optional)</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
            <div className="space-y-0.5">
              <Label htmlFor="autoSend" className="cursor-pointer">Auto-send invoices</Label>
              <p className="text-xs text-muted-foreground">
                Automatically mark as sent when generated
              </p>
            </div>
            <Switch
              id="autoSend"
              checked={autoSend}
              onCheckedChange={setAutoSend}
            />
          </div>

          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 text-sm text-primary">
              <Calendar className="w-4 h-4" />
              <span className="font-medium">Next invoice:</span>
              <span>{new Date(startDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Create Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
