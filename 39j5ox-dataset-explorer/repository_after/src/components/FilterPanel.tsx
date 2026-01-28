'use client';

import { useState } from 'react';
import { useDatasetStore } from '../store/dataset-store';
import { Filter, FilterOperator } from '../types/dataset';
import { Button } from '../components/ui/Button';
import { 
  Plus, 
  X, 
  Filter as FilterIcon,
  Search,
  Calendar,
  Hash,
  Type,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { generateId } from '../lib/utils';

const OPERATORS: { value: FilterOperator; label: string; types: string[] }[] = [
  { value: 'equals', label: 'Equals', types: ['string', 'number', 'boolean', 'date', 'categorical'] },
  { value: 'not_equals', label: 'Not Equals', types: ['string', 'number', 'boolean', 'date', 'categorical'] },
  { value: 'contains', label: 'Contains', types: ['string', 'categorical'] },
  { value: 'not_contains', label: 'Does Not Contain', types: ['string', 'categorical'] },
  { value: 'starts_with', label: 'Starts With', types: ['string', 'categorical'] },
  { value: 'ends_with', label: 'Ends With', types: ['string', 'categorical'] },
  { value: 'greater_than', label: 'Greater Than', types: ['number', 'date'] },
  { value: 'less_than', label: 'Less Than', types: ['number', 'date'] },
  { value: 'greater_equal', label: 'Greater or Equal', types: ['number', 'date'] },
  { value: 'less_equal', label: 'Less or Equal', types: ['number', 'date'] },
  { value: 'is_null', label: 'Is Empty', types: ['string', 'number', 'boolean', 'date', 'categorical'] },
  { value: 'is_not_null', label: 'Is Not Empty', types: ['string', 'number', 'boolean', 'date', 'categorical'] },
  { value: 'regex', label: 'Matches Pattern', types: ['string', 'categorical'] },
];

export function FilterPanel() {
  const { currentDataset, addFilter, updateFilter, removeFilter, clearFilters } = useDatasetStore();
  const [isAddingFilter, setIsAddingFilter] = useState(false);
  const [newFilter, setNewFilter] = useState<Partial<Filter>>({
    columnId: '',
    operator: 'equals',
    value: '',
    enabled: true,
  });

  if (!currentDataset) {
    return (
      <div className="p-6 text-center">
        <FilterIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No dataset loaded</p>
      </div>
    );
  }

  const currentVersion = currentDataset.versions.find((v:any) => v.id === currentDataset.currentVersion);


  interface ColumnType {
    id: string;
    name: string;
    type: string;
  }
  if (!currentVersion) return null;

  const handleAddFilter = () => {
    if (!newFilter.columnId || !newFilter.operator) return;

    addFilter({
      columnId: newFilter.columnId,
      operator: newFilter.operator,
      value: newFilter.value,
      enabled: true,
    });

    setNewFilter({
      columnId: '',
      operator: 'equals',
      value: '',
      enabled: true,
    });
    setIsAddingFilter(false);
  };

  const getOperatorsForColumn = (columnId: string) => {
    const column = currentVersion.columns.find(c => c.id === columnId);
    if (!column) return OPERATORS;
    
    return OPERATORS.filter(op => op.types.includes(column.type));
  };

  const renderValueInput = (filter: Partial<Filter>, onChange: (value: any) => void) => {
    const column = currentVersion.columns.find(c => c.id === filter.columnId);
    if (!column) return null;

    if (filter.operator === 'is_null' || filter.operator === 'is_not_null') {
      return null; // No value input needed
    }

    switch (column.type) {
      case 'boolean':
        return (
          <select
            value={String(filter.value || 'true')}
            onChange={(e) => onChange(e.target.value === 'true')}
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
          >
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        );

      case 'number':
        return (
          <input
            type="number"
            value={filter.value || ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
            placeholder="Enter number..."
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground"
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={filter.value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
          />
        );

      case 'categorical':
        // For categorical, show a dropdown of unique values
        const uniqueValues = Array.from(
          new Set(
            currentDataset.processedData
              .map(row => row[column.name])
              .filter(v => v !== null && v !== undefined && v !== '')
          )
        ).slice(0, 100); // Limit to first 100 unique values

        return (
          <select
            value={filter.value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
          >
            <option value="">Select value...</option>
            {uniqueValues.map((value) => (
              <option key={String(value)} value={String(value)}>
                {String(value)}
              </option>
            ))}
          </select>
        );

      default:
        return (
          <input
            type="text"
            value={filter.value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter value..."
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground"
          />
        );
    }
  };

  return (
    <div className="h-full overflow-auto scrollbar-thin">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center">
            <FilterIcon className="h-5 w-5 mr-2" />
            Filters
          </h3>
          
          <div className="flex items-center space-x-2">
            {currentVersion.filters.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
              >
                Clear All
              </Button>
            )}
            
            <Button
              size="sm"
              onClick={() => setIsAddingFilter(true)}
              disabled={isAddingFilter}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Filter
            </Button>
          </div>
        </div>

        {/* Active Filters */}
        {currentVersion.filters.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">Active Filters</h4>
            
            {currentVersion.filters.map((filter) => {
              const column = currentVersion.columns.find(c => c.id === filter.columnId);
              if (!column) return null;

              return (
                <div key={filter.id} className="border border-border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => updateFilter(filter.id, { enabled: !filter.enabled })}
                      >
                        {filter.enabled ? (
                          <ToggleRight className="h-4 w-4 text-primary" />
                        ) : (
                          <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                      
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
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeFilter(filter.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Operator</label>
                      <select
                        value={filter.operator}
                        onChange={(e) => updateFilter(filter.id, { operator: e.target.value as FilterOperator })}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm"
                      >
                        {getOperatorsForColumn(filter.columnId).map((op) => (
                          <option key={op.value} value={op.value}>
                            {op.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {filter.operator !== 'is_null' && filter.operator !== 'is_not_null' && (
                      <div>
                        <label className="text-xs text-muted-foreground">Value</label>
                        {renderValueInput(filter, (value) => updateFilter(filter.id, { value }))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add New Filter */}
        {isAddingFilter && (
          <div className="border border-border rounded-lg p-4 space-y-4 bg-muted/20">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Add New Filter</h4>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsAddingFilter(false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Column</label>
                <select
                  value={newFilter.columnId || ''}
                  onChange={(e) => setNewFilter({ ...newFilter, columnId: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                >
                  <option value="">Select column...</option>
                  {currentVersion.columns.map((column) => (
                    <option key={column.id} value={column.id}>
                      {column.name} ({column.type})
                    </option>
                  ))}
                </select>
              </div>

              {newFilter.columnId && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Operator</label>
                    <select
                      value={newFilter.operator || 'equals'}
                      onChange={(e) => setNewFilter({ ...newFilter, operator: e.target.value as FilterOperator })}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                    >
                      {getOperatorsForColumn(newFilter.columnId).map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {newFilter.operator !== 'is_null' && newFilter.operator !== 'is_not_null' && (
                    <div>
                      <label className="text-xs text-muted-foreground">Value</label>
                      {renderValueInput(newFilter, (value) => setNewFilter({ ...newFilter, value }))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingFilter(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddFilter}
                  disabled={!newFilter.columnId || !newFilter.operator}
                >
                  Add Filter
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Filter Summary */}
        {currentVersion.filters.length === 0 && !isAddingFilter && (
          <div className="text-center py-8">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">No filters applied</p>
            <p className="text-sm text-muted-foreground">
              Add filters to narrow down your data and focus on specific subsets
            </p>
          </div>
        )}
      </div>
    </div>
  );
}