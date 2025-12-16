// Initialize the background map for home page
let homeBackgroundMap = null;
let aboutBackgroundMap = null;

function initHomeBackgroundMap() {
    const homeMapDiv = document.getElementById('home-map-background');
    if (homeMapDiv && !homeBackgroundMap) {
        homeBackgroundMap = L.map('home-map-background', {
            zoomControl: false,
            dragging: false,
            scrollWheelZoom: false,
            doubleClickZoom: false,
            boxZoom: false,
            keyboard: false,
            tap: false,
            touchZoom: false,
            attributionControl: false
        }).setView([42.6977, 23.3219], 12.5);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18
        }).addTo(homeBackgroundMap);
        
        // Add district polygons to background map
        if (typeof crimeData !== 'undefined') {
            L.geoJSON(crimeData, {
                style: {
                    fillColor: '#a855f7',
                    fillOpacity: 0.2,
                    color: '#a855f7',
                    weight: 2,
                    opacity: 0.6
                }
            }).addTo(homeBackgroundMap);
        }
    }
}

function initAboutBackgroundMap() {
    const aboutMapDiv = document.getElementById('about-map-background');
    if (aboutMapDiv && !aboutBackgroundMap) {
        aboutBackgroundMap = L.map('about-map-background', {
            zoomControl: false,
            dragging: false,
            scrollWheelZoom: false,
            doubleClickZoom: false,
            boxZoom: false,
            keyboard: false,
            tap: false,
            touchZoom: false,
            attributionControl: false
        }).setView([42.6977, 23.3219], 12.5);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18
        }).addTo(aboutBackgroundMap);
        
        // Add district polygons to background map
        if (typeof crimeData !== 'undefined') {
            L.geoJSON(crimeData, {
                style: {
                    fillColor: '#a855f7',
                    fillOpacity: 0.2,
                    color: '#a855f7',
                    weight: 2,
                    opacity: 0.6
                }
            }).addTo(aboutBackgroundMap);
        }
    }
}

// Initialize the map centered on Sofia
const map = L.map('map', {
    scrollWheelZoom: true,
    smoothWheelZoom: true,
    smoothSensitivity: 2,
    zoomSnap: 0.25,
    zoomDelta: 0.25
}).setView([42.6977, 23.3219], 12);

// Add OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 18
}).addTo(map);

// Store the current polygon layer
let currentPolygonLayer = null;
let currentFilter = 'all';
let currentPeriod = 'all';

// Color scale function based on district ranking (1-9)
// Rank 1 = highest crime, Rank 9 = lowest crime
function getColorByRank(rank) {
    const colors = [
        '#4a0000', // Rank 1 - Very dark red (highest crime)
        '#6b0000', // Rank 2 - Deep dark red
        '#8b0000', // Rank 3 - Dark red
        '#b30000', // Rank 4 - Strong red
        '#d10000', // Rank 5 - Bold red
        '#eb0000', // Rank 6 - Pure red
        '#ff1a1a', // Rank 7 - Bright red
        '#ff4d4d', // Rank 8 - Vivid red
        '#ff8080'  // Rank 9 - Medium red (lowest crime)
    ];
    return colors[rank - 1] || colors[8];
}

// Function to get district rankings based on crime count
function getDistrictRankings(filter, period) {
    // Create array of districts with their crime counts
    const districtCounts = crimeData.features.map(feature => ({
        name: feature.properties.name,
        count: getCrimeCount(feature.properties, filter, period)
    }));
    
    // Sort by crime count (descending)
    districtCounts.sort((a, b) => b.count - a.count);
    
    // Create ranking map
    const rankings = {};
    districtCounts.forEach((district, index) => {
        rankings[district.name] = index + 1; // Rank 1 = highest
    });
    
    return rankings;
}

// Function to calculate total or specific crime type
function getCrimeCount(properties, filter, period) {
    if (period === 'all') {
        // Sum both 2024 and 2025 data
        if (filter === 'all') {
            return (properties['type1_2024'] || 0) + (properties['type2_2024'] || 0) + 
                   (properties['type3_2024'] || 0) + (properties['type4_2024'] || 0) +
                   (properties['type1_2025'] || 0) + (properties['type2_2025'] || 0) + 
                   (properties['type3_2025'] || 0) + (properties['type4_2025'] || 0);
        } else {
            return (properties[filter + '_2024'] || 0) + (properties[filter + '_2025'] || 0);
        }
    } else {
        const suffix = '_' + period;
        if (filter === 'all') {
            return (properties['type1' + suffix] || 0) + (properties['type2' + suffix] || 0) + 
                   (properties['type3' + suffix] || 0) + (properties['type4' + suffix] || 0);
        } else {
            return properties[filter + suffix] || 0;
        }
    }
}

// Function to find max crime count for color scaling
function getMaxCount(filter, period) {
    let max = 0;
    crimeData.features.forEach(feature => {
        const count = getCrimeCount(feature.properties, filter, period);
        if (count > max) max = count;
    });
    return max;
}

// Function to update the polygon layer
function updateHeatmap(filter, period) {
    // Remove existing polygon layer
    if (currentPolygonLayer) {
        map.removeLayer(currentPolygonLayer);
    }
    
    const rankings = getDistrictRankings(filter, period);
    let totalIncidents = 0;
    
    // Create new GeoJSON layer with styled polygons
    currentPolygonLayer = L.geoJSON(crimeData, {
        style: function(feature) {
            const count = getCrimeCount(feature.properties, filter, period);
            const rank = rankings[feature.properties.name];
            totalIncidents += count;
            
            return {
                fillColor: getColorByRank(rank),
                weight: 2,
                opacity: 1,
                color: 'white',
                fillOpacity: 0.7
            };
        },
        onEachFeature: function(feature, layer) {
            const props = feature.properties;
            const count = getCrimeCount(props, filter, period);
            
            // Determine period label and data to show
            let periodLabel, type1Val, type2Val, type3Val, type4Val;
            if (period === 'all') {
                periodLabel = '2024-2025 (Общо)';
                type1Val = (props.type1_2024 || 0) + (props.type1_2025 || 0);
                type2Val = (props.type2_2024 || 0) + (props.type2_2025 || 0);
                type3Val = (props.type3_2024 || 0) + (props.type3_2025 || 0);
                type4Val = (props.type4_2024 || 0) + (props.type4_2025 || 0);
            } else {
                periodLabel = period === '2024' ? '2024 г.' : '2025 г. (Ян-Окт)';
                const suffix = '_' + period;
                type1Val = props['type1' + suffix] || 0;
                type2Val = props['type2' + suffix] || 0;
                type3Val = props['type3' + suffix] || 0;
                type4Val = props['type4' + suffix] || 0;
            }
            
            // Create popup content
            let popupContent = `<div style="font-family: Arial, sans-serif;">
                <h3 style="margin: 0 0 10px 0;">${props.name}</h3>
                <p style="margin: 5px 0; font-size: 0.9em; color: #666;"><em>${periodLabel}</em></p>`;
            
            if (filter === 'all') {
                popupContent += `
                    <p style="margin: 5px 0;"><strong>Общо престъпления:</strong> ${count}</p>
                    <hr style="margin: 8px 0;">
                    <p style="margin: 3px 0; font-size: 0.9em;">• Против собствеността: ${type1Val}</p>
                    <p style="margin: 3px 0; font-size: 0.9em;">• Против личността: ${type2Val}</p>
                    <p style="margin: 3px 0; font-size: 0.9em;">• Свързани с наркотици: ${type3Val}</p>
                    <p style="margin: 3px 0; font-size: 0.9em;">• ПТП с ранени/загинали: ${type4Val}</p>
                `;
            } else {
                popupContent += `<p style="margin: 5px 0;"><strong>${crimeTypeLabels[filter]}:</strong> ${count}</p>`;
            }
            
            popupContent += `</div>`;
            layer.bindPopup(popupContent);
            
            // Highlight on hover
            layer.on({
                mouseover: function(e) {
                    const layer = e.target;
                    layer.setStyle({
                        weight: 4,
                        color: '#666',
                        fillOpacity: 0.9
                    });
                },
                mouseout: function(e) {
                    currentPolygonLayer.resetStyle(e.target);
                }
            });
        }
    }).addTo(map);
    
    // Update statistics
    updateStats(filter, period, totalIncidents);
}

// Function to update statistics display
function updateStats(filter, period, count) {
    document.getElementById('total-incidents').textContent = count;
    
    let filterLabel = 'Всички типове';
    if (filter !== 'all') {
        filterLabel = crimeTypeLabels[filter] || filter;
    }
    document.getElementById('active-filter').textContent = filterLabel;
    
    let periodLabel = '2024-2025';
    if (period === '2024') {
        periodLabel = '2024 г.';
    } else if (period === '2025') {
        periodLabel = '2025 г. (Ян-Окт)';
    }
    document.getElementById('active-period').textContent = periodLabel;
}

// Function to handle filter button clicks
function setupFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const periodButtons = document.querySelectorAll('.period-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Get filter type and update map
            const filterType = button.getAttribute('data-type');
            currentFilter = filterType;
            updateHeatmap(filterType, currentPeriod);
        });
    });
    
    periodButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            periodButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Get period and update map
            const period = button.getAttribute('data-period');
            currentPeriod = period;
            updateHeatmap(currentFilter, period);
        });
    });
}

// Initialize the application
function init() {
    // Setup filter buttons
    setupFilters();
    
    // Show initial polygon map with all data for 2024
    updateHeatmap('all', '2024');
    
    // Add a scale control
    L.control.scale().addTo(map);
    
    // Add legend control
    addLegend();
}

// Add dynamic legend
function addLegend() {
    const legend = L.control({position: 'bottomright'});
    
    legend.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'info legend-control');
        div.innerHTML = `
            <div style="background: white; padding: 10px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
                <h4 style="margin: 0 0 8px 0;">Брой престъпления</h4>
                <div style="display: flex; align-items: center; margin: 3px 0;">
                    <span style="background: #FFEDA0; width: 20px; height: 15px; display: inline-block; margin-right: 8px; border: 1px solid #999;"></span>
                    <span>Ниско</span>
                </div>
                <div style="display: flex; align-items: center; margin: 3px 0;">
                    <span style="background: #FED976; width: 20px; height: 15px; display: inline-block; margin-right: 8px; border: 1px solid #999;"></span>
                    <span>↓</span>
                </div>
                <div style="display: flex; align-items: center; margin: 3px 0;">
                    <span style="background: #FD8D3C; width: 20px; height: 15px; display: inline-block; margin-right: 8px; border: 1px solid #999;"></span>
                    <span>Средно</span>
                </div>
                <div style="display: flex; align-items: center; margin: 3px 0;">
                    <span style="background: #E31A1C; width: 20px; height: 15px; display: inline-block; margin-right: 8px; border: 1px solid #999;"></span>
                    <span>↓</span>
                </div>
                <div style="display: flex; align-items: center; margin: 3px 0;">
                    <span style="background: #800026; width: 20px; height: 15px; display: inline-block; margin-right: 8px; border: 1px solid #999;"></span>
                    <span>Високо</span>
                </div>
            </div>
        `;
        return div;
    };
    
    legend.addTo(map);
}

// Fullscreen functionality
function initFullscreen() {
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const mapContainer = document.querySelector('.map-container-fullwidth');
    
    if (fullscreenBtn && mapContainer) {
        fullscreenBtn.addEventListener('click', () => {
            mapContainer.classList.toggle('fullscreen');
            
            // Give the map a moment to resize, then invalidate size
            setTimeout(() => {
                map.invalidateSize();
            }, 100);
        });
    }
    
    // Handle ESC key to exit fullscreen
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mapContainer && mapContainer.classList.contains('fullscreen')) {
            mapContainer.classList.remove('fullscreen');
            setTimeout(() => {
                map.invalidateSize();
            }, 100);
        }
    });
}

// Toggle widget visibility on mobile
function toggleWidget() {
    const widget = document.querySelector('.controls-widget-floating');
    if (widget) {
        widget.classList.toggle('collapsed');
    }
}

// Start the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initHomeBackgroundMap();
    initAboutBackgroundMap();
    init();
    initFullscreen();
});
