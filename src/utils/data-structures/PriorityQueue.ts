/**
 * PriorityQueue - A binary heap implementation of a priority queue
 * 
 * This data structure is optimized for efficient insertion and removal
 * of elements based on their priority. It's primarily used in the
 * network graph implementation for Dijkstra's algorithm.
 */

/**
 * A priority queue implementation using a binary heap
 * 
 * @template T The type of items stored in the queue
 */
export class PriorityQueue<T> {
  private items: { priority: number; value: T }[] = [];

  /**
   * Adds an item to the queue with the specified priority
   * 
   * @param value - The item to add
   * @param priority - The priority of the item (lower values = higher priority)
   */
  enqueue(value: T, priority: number): void {
    // Add the element to the end
    this.items.push({ priority, value });
    
    // Bubble up to maintain heap property
    let idx = this.items.length - 1;
    const element = this.items[idx];
    
    while (idx > 0) {
      const parentIdx = Math.floor((idx - 1) / 2);
      const parent = this.items[parentIdx];
      
      if (element.priority >= parent.priority) break;
      
      // Swap with parent
      this.items[parentIdx] = element;
      this.items[idx] = parent;
      idx = parentIdx;
    }
  }

  /**
   * Removes and returns the highest priority item from the queue
   * 
   * @returns The highest priority item, or undefined if the queue is empty
   */
  dequeue(): T | undefined {
    if (this.isEmpty()) return undefined;
    
    const top = this.items[0];
    const end = this.items.pop();
    
    if (this.items.length > 0 && end) {
      this.items[0] = end;
      this.siftDown(0);
    }
    
    return top.value;
  }

  /**
   * Checks if the queue is empty
   * 
   * @returns True if the queue is empty, false otherwise
   */
  isEmpty(): boolean {
    return this.items.length === 0;
  }

  /**
   * Returns the number of items in the queue
   * 
   * @returns The number of items in the queue
   */
  size(): number {
    return this.items.length;
  }

  /**
   * Restores the heap property by sifting down from the specified index
   * 
   * @param idx - The index to start sifting down from
   */
  private siftDown(idx: number): void {
    const element = this.items[idx];
    const length = this.items.length;
    
    while (true) {
      const leftChildIdx = 2 * idx + 1;
      const rightChildIdx = 2 * idx + 2;
      let leftChild, rightChild;
      let swap = null;
      
      if (leftChildIdx < length) {
        leftChild = this.items[leftChildIdx];
        if (leftChild.priority < element.priority) {
          swap = leftChildIdx;
        }
      }
      
      if (rightChildIdx < length) {
        rightChild = this.items[rightChildIdx];
        if (
          (swap === null && rightChild.priority < element.priority) ||
          (swap !== null && rightChild.priority < this.items[swap].priority)
        ) {
          swap = rightChildIdx;
        }
      }
      
      if (swap === null) break;
      
      this.items[idx] = this.items[swap];
      this.items[swap] = element;
      idx = swap;
    }
  }

  /**
   * Clears all items from the queue
   */
  clear(): void {
    this.items = [];
  }
}
