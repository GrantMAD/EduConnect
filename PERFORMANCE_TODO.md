# Performance & Bug Fixes TODO

**Date:** 2025-12-06
**Status:** Pending (To be done later)

## 1. Fix Memory Leak in `CustomHeader.js`
**Issue:** The app feels sluggish after prolonged use.
**Cause:** The `AppState` listener calls `fetchNotifications` every time the app comes to the foreground. This function creates a *new* Supabase realtime subscription each time without cleaning up the old ones. This leads to dozens of active listeners accumulating in the background.

**Action to Take:**
- Modify `CustomHeader.js`.
- Separate the **subscription setup** from the **data fetching**.
- Create a dedicated `useEffect` that runs only on mount (or when `user` changes) to set up the subscription.
- Ensure the `AppState` listener *only* calls the data fetcher and does not re-subscribe.

## 2. Fix Cleanup in `GamificationContext.js`
**Issue:** Potential error during component unmount.
**Cause:** The code uses `subscription.unsubscribe()`. The modern Supabase v2 client uses `supabase.removeChannel(subscription)`.

**Action to Take:**
- Modify `GamificationContext.js`.
- Change the cleanup function in `useEffect`:
  ```javascript
  // Old
  return () => { subscription.unsubscribe(); };
  
  // New
  return () => { supabase.removeChannel(subscription); };
  ```
