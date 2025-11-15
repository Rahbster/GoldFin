let monthlyRevenueChart = null;
let contractStatusChart = null;
let eventVolumeChart = null;
let topItemsChart = null;

export function renderMonthlyRevenueChart(chartData) {
    const ctx = document.getElementById('monthly-revenue-chart')?.getContext('2d');
    if (!ctx) return;

    if (monthlyRevenueChart) {
        monthlyRevenueChart.destroy();
    }

    monthlyRevenueChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Total Contract Value',
                data: chartData.data,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` Revenue: $${context.raw.toLocaleString()}`;
                        }
                    }
                }
            }
        }
    });
}

export function renderEventVolumeChart(chartData) {
    const ctx = document.getElementById('event-volume-chart')?.getContext('2d');
    if (!ctx) return;

    if (eventVolumeChart) {
        eventVolumeChart.destroy();
    }

    eventVolumeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Number of Events',
                data: chartData.data,
                backgroundColor: 'rgba(153, 102, 255, 0.6)',
                borderColor: 'rgba(153, 102, 255, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1 // Ensure y-axis shows whole numbers for event counts
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

export function renderTopItemsChart(chartData) {
    const ctx = document.getElementById('top-items-chart')?.getContext('2d');
    if (!ctx) return;

    if (topItemsChart) {
        topItemsChart.destroy();
    }

    topItemsChart = new Chart(ctx, {
        type: 'bar', // Horizontal bar chart
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Times Used in Contracts',
                data: chartData.data,
                backgroundColor: 'rgba(255, 159, 64, 0.6)',
                borderColor: 'rgba(255, 159, 64, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y', // This makes the bar chart horizontal
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

export function renderContractStatusChart(chartData) {
    const ctx = document.getElementById('contract-status-chart')?.getContext('2d');
    if (!ctx) return;

    if (contractStatusChart) {
        contractStatusChart.destroy();
    }

    contractStatusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Contracts',
                data: chartData.data,
                backgroundColor: chartData.colors,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}