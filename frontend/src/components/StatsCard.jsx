import React from 'react';
import './StatsCard.css';

const StatsCard = ({ 
    title, 
    value, 
    subtitle, 
    icon, 
    trend, 
    trendValue, 
    color = 'blue',
    loading = false 
}) => {
    const getTrendIcon = () => {
        if (trend === 'up') return 'fas fa-arrow-up';
        if (trend === 'down') return 'fas fa-arrow-down';
        return 'fas fa-minus';
    };

    const getTrendClass = () => {
        if (trend === 'up') return 'trend-up';
        if (trend === 'down') return 'trend-down';
        return 'trend-neutral';
    };

    if (loading) {
        return (
            <div className={`stats-card stats-card-${color} loading`}>
                <div className="stats-card-header">
                    <div className="stats-card-icon skeleton"></div>
                    <div className="stats-card-trend skeleton"></div>
                </div>
                <div className="stats-card-body">
                    <div className="stats-card-value skeleton"></div>
                    <div className="stats-card-title skeleton"></div>
                    <div className="stats-card-subtitle skeleton"></div>
                </div>
            </div>
        );
    }

    return (
        <div className={`stats-card stats-card-${color}`}>
            <div className="stats-card-header">
                <div className="stats-card-icon">
                    <i className={icon}></i>
                </div>
                {trend && (
                    <div className={`stats-card-trend ${getTrendClass()}`}>
                        <i className={getTrendIcon()}></i>
                        <span>{trendValue}</span>
                    </div>
                )}
            </div>
            <div className="stats-card-body">
                <div className="stats-card-value">{value}</div>
                <div className="stats-card-title">{title}</div>
                {subtitle && <div className="stats-card-subtitle">{subtitle}</div>}
            </div>
        </div>
    );
};

export default StatsCard;