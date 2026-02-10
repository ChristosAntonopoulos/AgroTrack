import React from 'react';
import './CalendarLegend.css';

const CalendarLegend: React.FC = () => {
  return (
    <div className="calendar-legend">
      <h4>Legend</h4>
      <div className="legend-items">
        <div className="legend-item">
          <div className="legend-color" style={{ borderLeftColor: '#ffc107' }}></div>
          <span>Pending Tasks</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ borderLeftColor: '#17a2b8' }}></div>
          <span>In Progress Tasks</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ borderLeftColor: '#28a745' }}></div>
          <span>Completed Tasks</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ borderLeftColor: '#dc3545' }}></div>
          <span>Urgent Deadlines (≤3 days)</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ borderLeftColor: '#ffc107' }}></div>
          <span>Upcoming Deadlines (4-7 days)</span>
        </div>
      </div>
    </div>
  );
};

export default CalendarLegend;
