import React from 'react';
import './Help.css';

const Card = ({ icon, title, description }) => {
    return (
        <div className="instruction-card">
            <div className="card-content">
                <div className="card-header">
                    <span className="material-symbols-outlined">{icon}</span>
                    <h2 className="card-title">{title}</h2>
                </div>
                <p className="card-description">{description}</p>
            </div>
        </div>
    );
};

export default Card;
