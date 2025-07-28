import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DateInputField } from '@/components/ui/date-input-field';
import { toast } from 'sonner';
import { 
  Save, 
  Calendar,
  DollarSign,
  Users,
  AlertCircle,
  QrCode,
  TrendingUp,
  Copy,
  Share
} from 'lucide-react';
import { referralService } from '@/lib/services/referralService';

const referralCodeSchema = z.object({
  code: z.string()
    .min(3, "Code must be at least 3 characters")
    .max(20, "Code must be under 20 characters")
    .regex(/^[A-Z0-9_-]+$/i, "Code can only contain letters, numbers, hyphens, and underscores"),
  description: z.string().optional(),
  commissionRate: z.number().min(0).max(100),
  eventIds: z.array(z.string()).optional(),
  isActive: z.boolean(),
  expiresAt: z.string().optional(),
  maxUses: z.number().min(0).optional(),
  minPurchaseAmount: z.number().min(0).optional(),
  bonusAmount: z.number().min(0).optional(),
  notes: z.string().optional()
});

type ReferralCodeFormData = z.infer<typeof referralCodeSchema>;

interface ReferralCode {
  id: string;
  code: string;
  commission_rate: number;
  is_active: boolean;
  description?: string;
  event_ids?: string[];
  expires_at?: string;
  max_uses?: number;
  min_purchase_amount?: number;
  bonus_amount?: number;
  notes?: string;
  uses_count: number;
  total_sales: number;
  total_commission: number;
}

interface EditReferralCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  referralCode: ReferralCode | null;
  onUpdate: (updatedCode: ReferralCode) => void;
  availableEvents?: Array<{ id: string; title: string }>;
}

export function EditReferralCodeModal({ 
  isOpen, 
  onClose, 
  referralCode, 
  onUpdate,
  availableEvents = []
}: EditReferralCodeModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const form = useForm<ReferralCodeFormData>({
    resolver: zodResolver(referralCodeSchema),
    defaultValues: {
      code: '',
      description: '',
      commissionRate: 10,
      eventIds: [],
      isActive: true,
      expiresAt: '',
      maxUses: undefined,
      minPurchaseAmount: undefined,
      bonusAmount: undefined,
      notes: ''
    }
  });

  useEffect(() => {
    if (referralCode) {
      form.reset({
        code: referralCode.code,
        description: referralCode.description || '',
        commissionRate: referralCode.commission_rate,
        eventIds: referralCode.event_ids || [],
        isActive: referralCode.is_active,
        expiresAt: referralCode.expires_at || '',
        maxUses: referralCode.max_uses || undefined,
        minPurchaseAmount: referralCode.min_purchase_amount || undefined,
        bonusAmount: referralCode.bonus_amount || undefined,
        notes: referralCode.notes || ''
      });
      
      // Show advanced options if any are set
      if (referralCode.expires_at || referralCode.max_uses || 
          referralCode.min_purchase_amount || referralCode.bonus_amount) {
        setShowAdvanced(true);
      }
    }
  }, [referralCode, form]);

  const handleSubmit = async (data: ReferralCodeFormData) => {
    if (!referralCode) return;

    setIsSaving(true);
    try {
      // Update referral code via service
      const result = await referralService.updateReferralCode(referralCode.id, {
        code: data.code,
        description: data.description,
        commission_rate: data.commissionRate,
        event_ids: data.eventIds,
        is_active: data.isActive,
        expires_at: data.expiresAt,
        max_uses: data.maxUses,
        min_purchase_amount: data.minPurchaseAmount,
        bonus_amount: data.bonusAmount,
        notes: data.notes
      });

      if (result.success && result.data) {
        toast.success('Referral code updated successfully');
        onUpdate(result.data);
        onClose();
      } else {
        throw new Error(result.error || 'Failed to update referral code');
      }
    } catch (error) {
      console.error('Error updating referral code:', error);
      toast.error('Failed to update referral code');
    } finally {
      setIsSaving(false);
    }
  };

  const copyCode = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode.code);
      toast.success('Code copied to clipboard');
    }
  };

  const shareCode = () => {
    if (referralCode && navigator.share) {
      navigator.share({
        title: 'Referral Code',
        text: `Use my referral code: ${referralCode.code}`,
        url: window.location.origin
      }).catch(() => {
        // User cancelled or share failed
      });
    }
  };

  if (!referralCode) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Referral Code</DialogTitle>
          <DialogDescription>
            Update your referral code settings and tracking
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Code Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total Uses</span>
              </div>
              <p className="text-2xl font-bold">{referralCode.uses_count}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total Sales</span>
              </div>
              <p className="text-2xl font-bold">${referralCode.total_sales.toFixed(2)}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Commission</span>
              </div>
              <p className="text-2xl font-bold">${referralCode.total_commission.toFixed(2)}</p>
            </Card>
          </div>

          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="code">Referral Code *</Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  placeholder="SUMMER2024"
                  {...form.register("code")}
                  className={form.formState.errors.code ? "border-destructive" : ""}
                />
                <Button type="button" variant="outline" size="sm" onClick={copyCode}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={shareCode}>
                  <Share className="h-4 w-4" />
                </Button>
              </div>
              {form.formState.errors.code && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.code.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this code is for..."
                {...form.register("description")}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="commissionRate">Commission Rate (%)</Label>
                <Input
                  id="commissionRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  {...form.register("commissionRate", { valueAsNumber: true })}
                  className={form.formState.errors.commissionRate ? "border-destructive" : ""}
                />
                {form.formState.errors.commissionRate && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.commissionRate.message}
                  </p>
                )}
              </div>

              <div className="flex items-end">
                <div className="flex items-center space-x-2 pb-2">
                  <Switch
                    checked={form.watch("isActive")}
                    onCheckedChange={(checked) => form.setValue("isActive", checked)}
                  />
                  <Label>Code is Active</Label>
                </div>
              </div>
            </div>

            {/* Event Selection */}
            {availableEvents.length > 0 && (
              <div>
                <Label>Applicable Events</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Leave empty to apply to all events
                </p>
                <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
                  {availableEvents.map(event => (
                    <div key={event.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`event-${event.id}`}
                        checked={form.watch('eventIds')?.includes(event.id) || false}
                        onChange={(e) => {
                          const currentIds = form.watch('eventIds') || [];
                          if (e.target.checked) {
                            form.setValue('eventIds', [...currentIds, event.id]);
                          } else {
                            form.setValue('eventIds', currentIds.filter(id => id !== event.id));
                          }
                        }}
                        className="h-4 w-4"
                      />
                      <label htmlFor={`event-${event.id}`} className="text-sm flex-1 cursor-pointer">
                        {event.title}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Advanced Options */}
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="mb-4"
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced Options
            </Button>

            {showAdvanced && (
              <div className="space-y-4 border rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expiresAt">Expiration Date</Label>
                    <DateInputField
                      value={form.watch('expiresAt')}
                      onChange={(value) => form.setValue('expiresAt', value)}
                      minDate={new Date().toISOString().split('T')[0]}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Leave empty for no expiration
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="maxUses">Maximum Uses</Label>
                    <Input
                      id="maxUses"
                      type="number"
                      min="0"
                      placeholder="Unlimited"
                      {...form.register("maxUses", { valueAsNumber: true })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Leave empty for unlimited uses
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minPurchaseAmount">Minimum Purchase ($)</Label>
                    <Input
                      id="minPurchaseAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="No minimum"
                      {...form.register("minPurchaseAmount", { valueAsNumber: true })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="bonusAmount">Bonus Amount ($)</Label>
                    <Input
                      id="bonusAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="No bonus"
                      {...form.register("bonusAmount", { valueAsNumber: true })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Extra commission per sale
                    </p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Internal Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Notes about this referral code (not visible to users)..."
                    {...form.register("notes")}
                    rows={2}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}