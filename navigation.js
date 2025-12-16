// Navigation functionality
function navigateToPage(pageName) {
    // Hide all pages
    const pages = document.querySelectorAll('.page-content');
    pages.forEach(page => page.style.display = 'none');
    
    // Show selected page
    const selectedPage = document.getElementById(pageName + '-page');
    if (selectedPage) {
        selectedPage.style.display = 'block';
    }
    
    // Update active nav link
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === pageName) {
            link.classList.add('active');
        }
    });
    
    // Save current page to localStorage
    localStorage.setItem('currentPage', pageName);
    
    // If navigating to home page, ensure background map is initialized
    if (pageName === 'home' && typeof initHomeBackgroundMap === 'function') {
        setTimeout(() => {
            if (homeBackgroundMap) {
                homeBackgroundMap.invalidateSize();
            } else {
                initHomeBackgroundMap();
            }
        }, 100);
    }
    
    // If navigating to about page, ensure background map is initialized
    if (pageName === 'about' && typeof initAboutBackgroundMap === 'function') {
        setTimeout(() => {
            if (aboutBackgroundMap) {
                aboutBackgroundMap.invalidateSize();
            } else {
                initAboutBackgroundMap();
            }
        }, 100);
    }
    
    // If navigating to map page, invalidate map size
    if (pageName === 'map' && typeof map !== 'undefined') {
        setTimeout(() => {
            map.invalidateSize();
        }, 100);
        
        // Collapse widget on mobile when opening map page
        if (window.innerWidth <= 768) {
            const widget = document.querySelector('.controls-widget-floating');
            if (widget) {
                widget.classList.add('collapsed');
            }
        }
    }
    
    // If navigating to data page, populate data
    if (pageName === 'data') {
        populateDataPage();
    }
}

// Populate data page with district statistics
function populateDataPage() {
    if (typeof crimeData === 'undefined') return;
    
    // District neighborhoods mapping
    const districtNeighborhoods = {
        1: ['Изгрев', 'Слатина', 'Средец'],
        2: ['Надежда', 'Сердика', 'Нови Искър'],
        3: ['Възраждане', 'Красна поляна', 'Факултета', 'Илинден'],
        4: ['Лозенец', 'Триадица'],
        5: ['Оборище', 'Подуяне', 'Кремиковци'],
        6: ['Красна поляна', 'Овча купел', 'Витоша'],
        7: ['Младост', 'Студентски град'],
        8: ['Дружба', 'Панчарево'],
        9: ['Люлин', 'Връбница', 'Банкя']
    };
    
    crimeData.features.forEach((feature, index) => {
        const districtNum = index + 1;
        const dataDiv = document.getElementById(`district-${districtNum}-data`);
        
        if (dataDiv) {
            const props = feature.properties;
            const total2024 = (props.type1_2024 || 0) + (props.type2_2024 || 0) + 
                             (props.type3_2024 || 0) + (props.type4_2024 || 0);
            const total2025 = (props.type1_2025 || 0) + (props.type2_2025 || 0) + 
                             (props.type3_2025 || 0) + (props.type4_2025 || 0);
            
            const neighborhoods = districtNeighborhoods[districtNum] || [];
            const neighborhoodList = neighborhoods.map(n => `<span class="neighborhood-tag">${n}</span>`).join('');
            
            dataDiv.innerHTML = `
                <div class="neighborhoods-section">
                    <div class="neighborhoods-label">Райони & Участъци:</div>
                    <div class="neighborhoods-list">${neighborhoodList}</div>
                </div>
                <div class="stats-section">
                    <div class="data-row">
                        <strong>2024:</strong> <span>${total2024}</span>
                    </div>
                    <div class="data-row">
                        <strong>2025 (Ян-Окт):</strong> <span>${total2025}</span>
                    </div>
                    <div class="data-row total">
                        <strong>Общо:</strong> <span>${total2024 + total2025}</span>
                    </div>
                </div>
            `;
        }
    });
}

// Set up navigation event listeners
document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageName = link.getAttribute('data-page');
            navigateToPage(pageName);
        });
    });
    
    // Restore last visited page from localStorage
    const savedPage = localStorage.getItem('currentPage');
    const hash = window.location.hash.substring(1);
    
    // Priority: URL hash > localStorage > default (home)
    let pageToLoad = 'home';
    
    if (hash && ['home', 'map', 'data', 'about'].includes(hash)) {
        pageToLoad = hash;
    } else if (savedPage && ['home', 'map', 'data', 'about'].includes(savedPage)) {
        pageToLoad = savedPage;
    }
    
    navigateToPage(pageToLoad);
});
