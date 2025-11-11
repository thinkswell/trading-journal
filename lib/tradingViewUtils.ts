/**
 * Opens TradingView for a given symbol
 * On mobile: Tries to open TradingView app first, falls back to website
 * On desktop: Opens TradingView website in new tab
 */
export const openTradingView = (symbol: string, event?: React.MouseEvent) => {
  // Prevent event propagation to avoid triggering row/card clicks
  if (event) {
    event.stopPropagation();
  }

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
  const tradingViewUrl = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}`;
  const tradingViewAppUrl = `tradingview://chart/?symbol=${encodeURIComponent(symbol)}`;

  if (isMobile) {
    // Try to open TradingView app first using deep link
    let appOpened = false;
    
    // Create a hidden link element to attempt deep link
    const link = document.createElement('a');
    link.href = tradingViewAppUrl;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Also try window.location as fallback method
    try {
      window.location.href = tradingViewAppUrl;
    } catch (e) {
      // If deep link fails, open website
      window.open(tradingViewUrl, '_blank');
      return;
    }

    // Set timeout to detect if app opened
    // If app opens, the page will blur/hide
    // If app doesn't open, we'll still be on the page after timeout
    const timeout = 2000; // 2 seconds
    const checkInterval = 100;
    let elapsed = 0;

    const checkAppOpened = setInterval(() => {
      elapsed += checkInterval;
      
      // Check if page lost focus (app likely opened)
      if (document.hidden || !document.hasFocus()) {
        appOpened = true;
        clearInterval(checkAppOpened);
        return;
      }

      // If timeout reached and app didn't open, fallback to website
      if (elapsed >= timeout) {
        clearInterval(checkAppOpened);
        if (!appOpened) {
          window.open(tradingViewUrl, '_blank');
        }
      }
    }, checkInterval);

    // Also listen for page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        appOpened = true;
        clearInterval(checkAppOpened);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        document.removeEventListener('blur', handleVisibilityChange);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleVisibilityChange);

    // Cleanup after timeout
    setTimeout(() => {
      clearInterval(checkAppOpened);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleVisibilityChange);
    }, timeout + 500);
  } else {
    // Desktop: Open in new tab
    window.open(tradingViewUrl, '_blank');
  }
};

