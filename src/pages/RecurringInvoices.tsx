import { Helmet } from 'react-helmet-async';
import { useState, useMemo } from 'react';
import { RefreshCw, Trash2, Pause, Play, Calendar, Edit2, Zap, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
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

  const stats = useMemo(() => {
    const active = schedules.filter(s => s.isActive);
    const paused = schedules.filter(s => !s.isActive);
    const monthlyRunRate = active.reduce((sum, s) => {
      let multiplier = 1;
      if (s.frequency === 'weekly') multiplier = 4.33;
      if (s.frequency === 'quarterly') multiplier = 1 / 3;
      if (s.frequency === 'yearly') multiplier = 1 / 12;
      return sum + s.total * multiplier;
    }, 0);

    return {
      activeCount: active.length,
      pausedCount: paused.length,
      monthlyRunRate,
    };
  }, [schedules]);

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

      <div className="space-y-6 animate-slide-up">
        <PageHeader
          title="Recurring Invoices"
          description="Automated billing cycles, scheduled invoice generation, and recurring receivable triggers"
          action={
            <Button onClick={handleProcessNow} size="sm" className="gap-2">
              <RefreshCw className="w-3.5 h-3.5" />
              Process Cycles Now
            </Button>
          }
        />

        {/* Automation Run Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="shadow-sm border-border/80">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Active Automations</p>
                <p className="text-base font-semibold text-foreground tracking-tight">
                  {stats.activeCount} <span className="text-xs font-normal text-muted-foreground">schedules running</span>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/80">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Monthly Recurring Volume</p>
                <p className="text-base font-semibold text-foreground tracking-tight">
                  {formatCurrency(stats.monthlyRunRate)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/80">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Paused Automations</p>
                <p className="text-base font-semibold text-foreground tracking-tight">
                  {stats.pausedCount} <span className="text-xs font-normal text-muted-foreground">schedules on hold</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {schedules.length === 0 ? (
          <div className="border border-dashed border-border/80 rounded-xl py-16 text-center bg-card">
            <RefreshCw className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <h3 className="text-sm font-semibold text-foreground mb-1">No Recurring Schedules Configured</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Automate repeat client retainers or monthly subscriptions from the Create Invoice workflow.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {schedules.map(schedule => (
              <Card key={schedule.id} className="shadow-sm border-border/80 hover:border-border transition-all">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        schedule.isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      }`}>
                        <RefreshCw className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{schedule.client?.name || 'Unknown Client'}</p>
                          <Badge variant={schedule.isActive ? 'default' : 'secondary'} className="text-[10px] py-0 px-2">
                            {schedule.isActive ? 'Active Schedule' : 'Paused'}
                          </Badge>
                          {schedule.autoSend && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-primary/30 text-primary">
                              Auto-Dispatch
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
                          <span className="capitalize font-medium text-foreground">{schedule.frequency}</span>
                          <span>•</span>
                          <span className="font-semibold text-foreground">{formatCurrency(schedule.total)}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            Next cycle: <strong className="font-medium text-foreground">{formatDate(schedule.nextGenerationDate)}</strong>
                          </span>
                          {schedule.endDate && (
                            <>
                              <span>•</span>
                              <span>Until {formatDate(schedule.endDate)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center border-t sm:border-t-0 pt-3 sm:pt-0 w-full sm:w-auto justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(schedule.id, schedule.isActive)}
                        className="gap-1.5 text-xs h-8"
                      >
                        {schedule.isActive ? (
                          <>
                            <Pause className="w-3.5 h-3.5" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" />
                            Resume
                          </>
                        )}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(schedule)} title="Edit schedule">
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(schedule.id)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        title="Delete schedule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
              <DialogTitle className="text-base font-semibold">Edit Recurring Schedule</DialogTitle>
              <DialogDescription className="text-xs">Update recurrence frequency, cutoff dates, and dispatch preferences</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Billing Frequency</Label>
                <Select value={editFrequency} onValueChange={(v) => setEditFrequency(v as 'weekly' | 'monthly' | 'quarterly' | 'yearly')}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">End Date (optional)</Label>
                <Input type="date" value={editEndDate} onChange={e => setEditEndDate(e.target.value)} className="h-9 text-xs" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                <div className="space-y-0.5">
                  <Label htmlFor="editAutoSend" className="text-xs font-medium cursor-pointer">Auto-dispatch invoices</Label>
                  <p className="text-[11px] text-muted-foreground">Automatically email PDF invoices to client on generation</p>
                </div>
                <Switch id="editAutoSend" checked={editAutoSend} onCheckedChange={setEditAutoSend} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setEditSchedule(null)}>Cancel</Button>
              <Button size="sm" onClick={handleSaveEdit}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Recurring Schedule?</AlertDialogTitle>
              <AlertDialogDescription className="text-xs">
                This will permanently delete this recurring invoice schedule. Previously generated invoices will remain securely stored in your ledger.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete Schedule
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
