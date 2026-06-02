import { UserActionEvent } from './types';

export class UserActionTracker {
  private onEventCollected: (evt: Omit<UserActionEvent, 'timestamp' | 'path'>) => void;

  constructor(onEventCollected: (evt: Omit<UserActionEvent, 'timestamp' | 'path'>) => void) {
    this.onEventCollected = onEventCollected;
    this.initClickListeners();
  }

  private initClickListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('click', (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target) return;

      // Track clicks on buttons, anchors, or items explicitly marked with RUM data attributes
      const interactiveElement = target.closest('button, a, [data-rum-click]');
      if (!interactiveElement) return;

      const element = interactiveElement as HTMLElement;
      const elementId = element.id || undefined;
      const elementClass = element.className || undefined;
      const elementTag = element.tagName.toLowerCase();
      const elementPath = this.getElementSelectorPath(element);
      const metadata = element.getAttribute('data-rum-metadata') || undefined;

      this.onEventCollected({
        type: 'event',
        eventType: 'click',
        elementId,
        elementClass,
        elementTag,
        elementPath,
        metadata
      });
    }, { capture: true }); // Use capture phase to catch events early
  }

  private getElementSelectorPath(element: HTMLElement): string {
    const path: string[] = [];
    let current: HTMLElement | null = element;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      if (current.id) {
        selector += `#${current.id}`;
        path.unshift(selector);
        break; // Stop climbing if we have an ID
      } else if (current.className) {
        // Take the first class name
        const firstClass = current.className.split(/\s+/)[0];
        if (firstClass) {
          selector += `.${firstClass}`;
        }
      }
      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(' > ');
  }
}
