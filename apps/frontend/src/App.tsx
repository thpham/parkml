import { useState, useEffect } from 'react';
import { API_ENDPOINTS, ApiResponse } from '@parkml/shared';
import './App.css';

function App() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealth();
  }, []);

  const fetchHealth = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.HEALTH);
      const data: ApiResponse = await response.json();
      if (data.success) {
        setHealth(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch health status:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>ParkML</h1>
        <p>TypeScript Full-Stack Application</p>
        {loading ? (
          <p>Loading...</p>
        ) : health ? (
          <div className="health-status">
            <p>Server Status: {health.status}</p>
            <p>Environment: {health.environment}</p>
          </div>
        ) : (
          <p>Failed to connect to server</p>
        )}
      </header>
    </div>
  );
}

export default App;