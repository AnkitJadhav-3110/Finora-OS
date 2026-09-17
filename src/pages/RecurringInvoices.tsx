import { Helmet } from 'react-helmet-async';
import { useState, useMemo } from 'react';
import { RefreshCw, Trash2, Pause, Play, Calendar, Edit2 } from 'lucide-react';
import { useStore, RecurringSchedule } from '@/store/useStore';
import { useDataSync } from '@/hooks/useDataSync';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { toast } from 'sonner';

export default function RecurringInvoices() {
  const { recurringSchedules, clients, settings, processRecurringInvoices } = useStore();
  const { updateRecurringSchedule, deleteRecurringSchedule } = useDataSync();
  const [editSchedule, setEditSchedule] = useState<RecurringSchedule | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Edit form state
  const [editFrequency, setEditFrequency] = useState<'weekly' | 'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [editEndDate, setEditEndDate] = useState('');
  const [editAutoSend, setEditAutoSend] = useState(false);

  const schedules = useMemo(() => {
    return recurringSchedules.map(s => ({
      ...s,
      client: clients.find(c => c.id === s.clientId),
      total: s.invoiceTemplate.items.reduce((sum, item) => sum + item.quantity * item.price, 0),
    })).sort((a, b) => new Date(a.nextGenerationDate).getTime() - new Date(b.nextGenerationDate).getTime());
  }, [recurringSchedules, clients]);

  const formatCurrency = (amount: number) =>
    `${settings.currencySymbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const openEdit = (schedule: RecurringSchedule) => {
    setEditSchedule(schedule);
    setEditFrequency(schedule.frequency);
    setEditEndDate(schedule.endDate || '');
    setEditAutoSend(schedule.autoSend);
  };

  const handleSaveEdit = async () => {
    if (!editSchedule) return;
    await updateRecurringSchedule(editSchedule.id, {
      frequency: editFrequency,
      endDate: editEndDate || undefined,
      autoSend: editAutoSend,
    });
    toast.success('Schedule updated');
    setEditSchedule(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteRecurringSchedule(deleteId);
    toast.success('Schedule deleted');
    setDeleteId(null);
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    await updateRecurringSchedule(id, { isActive: !isActive });
    toast.success(isActive ? 'Schedule paused' : 'Schedule resumed');
  };

  const handleProcessNow = () => {
    processRecurringInvoices();
    toast.success('Recurring invoices processed');
  };

  return (
    <>
      <Helmet>
        <title>Recurring Invoices | Finora</title>
        <meta name="description" content="Set up and manage recurring invoice schedules for automated billing in Finora." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="space-y-8 animate-slide-up">
      <PageHeader
        title="Recurring Invoices"
        description="Manage your automated invoice schedules"
        action={
          <Button onClick={handleProcessNow} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Process Now
          </Button>
        }
      />

      {schedules.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="py-16 text-center">
            <RefreshCw className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Recurring Invoices</h3>
            <p className="text-sm text-muted-foreground">
              Create a recurring invoice from the Create Invoice page
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {schedules.map(schedule => (
            <Card key={schedule.id} className="shadow-card">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      schedule.isActive ? 'bg-primary/10' : 'bg-muted'
                    }`}>
                      <RefreshCw className={`w-6 h-6 ${schedule.isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">{schedule.client?.name || 'Unknown Client'}</p>
                        <Badge variant={schedule.isActive ? 'default' : 'secondary'}>
                          {schedule.isActive ? 'Active' : 'Paused'}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted-foreground">
                        <span className="capitalize">{schedule.frequency}</span>
                        <span>•</span>
                        <span>{formatCurrency(schedule.total)}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Next: {formatDate(schedule.nextGenerationDate)}
                        </span>
                        {schedule.autoSend && (
                          <>
                            <span>•</span>
                            <Badge variant="outline" className="text-xs">Auto-send</Badge>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleActive(schedule.id, schedule.isActive)}
                      title={schedule.isActive ? 'Pause' : 'Resume'}
                    >
                      {schedule.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(schedule)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(schedule.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editSchedule} onOpenChange={() => setEditSchedule(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Schedule</DialogTitle>
            <DialogDescription>Update recurring invoice settings</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={editFrequency} onValueChange={(v) => setEditFrequency(v as 'weekly' | 'monthly' | 'quarterly' | 'yearly')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>End Date (optional)</Label>
              <Input type="date" value={editEndDate} onChange={e => setEditEndDate(e.target.value)} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
              <Label htmlFor="editAutoSend" className="cursor-pointer">Auto-send invoices</Label>
              <Switch id="editAutoSend" checked={editAutoSend} onCheckedChange={setEditAutoSend} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSchedule(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this recurring invoice schedule. Previously generated invoices will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </>
  );
}
