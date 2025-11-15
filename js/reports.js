import { appViewModel } from './app_viewmodel.js';
import { renderMonthlyRevenueChart, renderContractStatusChart, renderEventVolumeChart, renderTopItemsChart } from './components/charts.js';

export function renderReports() {
    const reportsContent = document.getElementById('reports-tab-content');
    if (!reportsContent) return;

    // Set the HTML structure for the reports tab
    reportsContent.innerHTML = `
        <div class="main-content-header">
            <div class="header-title-group">
                <h2>Reports & Analytics</h2>
            </div>
        </div>
        <div class="dashboard-charts-container">
            <div class="dashboard-chart-wrapper">
                <h3>Monthly Revenue (${new Date().getFullYear()})</h3>
                <div class="chart-container">
                    <canvas id="monthly-revenue-chart"></canvas>
                </div>
            </div>
            <div class="dashboard-chart-wrapper">
                <h3>Contract Pipeline</h3>
                <div class="chart-container">
                    <canvas id="contract-status-chart"></canvas>
                </div>
            </div>
            <div class="dashboard-chart-wrapper">
                <h3>Event Volume by Month (${new Date().getFullYear()})</h3>
                <div class="chart-container">
                    <canvas id="event-volume-chart"></canvas>
                </div>
            </div>
            <div class="dashboard-chart-wrapper">
                <h3>Top 5 Menu Items (from Contracts)</h3>
                <div class="chart-container">
                    <canvas id="top-items-chart"></canvas>
                </div>
            </div>
        </div>
    `;

    // Render the charts after the canvas elements are in the DOM
    renderMonthlyRevenueChart(appViewModel.getMonthlyRevenueData());
    renderContractStatusChart(appViewModel.getContractStatusData());
    renderEventVolumeChart(appViewModel.getEventVolumeData());
    renderTopItemsChart(appViewModel.getTopMenuItemsData());
}