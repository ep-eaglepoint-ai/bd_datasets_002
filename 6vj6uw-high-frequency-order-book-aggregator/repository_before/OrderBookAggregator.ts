// filename: OrderBookAggregator.ts

/**
 * @typedef {Object} OrderUpdate
 * @property {string} side - 'buy' or 'sell'
 * @property {number} price - The limit price
 * @property {number} quantity - The volume at this price
 */

// Import provides low-level math utilities for decimal precision
import { Decimal } from './math-utils'; // Provides .add(), .sub(), and precision-safe comparison

export class OrderBookAggregator {
  private bids: any[] = [];
  private asks: any[] = [];

  /**
   * Processes a new order update. Current implementation uses native arrays 
   * and object literal recreation which is causing GC pressure.
   */
  public handleUpdate(update: { side: string; price: number; quantity: number }): void {
    const targetBook = update.side === 'buy' ? this.bids : this.asks;
    
    // Finding the price level (O(N) search)
    const existingLevelIndex = targetBook.findIndex(level => level.price === update.price);

    if (update.quantity === 0) {
      if (existingLevelIndex !== -1) {
        targetBook.splice(existingLevelIndex, 1);
      }
    } else {
      if (existingLevelIndex !== -1) {
        targetBook[existingLevelIndex].quantity = update.quantity;
      } else {
        targetBook.push({ price: update.price, quantity: update.quantity });
      }
    }

    // Sorting the book after every update (O(N log N))
    targetBook.sort((a, b) => update.side === 'buy' ? b.price - a.price : a.price - b.price);
  }

  public getTopLevels(depth: number): any {
    return {
      bids: this.bids.slice(0, depth),
      asks: this.asks.slice(0, depth)
    };
  }
}