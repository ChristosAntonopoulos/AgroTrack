import React from 'react';
import './LoginIllustration.css';

const LoginIllustration: React.FC = () => {
  return (
    <div className="login-illustration">
      <svg
        viewBox="0 0 800 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="illustration-svg"
      >
        {/* Sky gradient */}
        <defs>
          <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#E8F5E9" />
            <stop offset="100%" stopColor="#C8E6C9" />
          </linearGradient>
          <linearGradient id="groundGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8BC34A" />
            <stop offset="100%" stopColor="#689F38" />
          </linearGradient>
          <linearGradient id="treeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4CAF50" />
            <stop offset="100%" stopColor="#2E7D32" />
          </linearGradient>
          <linearGradient id="oliveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8BC34A" />
            <stop offset="100%" stopColor="#689F38" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width="800" height="600" fill="url(#skyGradient)" />
        
        {/* Ground */}
        <ellipse cx="400" cy="550" rx="500" ry="100" fill="url(#groundGradient)" opacity="0.8" />
        
        {/* Sun */}
        <circle cx="650" cy="120" r="60" fill="#FFD54F" opacity="0.9" />
        <circle cx="650" cy="120" r="50" fill="#FFEB3B" />
        
        {/* Cloud 1 */}
        <ellipse cx="150" cy="100" rx="40" ry="25" fill="#FFFFFF" opacity="0.8" />
        <ellipse cx="170" cy="100" rx="35" ry="30" fill="#FFFFFF" opacity="0.8" />
        <ellipse cx="130" cy="100" rx="30" ry="25" fill="#FFFFFF" opacity="0.8" />
        
        {/* Cloud 2 */}
        <ellipse cx="550" cy="80" rx="35" ry="20" fill="#FFFFFF" opacity="0.7" />
        <ellipse cx="570" cy="80" rx="30" ry="25" fill="#FFFFFF" opacity="0.7" />
        <ellipse cx="530" cy="80" rx="25" ry="20" fill="#FFFFFF" opacity="0.7" />
        
        {/* Olive Tree 1 (Left) */}
        <g transform="translate(200, 300)">
          {/* Trunk */}
          <rect x="-8" y="80" width="16" height="120" fill="#5D4037" rx="4" />
          {/* Crown */}
          <ellipse cx="0" cy="60" rx="70" ry="80" fill="url(#treeGradient)" opacity="0.9" />
          <ellipse cx="-20" cy="40" rx="50" ry="60" fill="url(#treeGradient)" opacity="0.8" />
          <ellipse cx="20" cy="50" rx="55" ry="65" fill="url(#treeGradient)" opacity="0.8" />
          {/* Olives */}
          <circle cx="-15" cy="30" r="8" fill="url(#oliveGradient)" />
          <circle cx="10" cy="40" r="7" fill="url(#oliveGradient)" />
          <circle cx="-5" cy="60" r="6" fill="url(#oliveGradient)" />
          <circle cx="25" cy="55" r="7" fill="url(#oliveGradient)" />
          <circle cx="-30" cy="50" r="6" fill="url(#oliveGradient)" />
        </g>
        
        {/* Olive Tree 2 (Center) */}
        <g transform="translate(400, 280)">
          {/* Trunk */}
          <rect x="-10" y="100" width="20" height="140" fill="#5D4037" rx="5" />
          {/* Crown */}
          <ellipse cx="0" cy="50" rx="85" ry="95" fill="url(#treeGradient)" opacity="0.95" />
          <ellipse cx="-25" cy="30" rx="60" ry="70" fill="url(#treeGradient)" opacity="0.85" />
          <ellipse cx="25" cy="40" rx="65" ry="75" fill="url(#treeGradient)" opacity="0.85" />
          <ellipse cx="0" cy="20" rx="50" ry="55" fill="url(#treeGradient)" opacity="0.8" />
          {/* Olives */}
          <circle cx="-20" cy="20" r="9" fill="url(#oliveGradient)" />
          <circle cx="15" cy="30" r="8" fill="url(#oliveGradient)" />
          <circle cx="-5" cy="50" r="7" fill="url(#oliveGradient)" />
          <circle cx="30" cy="45" r="8" fill="url(#oliveGradient)" />
          <circle cx="-35" cy="40" r="7" fill="url(#oliveGradient)" />
          <circle cx="0" cy="15" r="6" fill="url(#oliveGradient)" />
          <circle cx="20" cy="10" r="7" fill="url(#oliveGradient)" />
        </g>
        
        {/* Olive Tree 3 (Right) */}
        <g transform="translate(600, 310)">
          {/* Trunk */}
          <rect x="-7" y="90" width="14" height="110" fill="#5D4037" rx="4" />
          {/* Crown */}
          <ellipse cx="0" cy="55" rx="65" ry="75" fill="url(#treeGradient)" opacity="0.9" />
          <ellipse cx="-18" cy="45" rx="45" ry="55" fill="url(#treeGradient)" opacity="0.8" />
          <ellipse cx="18" cy="50" rx="50" ry="60" fill="url(#treeGradient)" opacity="0.8" />
          {/* Olives */}
          <circle cx="-12" cy="35" r="7" fill="url(#oliveGradient)" />
          <circle cx="8" cy="45" r="6" fill="url(#oliveGradient)" />
          <circle cx="-2" cy="60" r="6" fill="url(#oliveGradient)" />
          <circle cx="22" cy="50" r="7" fill="url(#oliveGradient)" />
          <circle cx="-25" cy="55" r="6" fill="url(#oliveGradient)" />
        </g>
        
        {/* Decorative elements - small plants */}
        <ellipse cx="100" cy="480" rx="25" ry="15" fill="#66BB6A" opacity="0.7" />
        <ellipse cx="700" cy="490" rx="30" ry="18" fill="#66BB6A" opacity="0.7" />
        <ellipse cx="300" cy="500" rx="20" ry="12" fill="#66BB6A" opacity="0.6" />
      </svg>
      
      <div className="illustration-content">
        <h2 className="illustration-title">Olive Lifecycle Platform</h2>
        <p className="illustration-subtitle">
          Manage your olive fields with precision and care
        </p>
      </div>
    </div>
  );
};

export default LoginIllustration;
