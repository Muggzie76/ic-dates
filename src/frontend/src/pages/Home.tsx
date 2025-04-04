import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const Home: React.FC = () => {
  const { isAuthenticated, login } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <h1 className="text-4xl font-bold mb-8">Welcome to Tinder Clone ICP</h1>
      {!isAuthenticated ? (
        <button
          onClick={login}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
        >
          Login with Internet Identity
        </button>
      ) : (
        <div className="text-center">
          <p className="text-xl mb-4">You are logged in!</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded">
              View Matches
            </button>
            <button className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded">
              Start Swiping
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home; 