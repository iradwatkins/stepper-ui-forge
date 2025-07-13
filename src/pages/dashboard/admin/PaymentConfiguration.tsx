import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CreditCard, 
  Settings, 
  Save, 
  AlertCircle, 
  CheckCircle,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react';
import { 
  PaymentConfigurationService, 
  PaymentConfiguration,
  PayPalConfig,
  SquareConfig,
  CashAppConfig
} from '@/lib/services/PaymentConfigurationService';
import { toast } from 'sonner';

export default function PaymentConfigurationPage() {
  const [configurations, setConfigurations] = useState<PaymentConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>('sandbox');

  // Form states for different gateways
  const [paypalConfig, setPaypalConfig] = useState<PayPalConfig>({ 
    client_id: '', 
    client_secret: '', 
    webhook_id: '' 
  });
  const [squareConfig, setSquareConfig] = useState<SquareConfig>({ 
    application_id: '', 
    access_token: '', 
    location_id: '' 
  });
  const [cashappConfig, setCashappConfig] = useState<CashAppConfig>({ 
    client_id: '' 
  });

  const [gatewayStatus, setGatewayStatus] = useState<Record<string, boolean>>({
    paypal: false,
    square: false,
    cashapp: false
  });

  useEffect(() => {
    loadConfigurations();
  }, [environment]);

  const loadConfigurations = async () => {
    try {
      setLoading(true);
      const configs = await PaymentConfigurationService.getActiveConfigurations();
      setConfigurations(configs);

      // Load configurations for current environment
      const paypal = await PaymentConfigurationService.getPayPalConfig(environment);
      const square = await PaymentConfigurationService.getSquareConfig(environment);
      const cashapp = await PaymentConfigurationService.getCashAppConfig(environment);

      if (paypal) setPaypalConfig(paypal);
      if (square) setSquareConfig(square);
      if (cashapp) setCashappConfig(cashapp);

      // Update status
      setGatewayStatus({
        paypal: !!paypal,
        square: !!square,
        cashapp: !!cashapp
      });

    } catch (error) {
      console.error('Error loading payment configurations:', error);
      toast.error('Failed to load payment configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfiguration = async (gateway: string) => {
    try {
      setSaving(true);
      let config: Record<string, any>;
      
      switch (gateway) {
        case 'paypal':
          const paypalValidation = PaymentConfigurationService.validateConfiguration('paypal', paypalConfig);
          if (!paypalValidation.isValid) {
            toast.error(`PayPal configuration errors: ${paypalValidation.errors.join(', ')}`);
            return;
          }
          config = paypalConfig;
          break;
        
        case 'square':
          const squareValidation = PaymentConfigurationService.validateConfiguration('square', squareConfig);
          if (!squareValidation.isValid) {
            toast.error(`Square configuration errors: ${squareValidation.errors.join(', ')}`);
            return;
          }
          config = squareConfig;
          break;
        
        case 'cashapp':
          const cashappValidation = PaymentConfigurationService.validateConfiguration('cashapp', cashappConfig);
          if (!cashappValidation.isValid) {
            toast.error(`Cash App configuration errors: ${cashappValidation.errors.join(', ')}`);
            return;
          }
          config = cashappConfig;
          break;
        
        default:
          throw new Error('Unknown gateway');
      }

      await PaymentConfigurationService.updateGatewayConfiguration(
        gateway,
        environment,
        config,
        gatewayStatus[gateway]
      );

      toast.success(`${gateway.charAt(0).toUpperCase() + gateway.slice(1)} configuration saved successfully`);
      loadConfigurations();
    } catch (error) {
      console.error(`Error saving ${gateway} configuration:`, error);
      toast.error(`Failed to save ${gateway} configuration`);
    } finally {
      setSaving(false);
    }
  };

  const toggleSecretVisibility = (key: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const maskSecret = (value: string, show: boolean) => {
    if (show || !value) return value;
    return '●'.repeat(Math.min(value.length, 20));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payment Configuration</h1>
          <p className="text-muted-foreground">
            Manage payment gateway settings and credentials
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={environment} onValueChange={(value: 'sandbox' | 'production') => setEnvironment(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sandbox">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  Sandbox
                </div>
              </SelectItem>
              <SelectItem value="production">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  Production
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={loadConfigurations} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Payment configurations are stored securely in the database. Never share these credentials or commit them to version control.
          {environment === 'production' && (
            <strong className="block mt-1 text-red-600">
              You are configuring PRODUCTION settings. Use real credentials only.
            </strong>
          )}
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="paypal" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="paypal" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            PayPal
            {gatewayStatus.paypal && <CheckCircle className="w-3 h-3 text-green-500" />}
          </TabsTrigger>
          <TabsTrigger value="square" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Square
            {gatewayStatus.square && <CheckCircle className="w-3 h-3 text-green-500" />}
          </TabsTrigger>
          <TabsTrigger value="cashapp" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Cash App
            {gatewayStatus.cashapp && <CheckCircle className="w-3 h-3 text-green-500" />}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="paypal">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                PayPal Configuration
                <div className="flex items-center gap-2">
                  <Switch
                    checked={gatewayStatus.paypal}
                    onCheckedChange={(checked) => setGatewayStatus(prev => ({ ...prev, paypal: checked }))}
                  />
                  <Badge variant={gatewayStatus.paypal ? 'default' : 'secondary'}>
                    {gatewayStatus.paypal ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardTitle>
              <CardDescription>
                Configure PayPal payment processing for {environment} environment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="paypal-client-id">Client ID</Label>
                  <div className="relative">
                    <Input
                      id="paypal-client-id"
                      type={showSecrets.paypalClientId ? 'text' : 'password'}
                      value={maskSecret(paypalConfig.client_id, showSecrets.paypalClientId)}
                      onChange={(e) => setPaypalConfig(prev => ({ ...prev, client_id: e.target.value }))}
                      placeholder="PayPal Client ID"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => toggleSecretVisibility('paypalClientId')}
                    >
                      {showSecrets.paypalClientId ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="paypal-client-secret">Client Secret</Label>
                  <div className="relative">
                    <Input
                      id="paypal-client-secret"
                      type={showSecrets.paypalClientSecret ? 'text' : 'password'}
                      value={maskSecret(paypalConfig.client_secret, showSecrets.paypalClientSecret)}
                      onChange={(e) => setPaypalConfig(prev => ({ ...prev, client_secret: e.target.value }))}
                      placeholder="PayPal Client Secret"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => toggleSecretVisibility('paypalClientSecret')}
                    >
                      {showSecrets.paypalClientSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="paypal-webhook-id">Webhook ID (Optional)</Label>
                <Input
                  id="paypal-webhook-id"
                  value={paypalConfig.webhook_id || ''}
                  onChange={(e) => setPaypalConfig(prev => ({ ...prev, webhook_id: e.target.value }))}
                  placeholder="PayPal Webhook ID"
                />
              </div>

              <Button onClick={() => handleSaveConfiguration('paypal')} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                Save PayPal Configuration
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="square">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Square Configuration
                <div className="flex items-center gap-2">
                  <Switch
                    checked={gatewayStatus.square}
                    onCheckedChange={(checked) => setGatewayStatus(prev => ({ ...prev, square: checked }))}
                  />
                  <Badge variant={gatewayStatus.square ? 'default' : 'secondary'}>
                    {gatewayStatus.square ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardTitle>
              <CardDescription>
                Configure Square payment processing for {environment} environment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="square-app-id">Application ID</Label>
                  <Input
                    id="square-app-id"
                    value={squareConfig.application_id}
                    onChange={(e) => setSquareConfig(prev => ({ ...prev, application_id: e.target.value }))}
                    placeholder="Square Application ID"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="square-location-id">Location ID</Label>
                  <Input
                    id="square-location-id"
                    value={squareConfig.location_id}
                    onChange={(e) => setSquareConfig(prev => ({ ...prev, location_id: e.target.value }))}
                    placeholder="Square Location ID"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="square-access-token">Access Token</Label>
                <div className="relative">
                  <Input
                    id="square-access-token"
                    type={showSecrets.squareAccessToken ? 'text' : 'password'}
                    value={maskSecret(squareConfig.access_token, showSecrets.squareAccessToken)}
                    onChange={(e) => setSquareConfig(prev => ({ ...prev, access_token: e.target.value }))}
                    placeholder="Square Access Token"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => toggleSecretVisibility('squareAccessToken')}
                  >
                    {showSecrets.squareAccessToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <Button onClick={() => handleSaveConfiguration('square')} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                Save Square Configuration
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cashapp">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Cash App Configuration
                <div className="flex items-center gap-2">
                  <Switch
                    checked={gatewayStatus.cashapp}
                    onCheckedChange={(checked) => setGatewayStatus(prev => ({ ...prev, cashapp: checked }))}
                  />
                  <Badge variant={gatewayStatus.cashapp ? 'default' : 'secondary'}>
                    {gatewayStatus.cashapp ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardTitle>
              <CardDescription>
                Configure Cash App Pay for {environment} environment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cashapp-client-id">Client ID</Label>
                <div className="relative">
                  <Input
                    id="cashapp-client-id"
                    type={showSecrets.cashappClientId ? 'text' : 'password'}
                    value={maskSecret(cashappConfig.client_id, showSecrets.cashappClientId)}
                    onChange={(e) => setCashappConfig(prev => ({ ...prev, client_id: e.target.value }))}
                    placeholder="Cash App Client ID"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => toggleSecretVisibility('cashappClientId')}
                  >
                    {showSecrets.cashappClientId ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <Button onClick={() => handleSaveConfiguration('cashapp')} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                Save Cash App Configuration
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}