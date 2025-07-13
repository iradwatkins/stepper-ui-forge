import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, CheckCircle, Loader2, AlertTriangle, Chrome, Info } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PWAInstallButtonProps {
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showText?: boolean;
  className?: string;
  showDebug?: boolean;
}

const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'ghost',
  size = 'sm',
  showText = true,
  className = '',
  showDebug = false,
}) => {
  const { 
    isInstallable, 
    isInstalled, 
    isInstalling, 
    install, 
    getInstallInstructions,
    deviceInfo,
    debugInfo,
    checkPWAReadiness
  } = usePWAInstall();

  const instructions = getInstallInstructions();

  // Hide on desktop unless explicitly requested
  if (deviceInfo.isMac || deviceInfo.isWindows || (!deviceInfo.isAndroid && !deviceInfo.isIOS)) {
    return showDebug ? null : null;
  }

  const handleDebugClick = () => {
    const readiness = checkPWAReadiness();
    console.table(readiness);
    
    // Enhanced debug output
    const debugOutput = {
      'PWA Status': {
        'Installable': isInstallable ? '✅' : '❌',
        'Installed': isInstalled ? '✅' : '❌',
        'Prompt Received': debugInfo.promptReceived ? '✅' : '❌',
      },
      'Device Info': {
        'Platform': deviceInfo.isAndroid ? 'Android' : 
                   deviceInfo.isIOS ? 'iOS' : 
                   deviceInfo.isMac ? 'macOS' : 
                   deviceInfo.isWindows ? 'Windows' : 'Unknown',
        'Browser': deviceInfo.isChrome ? `Chrome ${deviceInfo.chromeVersion}` : 
                  deviceInfo.isSafari ? 'Safari' : 
                  deviceInfo.isEdge ? 'Edge' : 
                  deviceInfo.isFirefox ? 'Firefox' : 'Other',
        'Install Support': instructions.canAutoInstall ? '✅ Auto' : '❌ Manual',
      },
      'Install Criteria': debugInfo.installCriteria,
      'Chrome Hints': debugInfo.chromeInstallHints,
    };
    
    alert(`PWA Debug Information:\n\n${JSON.stringify(debugOutput, null, 2)}`);
  };

  const handleInstallWithFeedback = async () => {
    if (!isInstallable && deviceInfo.isChrome) {
      // Show Chrome-specific guidance
      console.log('💡 Chrome Install Guidance:');
      debugInfo.chromeInstallHints.forEach(hint => console.log(`  - ${hint}`));
    }
    
    const success = await install();
    
    if (!success && deviceInfo.isChrome && !debugInfo.promptReceived) {
      console.log('🔧 Chrome Install Troubleshooting:');
      console.log('1. Refresh the page and wait 30 seconds');
      console.log('2. Interact with the page (click, scroll, navigate)');
      console.log('3. Check Chrome flags: chrome://flags/#enable-desktop-pwas');
      console.log('4. Ensure all PWA criteria are met');
    }
  };

  if (isInstalled) {
    return (
      <Button variant={variant} size={size} className={`${className} cursor-default`} disabled>
        <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
        {showText && <span>App Installed</span>}
      </Button>
    );
  }

  if (isInstalling) {
    return (
      <Button variant={variant} size={size} className={className} disabled>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        {showText && <span>Installing...</span>}
      </Button>
    );
  }

  if (isInstallable && instructions.canAutoInstall) {
    return (
      <Button 
        variant={variant} 
        size={size} 
        className={`${className} relative`}
        onClick={handleInstallWithFeedback}
        disabled={isInstalling}
      >
        <Download className="h-4 w-4 mr-2 animate-pulse" />
        {showText && <span>Install App</span>}
        {/* Installation ready indicator */}
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"></div>
      </Button>
    );
  }

  // Show dropdown with instructions for manual installation (mobile only)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Smartphone className="h-4 w-4 mr-2" />
          {showText && <span>Install App</span>}
          {/* Chrome-specific indicator */}
          {deviceInfo.isChrome && !debugInfo.promptReceived && (
            <Chrome className="h-3 w-3 ml-1 text-blue-500" />
          )}
          {!debugInfo.promptReceived && deviceInfo.isAndroid && (
            <AlertTriangle className="h-3 w-3 ml-1 text-orange-500" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <div className="p-4">
          <h4 className="font-medium text-sm mb-2 flex items-center">
            <Smartphone className="h-4 w-4 mr-2" />
            {instructions.title}
          </h4>
          
          {/* Chrome-specific status */}
          {deviceInfo.isChrome && (
            <Alert className={`mb-3 ${debugInfo.promptReceived ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <Chrome className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Chrome {deviceInfo.chromeVersion}:</strong> {' '}
                {debugInfo.promptReceived 
                  ? '✅ Install prompt available! Click install button above.'
                  : '⏳ Waiting for install prompt (may take 30+ seconds)'
                }
              </AlertDescription>
            </Alert>
          )}
          
          <ol className="text-xs text-gray-600 space-y-1 mb-3">
            {instructions.steps.map((step, index) => (
              <li key={index} className="flex items-start">
                <span className="bg-blue-100 text-blue-800 rounded-full w-4 h-4 flex items-center justify-center text-xs mr-2 mt-0.5 flex-shrink-0">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          
          {/* Chrome install criteria status */}
          {deviceInfo.isChrome && !isInstallable && (
            <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-3">
              <h5 className="text-xs font-medium text-blue-800 mb-1">Chrome Install Requirements:</h5>
              <div className="grid grid-cols-2 gap-1 text-xs">
                {Object.entries(debugInfo.installCriteria).map(([key, value]) => (
                  <div key={key} className="flex items-center">
                    <span className={value ? 'text-green-600' : 'text-red-600'}>
                      {value ? '✅' : '❌'}
                    </span>
                    <span className="ml-1 text-gray-700">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Chrome install hints */}
          {deviceInfo.isChrome && debugInfo.chromeInstallHints.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-3">
              <h5 className="text-xs font-medium text-yellow-800 mb-1 flex items-center">
                <Info className="h-3 w-3 mr-1" />
                Chrome Install Tips:
              </h5>
              <ul className="text-xs text-yellow-700 space-y-0.5">
                {debugInfo.chromeInstallHints.slice(0, 3).map((hint, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-yellow-600 mr-1">•</span>
                    {hint}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Installation status */}
          {!debugInfo.promptReceived && deviceInfo.isAndroid && (
            <div className="bg-orange-50 border border-orange-200 rounded p-2 mb-3">
              <p className="text-xs text-orange-700">
                <AlertTriangle className="h-3 w-3 inline mr-1" />
                Auto-install not available. Try manual installation above.
              </p>
            </div>
          )}
          
          {/* Quick device info */}
          <div className="text-xs text-gray-500 pt-2 border-t">
            <span>
              {deviceInfo.isAndroid ? '📱 Android' : 
               deviceInfo.isIOS ? '🍎 iOS' : 
               deviceInfo.isMac ? '💻 Mac' : 
               deviceInfo.isWindows ? '🖥️ Windows' : '📱 Device'} • {' '}
              {deviceInfo.isChrome ? `Chrome ${deviceInfo.chromeVersion}` : 
               deviceInfo.isSafari ? 'Safari' : 
               deviceInfo.isEdge ? 'Edge' : 
               deviceInfo.isFirefox ? 'Firefox' : 'Other Browser'}
              {instructions.canAutoInstall && ' • Auto-install supported'}
            </span>
          </div>
        </div>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleInstallWithFeedback}
          className="flex items-center"
          disabled={isInstalling}
        >
          <Download className="mr-2 h-4 w-4" />
          <span>{isInstalling ? 'Installing...' : 'Try Install Now'}</span>
        </DropdownMenuItem>
        
        {!deviceInfo.isChrome && !deviceInfo.isSafari && !deviceInfo.isEdge && (
          <DropdownMenuItem className="text-orange-600">
            <span className="text-xs">💡 Try Chrome, Safari, or Edge for better PWA support</span>
          </DropdownMenuItem>
        )}
        
        {showDebug && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDebugClick} className="text-gray-500">
              <span className="text-xs">Debug PWA Install</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default PWAInstallButton;