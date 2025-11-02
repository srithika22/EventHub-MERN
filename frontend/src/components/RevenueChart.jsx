import React from 'react';
import './RevenueChart.css';

const RevenueChart = ({ data, loading = false, timeRange = '6months' }) => {
    if (loading) {
        return (
            <div className="revenue-chart-container loading">
                <div className="chart-header">
                    <div className="chart-title skeleton"></div>
                    <div className="chart-subtitle skeleton"></div>
                </div>
                <div className="chart-content skeleton"></div>
            </div>
        );
    }

    if (!data || !data.monthlyData || data.monthlyData.length === 0) {
        return (
            <div className="revenue-chart-container">
                <div className="chart-header">
                    <h3 className="chart-title">Revenue Analytics</h3>
                    <p className="chart-subtitle">No revenue data available</p>
                </div>
                <div className="chart-content empty">
                    <i className="fas fa-chart-line"></i>
                    <p>No data to display</p>
                </div>
            </div>
        );
    }

    const monthlyData = data.monthlyData;
    const maxRevenue = Math.max(...monthlyData.map(item => item.revenue), 1);
    
    const formatMonth = (monthKey) => {
        const date = new Date(monthKey + '-01');
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const totalRevenue = data.totalRevenue || monthlyData.reduce((sum, item) => sum + item.revenue, 0);
    const avgMonthlyRevenue = totalRevenue / monthlyData.length;

    return (
        <div className="revenue-chart-container">
            <div className="chart-header">
                <div className="chart-info">
                    <h3 className="chart-title">Revenue Analytics</h3>
                    <p className="chart-subtitle">
                        {formatCurrency(totalRevenue)} total • {formatCurrency(avgMonthlyRevenue)} avg/month
                    </p>
                </div>
                <div className="chart-legend">
                    <div className="legend-item">
                        <div className="legend-color revenue"></div>
                        <span>Revenue</span>
                    </div>
                </div>
            </div>
            
            <div className="chart-content">
                <div className="chart-grid">
                    {/* Y-axis labels */}
                    <div className="y-axis">
                        {[1, 0.75, 0.5, 0.25, 0].map(ratio => (
                            <div key={ratio} className="y-axis-label">
                                {formatCurrency(maxRevenue * ratio)}
                            </div>
                        ))}
                    </div>
                    
                    {/* Chart bars */}
                    <div className="chart-bars">
                        {monthlyData.map((item, index) => (
                            <div key={item.month || index} className="chart-bar-container">
                                <div className="chart-bar-wrapper">
                                    <div 
                                        className="chart-bar revenue"
                                        style={{ 
                                            height: `${(item.revenue / maxRevenue) * 100}%`,
                                            minHeight: item.revenue > 0 ? '4px' : '0'
                                        }}
                                        data-tooltip={`${formatMonth(item.month)}: ${formatCurrency(item.revenue)}`}
                                    ></div>
                                </div>
                                <div className="x-axis-label">
                                    {formatMonth(item.month)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Summary stats */}
                <div className="chart-summary">
                    <div className="summary-item">
                        <span className="summary-label">Peak Month</span>
                        <span className="summary-value">
                            {monthlyData.length > 0 
                                ? formatMonth(monthlyData.reduce((max, curr) => 
                                    curr.revenue > max.revenue ? curr : max, monthlyData[0]).month)
                                : 'N/A'
                            }
                        </span>
                    </div>
                    <div className="summary-item">
                        <span className="summary-label">Growth</span>
                        <span className="summary-value">
                            {monthlyData.length > 1 ? (
                                monthlyData[monthlyData.length - 1].revenue > monthlyData[0].revenue 
                                    ? '+' + Math.round(((monthlyData[monthlyData.length - 1].revenue - monthlyData[0].revenue) / monthlyData[0].revenue) * 100) + '%'
                                    : Math.round(((monthlyData[monthlyData.length - 1].revenue - monthlyData[0].revenue) / monthlyData[0].revenue) * 100) + '%'
                            ) : 'N/A'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RevenueChart;