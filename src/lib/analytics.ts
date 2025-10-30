// PostHog Analytics Integration
// Note: Replace 'YOUR_POSTHOG_KEY' with actual key after setup

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
}

class Analytics {
  private isInitialized = false;
  private queue: AnalyticsEvent[] = [];

  init() {
    if (this.isInitialized) return;

    // Check if PostHog is available (loaded via script tag)
    if (typeof window !== 'undefined' && (window as any).posthog) {
      this.isInitialized = true;
      console.log('[Analytics] PostHog initialized');
      
      // Flush queued events
      this.queue.forEach(event => this.track(event.name, event.properties));
      this.queue = [];
    } else {
      console.warn('[Analytics] PostHog not loaded yet');
    }
  }

  track(eventName: string, properties?: Record<string, any>) {
    if (!this.isInitialized) {
      // Queue event if not initialized yet
      this.queue.push({ name: eventName, properties });
      return;
    }

    if (typeof window !== 'undefined' && (window as any).posthog) {
      (window as any).posthog.capture(eventName, properties);
      console.log('[Analytics] Event tracked:', eventName, properties);
    }
  }

  identify(userId: string, traits?: Record<string, any>) {
    if (!this.isInitialized) return;

    if (typeof window !== 'undefined' && (window as any).posthog) {
      (window as any).posthog.identify(userId, traits);
      console.log('[Analytics] User identified:', userId);
    }
  }

  reset() {
    if (!this.isInitialized) return;

    if (typeof window !== 'undefined' && (window as any).posthog) {
      (window as any).posthog.reset();
      console.log('[Analytics] Session reset');
    }
  }

  // Convenience methods for common events
  trackOutfitGenerated(properties?: Record<string, any>) {
    this.track('outfit_generated', properties);
  }

  trackOutfitLiked(outfitId: string) {
    this.track('outfit_liked', { outfit_id: outfitId });
  }

  trackOutfitShared(outfitId: string, method: string) {
    this.track('outfit_shared', { outfit_id: outfitId, method });
  }

  trackPageView(pageName: string) {
    this.track('page_viewed', { page: pageName });
  }

  trackClothingUploaded(category: string) {
    this.track('clothing_uploaded', { category });
  }

  trackSearchPerformed(query: string) {
    this.track('search_performed', { query });
  }
}

export const analytics = new Analytics();

// Auto-initialize on load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    analytics.init();
  });
}
