```javascript
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const App = () => {
  const [data, setData] = useState(null);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('https://api.example.com/data', { timeout: 5000 });
        setData(response.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        // cleanup
      }
    };
    fetchData();
  }, []);

  return (
    <div>App</div>
  );
};
export default App;
```