import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export interface PWAInstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  isInstalling: boolean;
  deferredPrompt: any;
  deviceInfo: {
    isAndroid: boolean;
    isIOS: boolean;
    isMac: boolean;
    isWindows: boolean;
    isChrome: boolean;
    isSafari: boolean;
    isEdge: boolean;
    isFirefox: boolean;
    chromeVersion: number | null;
  };
  debugInfo: {
    hasServiceWorker: boolean;
    hasManifest: boolean;
    isHTTPS: boolean;
    promptReceived: boolean;
    installCriteria: {
      hasServiceWorker: boolean;
      hasManifest: boolean;
      isSecure: boolean;
      hasValidIcons: boolean;
      hasStartUrl: boolean;
      notInstalled: boolean;
      chromeVersion: boolean;
      userEngagement: boolean;
    };
    chromeInstallHints: string[];
  };
}

export const usePWAInstall = () => {
  const [state, setState] = useState<PWAInstallState>({
    isInstallable: false,
    isInstalled: false,
    isInstalling: false,
    deferredPrompt: null,
    deviceInfo: {
      isAndroid: false,
      isIOS: false,
      isMac: false,
      isWindows: false,
      isChrome: false,
      isSafari: false,
      isEdge: false,
      isFirefox: false,
      chromeVersion: null,
    },
    debugInfo: {
      hasServiceWorker: false,
      hasManifest: false,
      isHTTPS: false,
      promptReceived: false,
      installCriteria: {
        hasServiceWorker: false,
        hasManifest: false,
        isSecure: false,
        hasValidIcons: false,
        hasStartUrl: false,
        notInstalled: false,
        chromeVersion: false,
        userEngagement: false,
      },
      chromeInstallHints: [],
    },
  });

  useEffect(() => {
    // Enhanced device and browser detection
    const userAgent = navigator.userAgent.toLowerCase();
    
    // Extract Chrome version
    const chromeMatch = userAgent.match(/chrome\/(\d+)/);
    const chromeVersion = chromeMatch ? parseInt(chromeMatch[1]) : null;
    
    const deviceInfo = {
      isAndroid: userAgent.includes('android'),
      isIOS: /ipad|iphone|ipod/.test(userAgent),
      isMac: userAgent.includes('mac') && !userAgent.includes('iphone') && !userAgent.includes('ipad'),
      isWindows: userAgent.includes('windows'),
      isChrome: userAgent.includes('chrome') && !userAgent.includes('edg') && !userAgent.includes('opr'),
      isSafari: userAgent.includes('safari') && !userAgent.includes('chrome'),
      isEdge: userAgent.includes('edg'),
      isFirefox: userAgent.includes('firefox'),
      chromeVersion,
    };

    // Check PWA installation criteria
    const hasServiceWorker = 'serviceWorker' in navigator;
    const hasManifest = !!document.querySelector('link[rel="manifest"]') || !!document.querySelector('link[rel="manifest.json"]');
    const isSecure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    const hasValidIcons = true; // Icons are available
    const hasStartUrl = true; // Start URL is defined in manifest
    const notInstalled = !window.matchMedia('(display-mode: standalone)').matches && !(navigator as any).standalone;
    const chromeVersionOk = !deviceInfo.isChrome || (chromeVersion && chromeVersion >= 68);
    
    // Enhanced user engagement checking
    const userEngagement = sessionStorage.getItem('pwa-engagement') === 'true' || 
                          localStorage.getItem('pwa-visited') === 'true' ||
                          sessionStorage.getItem('user-interacted') === 'true';
    
    // Mark page visit
    localStorage.setItem('pwa-visited', 'true');

    const installCriteria = {
      hasServiceWorker,
      hasManifest,
      isSecure,
      hasValidIcons,
      hasStartUrl,
      notInstalled,
      chromeVersion: chromeVersionOk,
      userEngagement,
    };

    // Generate Chrome-specific install hints
    const chromeInstallHints: string[] = [];
    
    if (!deviceInfo.isChrome) {
      chromeInstallHints.push('Use Chrome browser for best PWA support');
    } else {
      if (!chromeVersionOk) {
        chromeInstallHints.push(`Chrome ${chromeVersion} detected - need Chrome 68+ for PWA install`);
      }
      if (!hasServiceWorker) {
        chromeInstallHints.push('Service Worker not supported');
      }
      if (!hasManifest) {
        chromeInstallHints.push('Web App Manifest not found - check link tags');
      }
      if (!isSecure) {
        chromeInstallHints.push('HTTPS required for PWA installation');
      }
      if (!notInstalled) {
        chromeInstallHints.push('App appears to be already installed');
      }
      if (!userEngagement) {
        chromeInstallHints.push('User engagement threshold not met - interact with the page');
      }
      
      // Check if all criteria are met
      const allCriteriaMet = Object.values(installCriteria).every(Boolean);
      if (allCriteriaMet && !state.debugInfo.promptReceived) {
        chromeInstallHints.push('✅ All criteria met - waiting for Chrome to show install prompt');
        chromeInstallHints.push('This can take 30+ seconds. Try refreshing or interacting more.');
      }
    }

    const debugInfo = {
      hasServiceWorker,
      hasManifest,
      isHTTPS: isSecure,
      promptReceived: false,
      installCriteria,
      chromeInstallHints,
    };

    console.log('🔍 PWA Install Hook Debug:', {
      deviceInfo,
      debugInfo,
      userAgent,
      location: window.location.href,
      chromeVersion,
      allCriteriaMet: Object.values(installCriteria).every(Boolean),
    });

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      console.log('🎯 beforeinstallprompt event received');
      setState(prev => ({
        ...prev,
        deferredPrompt: e,
        isInstallable: true,
        debugInfo: { 
          ...prev.debugInfo, 
          promptReceived: true,
          chromeInstallHints: ['✅ Install prompt available - Chrome is ready!'],
        },
      }));
      
      // Show success notification
      if (deviceInfo.isChrome || deviceInfo.isAndroid) {
        toast.success('🎉 App Ready to Install!', {
          description: 'Chrome detected the app can be installed. Click the install button!',
          duration: 8000,
        });
      }
    };

    const handleAppInstalled = () => {
      console.log('🎉 appinstalled event received');
      setState(prev => ({
        ...prev,
        isInstalled: true,
        isInstalling: false,
        isInstallable: false,
        deferredPrompt: null,
      }));
      
      toast.success('🎉 App installed successfully!', {
        description: 'SteppersLife is now available on your device!',
        duration: 10000,
      });
    };

    // Check if already installed with enhanced detection
    const checkIfInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (navigator as any).standalone === true;
      const isInstalled = isStandalone || isIOSStandalone;
      
      if (isInstalled) {
        console.log('✅ PWA is already installed');
        toast.success('✅ App is already installed!', {
          description: 'Running in standalone mode',
        });
      }
      
      setState(prev => ({
        ...prev,
        isInstalled,
        deviceInfo,
        debugInfo: { ...debugInfo, promptReceived: prev.debugInfo.promptReceived },
      }));
    };

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    
    // Initial check
    checkIfInstalled();
    
    // Track user interaction
    const markEngagement = () => {
      sessionStorage.setItem('user-interacted', 'true');
      sessionStorage.setItem('pwa-engagement', 'true');
    };
    
    window.addEventListener('click', markEngagement, { once: true });
    window.addEventListener('scroll', markEngagement, { once: true });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('click', markEngagement);
      window.removeEventListener('scroll', markEngagement);
    };
  }, []);

  const install = async (): Promise<boolean> => {
    if (state.isInstalling) {
      console.log('⏳ Installation already in progress...');
      return false;
    }

    console.log('🚀 Starting PWA installation process...');
    setState(prev => ({ ...prev, isInstalling: true }));

    try {
      // Check if we have a deferred prompt
      const prompt = state.deferredPrompt;
      
      if (!prompt) {
        console.log('❌ No deferred prompt available for installation');
        
        // In development mode, provide helpful guidance
        if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
          console.log('💡 Development mode detected - install prompts may not work on localhost');
          toast.info('Development Mode', {
            description: 'PWA install prompts don\'t work on localhost. Try production build.',
            duration: 8000,
          });
        } else {
          toast.error('Installation Not Available', {
            description: 'The app doesn\'t meet PWA installation criteria yet. Try interacting more with the page.',
            duration: 5000,
          });
        }
        return false;
      }

      console.log('✅ Deferred prompt available, showing installation dialog...');
      
      // Show the install prompt
      const result = await prompt.prompt();
      console.log('📱 User installation choice:', result);

      if (result.outcome === 'accepted') {
        console.log('🎉 User accepted the installation!');
        
        setState(prev => ({
          ...prev,
          isInstalling: false,
          isInstalled: true,
          isInstallable: false,
          deferredPrompt: null,
        }));

        toast.success('🎉 App Installed!', {
          description: 'The SteppersLife app has been installed successfully!',
          duration: 5000,
        });

        return true;
      } else {
        console.log('❌ User dismissed the installation');
        
        toast.info('Installation Cancelled', {
          description: 'You can install the app later from your browser\'s menu.',
          duration: 3000,
        });

        return false;
      }
    } catch (error) {
      console.error('❌ Installation failed:', error);
      
      toast.error('Installation Failed', {
        description: 'There was an error installing the app. Please try again.',
        duration: 5000,
      });

      return false;
    } finally {
      setState(prev => ({ ...prev, isInstalling: false }));
    }
  };

  const getInstallInstructions = () => {
    const { isAndroid, isIOS, isMac, isWindows, isChrome, isSafari, isEdge } = state.deviceInfo;

    if (isAndroid && isChrome) {
      return {
        title: "Install from Chrome Android",
        steps: ["Look for install icon in address bar", "Tap 'Add to Home screen'", "Tap 'Install' or 'Add'"],
        canAutoInstall: true,
      };
    } else if (isAndroid) {
      return {
        title: "Install on Android",
        steps: ["Open this page in Chrome", "Look for install prompt or menu option", "Tap 'Add to Home screen'"],
        canAutoInstall: false,
      };
    } else if (isIOS && isSafari) {
      return {
        title: "Install from Safari iOS",
        steps: ["Tap the Share button (□↗)", "Select 'Add to Home Screen'", "Tap 'Add'"],
        canAutoInstall: false,
      };
    } else if (isIOS) {
      return {
        title: "Install on iPhone/iPad",
        steps: ["Open this page in Safari", "Tap Share → 'Add to Home Screen'", "Tap 'Add'"],
        canAutoInstall: false,
      };
    } else if ((isMac || isWindows) && isChrome) {
      return {
        title: "Install from Chrome Desktop",
        steps: ["Look for install icon in address bar (⊕)", "Click 'Install SteppersLife'", "Confirm installation"],
        canAutoInstall: true,
      };
    } else if ((isMac || isWindows) && isEdge) {
      return {
        title: "Install from Edge",
        steps: ["Look for app install icon in address bar", "Click 'Install SteppersLife'", "Confirm installation"],
        canAutoInstall: true,
      };
    } else {
      return {
        title: "Install PWA",
        steps: ["Use Chrome/Safari/Edge for best experience", "Look for install options in browser menu", "Follow browser-specific installation steps"],
        canAutoInstall: false,
      };
    }
  };

  // Enhanced debug function with Chrome-specific guidance
  const checkPWAReadiness = () => {
    const criteria = state.debugInfo.installCriteria;
    const allMet = Object.values(criteria).every(Boolean);
    
    const readiness = {
      ready: allMet,
      criteria,
      missing: Object.entries(criteria)
        .filter(([, value]) => !value)
        .map(([key]) => key),
      deviceInfo: state.deviceInfo,
      debugInfo: state.debugInfo,
      environment: {
        isDevelopment: location.hostname === 'localhost' || location.hostname === '127.0.0.1',
        isHTTPS: location.protocol === 'https:',
        hostname: location.hostname,
        protocol: location.protocol,
      },
      recommendations: [] as string[],
    };
    
    // Add development-specific recommendations
    if (readiness.environment.isDevelopment) {
      readiness.recommendations.push('🛠️ Development mode: Install prompts may not work on localhost');
      readiness.recommendations.push('📦 Try production build: npm run build && npm run preview');
      readiness.recommendations.push('🌐 For full testing: Use HTTPS or deploy to production');
    }
    
    if (!readiness.ready) {
      if (!criteria.hasServiceWorker) {
        readiness.recommendations.push('Service Worker not registered - check main.tsx');
      }
      if (!criteria.hasManifest) {
        readiness.recommendations.push('Web App Manifest not found - check index.html link tags');
      }
      if (!criteria.isSecure) {
        readiness.recommendations.push('HTTPS required for PWA - use production deployment');
      }
      if (!criteria.userEngagement) {
        readiness.recommendations.push('Interact more with the page - scroll, click, navigate');
      }
      if (!criteria.chromeVersion) {
        readiness.recommendations.push(`Chrome ${state.deviceInfo.chromeVersion} detected - need Chrome 68+`);
      }
    } else if (!state.debugInfo.promptReceived) {
      readiness.recommendations.push('All criteria met - waiting for browser to show install prompt');
      readiness.recommendations.push('This can take 30+ seconds in Chrome');
    }
    
    console.log('🔍 PWA Readiness Check:', readiness);
    return readiness;
  };

  return {
    ...state,
    install,
    getInstallInstructions,
    checkPWAReadiness,
  };
};