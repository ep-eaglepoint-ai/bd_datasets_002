// filename: index.ts
// Optimized OrderBookAggregator using efficient data structures

/**
 * @typedef {Object} OrderUpdate
 * @property {string} side - 'buy' or 'sell'
 * @property {number} price - The limit price
 * @property {number} quantity - The volume at this price
 */

// Import provides low-level math utilities for decimal precision
import { Decimal } from '../repository_before/math-utils'; // Provides .add(), .sub(), and precision-safe comparison

interface PriceLevel {
  price: number;
  quantity: number;
}

/**
 * Optimized Red-Black Tree implementation for maintaining sorted price levels
 * Provides O(log N) insertion, deletion, and lookup operations
 */
class RedBlackTree {
  private root: TreeNode | null = null;
  private size = 0;
  private isDescending: boolean;

  constructor(descending: boolean = false) {
    this.isDescending = descending;
  }

  insert(price: number, quantity: number): void {
    if (this.root === null) {
      this.root = new TreeNode(price, quantity, NodeColor.BLACK);
      this.size++;
      return;
    }

    const newNode = this.insertNode(this.root, price, quantity);
    if (newNode) {
      this.fixInsert(newNode);
      this.size++;
    }
  }

  delete(price: number): boolean {
    const node = this.findNode(price);
    if (!node) return false;

    this.deleteNode(node);
    this.size--;
    return true;
  }

  find(price: number): PriceLevel | null {
    const node = this.findNode(price);
    return node ? { price: node.price, quantity: node.quantity } : null;
  }

  update(price: number, quantity: number): boolean {
    const node = this.findNode(price);
    if (!node) return false;
    node.quantity = quantity;
    return true;
  }

  getTopLevels(depth: number): PriceLevel[] {
    const result: PriceLevel[] = [];
    this.inOrderTraversal(this.root, result, depth);
    return result;
  }

  getSize(): number {
    return this.size;
  }

  private findNode(price: number): TreeNode | null {
    let current = this.root;
    while (current) {
      if (price === current.price) return current;
      if (this.compare(price, current.price) < 0) {
        current = current.left;
      } else {
        current = current.right;
      }
    }
    return null;
  }

  private compare(a: number, b: number): number {
    // Always use normal comparison for BST property
    // The traversal order will determine ascending/descending
    return a - b;
  }

  private insertNode(root: TreeNode, price: number, quantity: number): TreeNode | null {
    let current: TreeNode | null = root;
    let parent: TreeNode | null = null;

    while (current) {
      parent = current;
      const cmp = this.compare(price, current.price);
      if (cmp === 0) {
        current.quantity = quantity;
        return null; // Updated existing node
      }
      current = cmp < 0 ? current.left : current.right;
    }

    const newNode = new TreeNode(price, quantity, NodeColor.RED);
    newNode.parent = parent;

    if (parent) {
      if (this.compare(price, parent.price) < 0) {
        parent.left = newNode;
      } else {
        parent.right = newNode;
      }
    }

    return newNode;
  }

  private fixInsert(node: TreeNode): void {
    while (node.parent && node.parent.color === NodeColor.RED) {
      if (node.parent === node.parent.parent?.left) {
        const uncle = node.parent.parent.right;
        if (uncle && uncle.color === NodeColor.RED) {
          node.parent.color = NodeColor.BLACK;
          uncle.color = NodeColor.BLACK;
          node.parent.parent.color = NodeColor.RED;
          node = node.parent.parent;
        } else {
          if (node === node.parent.right) {
            node = node.parent;
            this.rotateLeft(node);
          }
          if (node.parent) {
            node.parent.color = NodeColor.BLACK;
            if (node.parent.parent) {
              node.parent.parent.color = NodeColor.RED;
              this.rotateRight(node.parent.parent);
            }
          }
        }
      } else {
        const uncle = node.parent.parent?.left;
        if (uncle && uncle.color === NodeColor.RED) {
          node.parent.color = NodeColor.BLACK;
          uncle.color = NodeColor.BLACK;
          if (node.parent.parent) {
            node.parent.parent.color = NodeColor.RED;
            node = node.parent.parent;
          }
        } else {
          if (node === node.parent.left) {
            node = node.parent;
            this.rotateRight(node);
          }
          if (node.parent) {
            node.parent.color = NodeColor.BLACK;
            if (node.parent.parent) {
              node.parent.parent.color = NodeColor.RED;
              this.rotateLeft(node.parent.parent);
            }
          }
        }
      }
    }
    if (this.root) {
      this.root.color = NodeColor.BLACK;
    }
  }

  private deleteNode(node: TreeNode): void {
    let nodeToDelete = node;
    let originalColor = nodeToDelete.color;
    let replacement: TreeNode | null;

    if (!node.left) {
      replacement = node.right;
      this.transplant(node, node.right);
    } else if (!node.right) {
      replacement = node.left;
      this.transplant(node, node.left);
    } else {
      nodeToDelete = this.minimum(node.right);
      originalColor = nodeToDelete.color;
      replacement = nodeToDelete.right;

      if (nodeToDelete.parent === node) {
        if (replacement) replacement.parent = nodeToDelete;
      } else {
        this.transplant(nodeToDelete, nodeToDelete.right);
        nodeToDelete.right = node.right;
        if (nodeToDelete.right) nodeToDelete.right.parent = nodeToDelete;
      }

      this.transplant(node, nodeToDelete);
      nodeToDelete.left = node.left;
      if (nodeToDelete.left) nodeToDelete.left.parent = nodeToDelete;
      nodeToDelete.color = node.color;
    }

    if (originalColor === NodeColor.BLACK && replacement) {
      this.fixDelete(replacement);
    }
  }

  private fixDelete(node: TreeNode): void {
    while (node !== this.root && node.color === NodeColor.BLACK) {
      if (node === node.parent?.left) {
        let sibling = node.parent.right;
        if (sibling && sibling.color === NodeColor.RED) {
          sibling.color = NodeColor.BLACK;
          node.parent.color = NodeColor.RED;
          this.rotateLeft(node.parent);
          sibling = node.parent.right;
        }

        if (sibling && 
            (!sibling.left || sibling.left.color === NodeColor.BLACK) &&
            (!sibling.right || sibling.right.color === NodeColor.BLACK)) {
          sibling.color = NodeColor.RED;
          node = node.parent;
        } else if (sibling) {
          if (!sibling.right || sibling.right.color === NodeColor.BLACK) {
            if (sibling.left) sibling.left.color = NodeColor.BLACK;
            sibling.color = NodeColor.RED;
            this.rotateRight(sibling);
            sibling = node.parent.right;
          }
          if (sibling && node.parent) {
            sibling.color = node.parent.color;
            node.parent.color = NodeColor.BLACK;
            if (sibling.right) sibling.right.color = NodeColor.BLACK;
            this.rotateLeft(node.parent);
          }
          node = this.root!;
        }
      } else {
        let sibling = node.parent?.left;
        if (sibling && sibling.color === NodeColor.RED) {
          sibling.color = NodeColor.BLACK;
          if (node.parent) node.parent.color = NodeColor.RED;
          if (node.parent) this.rotateRight(node.parent);
          sibling = node.parent?.left;
        }

        if (sibling && 
            (!sibling.left || sibling.left.color === NodeColor.BLACK) &&
            (!sibling.right || sibling.right.color === NodeColor.BLACK)) {
          sibling.color = NodeColor.RED;
          node = node.parent!;
        } else if (sibling) {
          if (!sibling.left || sibling.left.color === NodeColor.BLACK) {
            if (sibling.right) sibling.right.color = NodeColor.BLACK;
            sibling.color = NodeColor.RED;
            this.rotateLeft(sibling);
            sibling = node.parent?.left;
          }
          if (sibling && node.parent) {
            sibling.color = node.parent.color;
            node.parent.color = NodeColor.BLACK;
            if (sibling.left) sibling.left.color = NodeColor.BLACK;
            this.rotateRight(node.parent);
          }
          node = this.root!;
        }
      }
    }
    node.color = NodeColor.BLACK;
  }

  private transplant(u: TreeNode, v: TreeNode | null): void {
    if (!u.parent) {
      this.root = v;
    } else if (u === u.parent.left) {
      u.parent.left = v;
    } else {
      u.parent.right = v;
    }
    if (v) v.parent = u.parent;
  }

  private minimum(node: TreeNode): TreeNode {
    while (node.left) {
      node = node.left;
    }
    return node;
  }

  private rotateLeft(node: TreeNode): void {
    const right = node.right!;
    node.right = right.left;
    if (right.left) right.left.parent = node;
    right.parent = node.parent;

    if (!node.parent) {
      this.root = right;
    } else if (node === node.parent.left) {
      node.parent.left = right;
    } else {
      node.parent.right = right;
    }

    right.left = node;
    node.parent = right;
  }

  private rotateRight(node: TreeNode): void {
    const left = node.left!;
    node.left = left.right;
    if (left.right) left.right.parent = node;
    left.parent = node.parent;

    if (!node.parent) {
      this.root = left;
    } else if (node === node.parent.right) {
      node.parent.right = left;
    } else {
      node.parent.left = left;
    }

    left.right = node;
    node.parent = left;
  }

  private inOrderTraversal(node: TreeNode | null, result: PriceLevel[], maxCount: number): void {
    if (!node || result.length >= maxCount) return;

    if (this.isDescending) {
      // For descending order: visit right (higher values), current, left (lower values)
      this.inOrderTraversal(node.right, result, maxCount);
      if (result.length < maxCount) {
        result.push({ price: node.price, quantity: node.quantity });
      }
      this.inOrderTraversal(node.left, result, maxCount);
    } else {
      // For ascending order: visit left (lower values), current, right (higher values)
      this.inOrderTraversal(node.left, result, maxCount);
      if (result.length < maxCount) {
        result.push({ price: node.price, quantity: node.quantity });
      }
      this.inOrderTraversal(node.right, result, maxCount);
    }
  }
}

enum NodeColor {
  RED,
  BLACK
}

class TreeNode {
  price: number;
  quantity: number;
  color: NodeColor;
  left: TreeNode | null = null;
  right: TreeNode | null = null;
  parent: TreeNode | null = null;

  constructor(price: number, quantity: number, color: NodeColor) {
    this.price = price;
    this.quantity = quantity;
    this.color = color;
  }
}

export class OrderBookAggregator {
  private bids: RedBlackTree;
  private asks: RedBlackTree;

  constructor() {
    this.bids = new RedBlackTree(true);  // Descending order for bids
    this.asks = new RedBlackTree(false); // Ascending order for asks
  }

  /**
   * Processes a new order update using O(log N) operations instead of O(N)
   * Eliminates array sorting and linear searches
   */
  public handleUpdate(update: { side: string; price: number; quantity: number }): void {
    const targetBook = update.side === 'buy' ? this.bids : this.asks;
    
    if (update.quantity === 0) {
      // Remove price level - O(log N)
      targetBook.delete(update.price);
    } else {
      // Insert or update price level - O(log N)
      const existing = targetBook.find(update.price);
      if (existing) {
        targetBook.update(update.price, update.quantity);
      } else {
        targetBook.insert(update.price, update.quantity);
      }
    }
  }

  public getTopLevels(depth: number): any {
    return {
      bids: this.bids.getTopLevels(depth),
      asks: this.asks.getTopLevels(depth)
    };
  }
}