export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-SY7WXTXF2L';

// https://developers.google.com/analytics/devguides/collection/gtagjs/pages
export const pageview = (url: string) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('config', GA_MEASUREMENT_ID, {
      page_path: url,
    });
  }
};

// https://developers.google.com/analytics/devguides/collection/gtagjs/events
export const event = ({ action, category, label, value, ...props }: any) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
      ...props
    });
  }
};

export const setUserId = (userId: string) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('set', 'user_id', userId);
    }
}
