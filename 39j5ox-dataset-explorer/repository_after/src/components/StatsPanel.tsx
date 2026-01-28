'use client';

import { useDatasetStore } from '../store/dataset-store';
import { formatNumber } from '../lib/utils';
import { 
  BarChart3, 
  Database, 
  Hash, 
  Percent,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';

export function StatsPanel() {
  const { currentDataset, filteredData } = useDatasetStore();

  if (!currentDataset) {
    return (
      <div className="p-6 text-center">
        <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No dataset loaded</p>
      </div>
    );
  }

  const currentVersion = currentDataset.versions.find((v:any) => v.id === currentDataset.currentVersion);
  if (!currentVersion) return null;

  const totalRows = currentDataset.rawData.length;
  const filteredRows = filteredData.length;
  const filterPercentage = totalRows > 0 ? (filteredRows / totalRows) * 100 : 0;

  return (
    <div className="h-full overflow-auto scrollbar-thin">
      <div className="p-6 space-y-6">
        {/* Dataset Overview */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Dataset Overview
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-2xl font-bold">{formatNumber(totalRows)}</div>
              <div className="text-sm text-muted-foreground">Total Rows</div>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-2xl font-bold">{currentVersion.columns.length}</div>
              <div className="text-sm text-muted-foreground">Columns</div>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-2xl font-bold">{formatNumber(filteredRows)}</div>
              <div className="text-sm text-muted-foreground">Filtered Rows</div>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-2xl font-bold">{filterPercentage.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Data Shown</div>
            </div>
          </div>
        </div>

        {/* Column Statistics */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Column Statistics</h3>
          
          <div className="space-y-3">
            {currentVersion.columns.map((column) => (
              <div key={column.id} className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{column.name}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      column.type === 'number' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                      column.type === 'date' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      column.type === 'boolean' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                      column.type === 'categorical' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                    }`}>
                      {column.type}
                    </span>
                  </div>
                  
                  {column.unique && (
                    <span className="text-xs text-muted-foreground">Unique</span>
                  )}
                </div>

                {column.stats && (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Count:</span>
                      <span className="font-mono">{formatNumber(column.stats.count)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Unique:</span>
                      <span className="font-mono">{formatNumber(column.stats.uniqueCount)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Nulls:</span>
                      <span className="font-mono">{formatNumber(column.stats.nullCount)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Fill Rate:</span>
                      <span className="font-mono">
                        {((1 - column.stats.nullCount / column.stats.count) * 100).toFixed(1)}%
                      </span>
                    </div>

                    {/* Type-specific stats */}
                    {column.type === 'number' && column.stats.min !== undefined && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Min:</span>
                          <span className="font-mono">{formatNumber(Number(column.stats.min))}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Max:</span>
                          <span className="font-mono">{formatNumber(Number(column.stats.max))}</span>
                        </div>
                        
                        {column.stats.mean !== undefined && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Mean:</span>
                            <span className="font-mono">{formatNumber(column.stats.mean)}</span>
                          </div>
                        )}
                        
                        {column.stats.median !== undefined && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Median:</span>
                            <span className="font-mono">{formatNumber(column.stats.median)}</span>
                          </div>
                        )}
                      </>
                    )}

                    {(column.type === 'string' || column.type === 'categorical') && column.stats.mode && (
                      <div className="col-span-2">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Most Common:</span>
                          <span className="font-mono truncate ml-2" title={String(column.stats.mode)}>
                            {String(column.stats.mode)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Distribution preview for categorical data */}
                {column.stats?.distribution && Object.keys(column.stats.distribution).length <= 10 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="text-xs text-muted-foreground mb-2">Value Distribution:</div>
                    <div className="space-y-1">
                      {Object.entries(column.stats.distribution)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 5)
                        .map(([value, count]) => {
                          const percentage = (count / column.stats!.count) * 100;
                          return (
                            <div key={value} className="flex items-center justify-between text-xs">
                              <span className="truncate mr-2" title={value}>{value}</span>
                              <div className="flex items-center space-x-2">
                                <div className="w-16 bg-muted rounded-full h-1.5">
                                  <div 
                                    className="bg-primary h-1.5 rounded-full" 
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <span className="font-mono w-12 text-right">
                                  {percentage.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Data Quality Indicators */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Data Quality</h3>
          
          <div className="space-y-3">
            {currentVersion.columns.map((column) => {
              if (!column.stats) return null;
              
              const fillRate = (1 - column.stats.nullCount / column.stats.count) * 100;
              const uniquenessRate = (column.stats.uniqueCount / column.stats.count) * 100;
              
              return (
                <div key={column.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="font-medium">{column.name}</span>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      {fillRate >= 95 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : fillRate >= 80 ? (
                        <Minus className="h-4 w-4 text-yellow-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">{fillRate.toFixed(1)}% complete</span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{uniquenessRate.toFixed(1)}% unique</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}