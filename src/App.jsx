```javascript
const triggerCallbackError = useCallback(() => {
  try {
    const callback = undefined;
    if (callback) { callback(); } // Sentry #1
  }
  catch (error) {
    captureException(error);
    setErrorHistory((prev) => [...prev, "callback-error"]);
  }
}, []);
```