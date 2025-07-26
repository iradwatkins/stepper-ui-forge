/**
 * Event Creation Debug Panel
 * 
 * Development tool for monitoring centralized state, field ownership,
 * and race conditions in the event creation wizard.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  AlertTriangle, 
  Eye, 
  EyeOff, 
  Clock, 
  Users, 
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Bug
} from 'lucide-react';
import { useEventCreationDebug } from '@/contexts/EventCreationContext';

export function EventCreationDebugPanel() {
  const {
    conflicts,
    isUpdating,
    pendingUpdates,
    lastSyncTime,
    fieldOwnership,
    recentUpdates,
    clearConflicts,
    getFieldHistory
  } = useEventCreationDebug();

  const [isVisible, setIsVisible] = useState(process.env.NODE_ENV === 'development');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    ownership: true,
    conflicts: true,
    updates: false,
    history: false,
  });

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsVisible(true)}
          className="bg-white shadow-lg border-orange-200"
        >
          <Bug className="w-4 h-4 mr-1" />
          Debug
        </Button>
      </div>
    );
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const hasActiveConflicts = conflicts.length > 0;
  const hasActiveOwnership = Object.values(fieldOwnership).some(owner => owner !== null);

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-[70vh] overflow-hidden">
      <Card className="bg-white shadow-xl border-2 border-orange-200">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bug className="w-4 h-4 text-orange-600" />
              Event Creation Debug
              {hasActiveConflicts && (
                <Badge variant="destructive" className="text-xs">
                  {conflicts.length} conflicts
                </Badge>
              )}
              {isUpdating && (
                <RefreshCw className="w-3 h-3 animate-spin text-blue-500" />
              )}
            </CardTitle>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsVisible(false)}
            >
              <EyeOff className="w-4 h-4" />
            </Button>
          </div>
          <CardDescription className="text-xs">
            Last sync: {lastSyncTime ? lastSyncTime.toLocaleTimeString() : 'Never'}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-3 space-y-3 max-h-[50vh] overflow-y-auto">
          {/* Field Ownership */}
          <Collapsible 
            open={expandedSections.ownership} 
            onOpenChange={() => toggleSection('ownership')}
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
              {expandedSections.ownership ? 
                <ChevronDown className="w-3 h-3" /> : 
                <ChevronRight className="w-3 h-3" />
              }
              <span className="text-sm font-medium">Field Ownership</span>
              {hasActiveOwnership && (
                <Badge variant="secondary" className="text-xs">
                  {Object.values(fieldOwnership).filter(Boolean).length} claimed
                </Badge>
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="space-y-1">
                {Object.entries(fieldOwnership).map(([field, owner]) => (
                  <div key={field} className="flex items-center justify-between text-xs">
                    <span className="font-mono">{field}</span>
                    <Badge 
                      variant={owner ? "default" : "outline"} 
                      className="text-xs"
                    >
                      {owner || 'unclaimed'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Conflicts */}
          <Collapsible 
            open={expandedSections.conflicts} 
            onOpenChange={() => toggleSection('conflicts')}
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
              {expandedSections.conflicts ? 
                <ChevronDown className="w-3 h-3" /> : 
                <ChevronRight className="w-3 h-3" />
              }
              <span className="text-sm font-medium">Conflicts</span>
              {hasActiveConflicts && (
                <AlertTriangle className="w-3 h-3 text-red-500" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              {conflicts.length === 0 ? (
                <div className="text-xs text-green-600">No conflicts detected</div>
              ) : (
                <div className="space-y-1">
                  {conflicts.map((conflict, index) => (
                    <div key={index} className="text-xs p-2 bg-red-50 border border-red-200 rounded">
                      {conflict}
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={clearConflicts}
                    className="w-full mt-2 h-6 text-xs"
                  >
                    Clear Conflicts
                  </Button>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Pending Updates */}
          {pendingUpdates.length > 0 && (
            <div className="p-2 bg-blue-50 border border-blue-200 rounded">
              <div className="text-xs font-medium text-blue-800 mb-1">
                Pending Updates ({pendingUpdates.length})
              </div>
              <div className="space-y-1">
                {pendingUpdates.map((update, index) => (
                  <Badge key={index} variant="secondary" className="text-xs mr-1">
                    {update}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Recent Updates */}
          <Collapsible 
            open={expandedSections.updates} 
            onOpenChange={() => toggleSection('updates')}
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
              {expandedSections.updates ? 
                <ChevronDown className="w-3 h-3" /> : 
                <ChevronRight className="w-3 h-3" />
              }
              <span className="text-sm font-medium">Recent Updates</span>
              <Badge variant="outline" className="text-xs">
                {recentUpdates.length}
              </Badge>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 max-h-32 overflow-y-auto">
              <div className="space-y-1">
                {recentUpdates.slice().reverse().map((update, index) => (
                  <div key={index} className="text-xs p-2 bg-gray-50 border rounded">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {update.component}
                      </Badge>
                      <span className="font-mono">{update.field}</span>
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-gray-500">
                        {update.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="font-mono text-xs text-gray-600 truncate">
                      {JSON.stringify(update.value).slice(0, 50)}...
                    </div>
                  </div>
                ))}
                {recentUpdates.length === 0 && (
                  <div className="text-xs text-gray-500">No updates yet</div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Field History */}
          <Collapsible 
            open={expandedSections.history} 
            onOpenChange={() => toggleSection('history')}
          >
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
              {expandedSections.history ? 
                <ChevronDown className="w-3 h-3" /> : 
                <ChevronRight className="w-3 h-3" />
              }
              <span className="text-sm font-medium">Field History</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="space-y-2">
                {['venueLayoutId', 'seats', 'seatCategories'].map(field => {
                  const history = getFieldHistory(field);
                  return (
                    <div key={field} className="text-xs">
                      <div className="font-medium font-mono">{field}</div>
                      {history.length === 0 ? (
                        <div className="text-gray-500 ml-2">No changes</div>
                      ) : (
                        <div className="ml-2 space-y-1">
                          {history.slice(-3).map((entry, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {entry.component}
                              </Badge>
                              <span className="text-gray-500">
                                {entry.timestamp.toLocaleTimeString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </div>
  );
}

// Only show in development
export function EventCreationDebugPanelWrapper() {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return <EventCreationDebugPanel />;
}