import React from 'react';
import { PacmanLoader } from 'react-spinners';
import '../../assets/css/LoadingScreen.css';

const LoadingScreen = ({ loading, progress = 0, message = "Loading..." }) => {
  if (!loading) return null;

  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="pacman-container">
          <PacmanLoader
            color="#FFD700"
            loading={loading}
            size={30}
            margin={2}
            speedMultiplier={1.2}
          />
        </div>
        <h2 className="loading-title">{message}</h2>
        {progress > 0 && (
          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className="progress-text">{Math.round(progress)}%</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingScreen;
