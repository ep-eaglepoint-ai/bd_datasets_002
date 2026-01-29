'use client';

import { GroceryList as GroceryListType, GroceryItem } from '@/types';

interface GroceryListProps {
  groceryList: GroceryListType | null;
  onTogglePurchased: (itemId: string, purchased: boolean) => void;
  onRemoveItem: (itemId: string) => void;
  onExport: (format: 'json' | 'csv') => void;
}

export default function GroceryList({
  groceryList,
  onTogglePurchased,
  onRemoveItem,
  onExport,
}: GroceryListProps) {
  if (!groceryList || groceryList.items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No grocery items. Generate a list from your meal plan!
      </div>
    );
  }

  const unpurchasedItems = groceryList.items.filter(item => !item.purchased);
  const purchasedItems = groceryList.items.filter(item => item.purchased);

  const formatQuantity = (item: GroceryItem): string => {
    if (item.quantity === 0 && !item.unit) return '';
    if (item.quantity === 0) return item.unit;
    if (!item.unit) return String(item.quantity);
    return `${item.quantity} ${item.unit}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-gray-900">
          {groceryList.items.length} items
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => onExport('json')}
            className="text-sm px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
          >
            Export JSON
          </button>
          <button
            onClick={() => onExport('csv')}
            className="text-sm px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Unpurchased Items */}
      {unpurchasedItems.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">To Buy</h4>
          <div className="space-y-1">
            {unpurchasedItems.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded"
              >
                <label className="flex items-center flex-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.purchased}
                    onChange={e => onTogglePurchased(item.id, e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-3">{item.name}</span>
                  {formatQuantity(item) && (
                    <span className="ml-2 text-sm text-gray-500">
                      ({formatQuantity(item)})
                    </span>
                  )}
                </label>
                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="text-red-500 hover:text-red-700 ml-2"
                >
                  X
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Purchased Items */}
      {purchasedItems.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Purchased</h4>
          <div className="space-y-1">
            {purchasedItems.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded"
              >
                <label className="flex items-center flex-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.purchased}
                    onChange={e => onTogglePurchased(item.id, e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-3 line-through text-gray-500">
                    {item.name}
                  </span>
                  {formatQuantity(item) && (
                    <span className="ml-2 text-sm text-gray-400">
                      ({formatQuantity(item)})
                    </span>
                  )}
                </label>
                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="text-red-400 hover:text-red-600 ml-2"
                >
                  X
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
