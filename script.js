<script>
    // Global variables
    let racesData = [];
    let photosData = [];
    let bannersData = [];
    let currentView = 'photos'; // 'photos' or 'calendar'
    let filters = {
        distance: 'All',
        organizer: 'All',
        month: 'All',
        year: 'All',
        day: 'All'
    };
    let openFilters = {
        distance: true,
        organizer: true,
        month: true,
        year: true,
        day: true
    };

    // URLs for data
    const RACES_URL = 'https://raw.githubusercontent.com/cncreativesph/races/main/racesphil.json';
    const PHOTOS_URL = 'https://raw.githubusercontent.com/cncreativesph/races/main/photogs.json';
    const ADS_BANNER_URL = 'https://raw.githubusercontent.com/cncreativesph/races/main/adsbanner.json';

    // DOM Elements
    const headerTitle = document.getElementById('headerTitle');
    const toggleButton = document.getElementById('toggleButton');
    const refreshButton = document.getElementById('refreshButton');
    const searchInput = document.getElementById('searchInput');
    const searchSuggestions = document.getElementById('searchSuggestions');
    const hideFiltersButton = document.getElementById('hideFiltersButton');
    const filtersContainer = document.getElementById('filtersContainer');
    const distanceOptions = document.getElementById('distanceOptions');
    const organizerOptions = document.getElementById('organizerOptions');
    const monthOptions = document.getElementById('monthOptions');
    const yearOptions = document.getElementById('yearOptions');
    const dayOptions = document.getElementById('dayOptions');
    const yearFilter = document.getElementById('yearFilter');
    const dayFilter = document.getElementById('dayFilter');
    const raceList = document.getElementById('raceList');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const bannerSection = document.getElementById('bannerSection');
    const bannerGrid = document.getElementById('bannerGrid');

    // Organizer name normalization map
    const organizerNormalizationMap = {
        'SMOKE10 EVENTS MANAGEMENT': 'SMOKE10',
        'SMOKE10': 'SMOKE10',
        'RUNRIO': 'RUNRIO',
        'GREEN MEDIA': 'GREEN MEDIA'
    };

    // Predefined organizer list
    const predefinedOrganizers = ['All', 'RUNRIO', 'SMOKE10', 'GREEN MEDIA', 'Others'];

    // Initialize the app
    document.addEventListener('DOMContentLoaded', () => {
        initApp();
        setupFilterDropdowns();
    });

    // Initialize the app
    async function initApp() {
        try {
            await Promise.all([
                fetchRacesData(),
                fetchPhotosData(),
                fetchBannersData()
            ]);
            
            setupEventListeners();
            setupFilters();
            renderRaces();
            setupBanners();
            
            loadingSpinner.classList.add('hidden');
        } catch (error) {
            console.error('Error initializing app:', error);
            loadingSpinner.classList.add('hidden');
            raceList.innerHTML = `<div class="p-4 text-center text-red-500">Error loading data. Please try again.</div>`;
        }
    }

    // Setup filter dropdowns
    function setupFilterDropdowns() {
        const filterHeaders = document.querySelectorAll('.filter-header');
        
        filterHeaders.forEach(header => {
            const filterType = header.dataset.filter;
            const content = document.getElementById(`${filterType}Content`);
            const icon = header.querySelector('.filter-toggle-icon');
            
            // Set initial state
            if (openFilters[filterType]) {
                content.classList.add('open');
                icon.classList.add('open');
            }
            
            header.addEventListener('click', () => {
                content.classList.toggle('open');
                icon.classList.toggle('open');
                openFilters[filterType] = content.classList.contains('open');
            });
        });
        
        // Hide filters button
        hideFiltersButton.addEventListener('click', () => {
            const icon = hideFiltersButton.querySelector('.hide-filters-icon');
            
            if (filtersContainer.classList.contains('hidden')) {
                filtersContainer.classList.remove('hidden');
                hideFiltersButton.textContent = 'Hide All Filters ';
                icon.classList.remove('collapsed');
            } else {
                filtersContainer.classList.add('hidden');
                hideFiltersButton.textContent = 'Show All Filters ';
                icon.classList.add('collapsed');
            }
            
            // Append the icon back after changing text
            hideFiltersButton.appendChild(icon);
        });
    }

    // Fetch races data
    async function fetchRacesData() {
        try {
            const response = await fetch(RACES_URL);
            const data = await response.json();
            
            // Process the distance field for each race
            data.forEach(race => {
                if (race.distance) {
                    race.categories = parseDistanceString(race.distance);
                }
                
                // Normalize organizer name
                if (race.organizer) {
                    const upperOrganizer = race.organizer.toUpperCase();
                    for (const [key, value] of Object.entries(organizerNormalizationMap)) {
                        if (upperOrganizer.includes(key)) {
                            race.normalizedOrganizer = value;
                            break;
                        }
                    }
                    
                    // If no match found, use the original
                    if (!race.normalizedOrganizer) {
                        race.normalizedOrganizer = race.organizer;
                    }
                }
                
                // Determine day of week (Saturday or Sunday)
                if (race.date) {
                    const raceDate = new Date(race.date);
                    race.dayOfWeek = raceDate.getDay() === 6 ? 'Saturday' : 'Sunday';
                }
            });
            
            racesData = data;
        } catch (error) {
            console.error('Error fetching races data:', error);
            throw error;
        }
    }

    // Parse distance string into standardized categories
    function parseDistanceString(distanceStr) {
        if (!distanceStr) return [];
        
        // Replace various separators with a standard one
        let normalized = distanceStr.replace(/\s*[-|\/]\s*/g, '|');
        
        // Split by the standard separator
        let distances = normalized.split('|');
        
        // Standardize each distance
        return distances.map(distance => {
            // Remove extra spaces
            distance = distance.trim();
            
            // Extract the numeric part and the unit
            let match = distance.match(/(\d+)\s*K(?:M)?/i);
            if (match) {
                return `${match[1]}KM`;
            }
            
            return distance; // Return as is if no match
        });
    }

    // Extract numeric value from distance for sorting
    function getDistanceValue(distance) {
        const match = distance.match(/(\d+)/);
        return match ? parseInt(match[1]) : 0;
    }

    // Fetch photos data
    async function fetchPhotosData() {
        try {
            const response = await fetch(PHOTOS_URL);
            photosData = await response.json();
            
            // Process the photos data similar to races data
            photosData.forEach(photo => {
                if (photo.distance) {
                    photo.categories = parseDistanceString(photo.distance);
                }
                
                // Normalize organizer name
                if (photo.organizer) {
                    const upperOrganizer = photo.organizer.toUpperCase();
                    for (const [key, value] of Object.entries(organizerNormalizationMap)) {
                        if (upperOrganizer.includes(key)) {
                            photo.normalizedOrganizer = value;
                            break;
                        }
                    }
                    
                    // If no match found, use the original
                    if (!photo.normalizedOrganizer) {
                        photo.normalizedOrganizer = photo.organizer;
                    }
                }
                
                // Determine day of week (Saturday or Sunday)
                if (photo.date) {
                    const photoDate = new Date(photo.date);
                    photo.dayOfWeek = photoDate.getDay() === 6 ? 'Saturday' : 'Sunday';
                }
            });
        } catch (error) {
            console.error('Error fetching photos data:', error);
            throw error;
        }
    }

    // Fetch banners data
    async function fetchBannersData() {
        try {
            const response = await fetch(ADS_BANNER_URL);
            const data = await response.json();
            bannersData = data;
        } catch (error) {
            console.error('Error fetching banners data:', error);
            bannersData = [];
        }
    }

    // Setup event listeners
    function setupEventListeners() {
        // Toggle between Race Photos & Results and Race Calendar
        toggleButton.addEventListener('click', async () => {
            if (currentView === 'photos') {
                currentView = 'calendar';
                headerTitle.textContent = 'Race Calendar';
                toggleButton.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 19.5C4 20.3284 4.67157 21 5.5 21H18.5C19.3284 21 20 20.3284 20 19.5V8.5H4V19.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M8 3V8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M16 3V8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M4 8.5H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Race Photos & Results
                `;
                toggleButton.style.backgroundColor = '#FFF0F5';
                toggleButton.style.color = '#D81B60';
            } else {
                currentView = 'photos';
                headerTitle.textContent = 'Race Photos & Results';
                toggleButton.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M16 2V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M8 2V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M3 10H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Race Calendar
                `;
                toggleButton.style.backgroundColor = '#E8F5E9';
                toggleButton.style.color = '#2E7D32';
            }
            
            // Reset filters and search
            resetFiltersAndSearch();
            
            // Fetch data for the current view
            loadingSpinner.classList.remove('hidden');
            try {
                setupFilters();
                renderRaces();
            } catch (error) {
                console.error('Error switching views:', error);
            }
            loadingSpinner.classList.add('hidden');
        });

        // Refresh button
        refreshButton.addEventListener('click', async () => {
            loadingSpinner.classList.remove('hidden');
            try {
                await Promise.all([
                    fetchRacesData(),
                    fetchPhotosData(),
                    fetchBannersData()
                ]);
                setupFilters();
                renderRaces();
                setupBanners();
            } catch (error) {
                console.error('Error refreshing data:', error);
            }
            loadingSpinner.classList.add('hidden');
        });

        // Search input
        searchInput.addEventListener('input', handleSearch);
        searchInput.addEventListener('focus', () => {
            if (searchInput.value.trim().length > 0) {
                showSearchSuggestions();
            }
        });
        
        // Search input enter key
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query.length > 0) {
                    searchSuggestions.style.display = 'none';
                    renderRaces(query);
                }
            }
        });
        
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchSuggestions.contains(e.target)) {
                searchSuggestions.style.display = 'none';
            }
        });
    }

    // Reset filters and search
    function resetFiltersAndSearch() {
        // Reset filters
        filters = {
            distance: 'All',
            organizer: 'All',
            month: 'All',
            year: 'All',
            day: 'All'
        };
        
        // Reset filter UI
        document.querySelectorAll('.filter-options').forEach(optionsContainer => {
            const options = optionsContainer.querySelectorAll('.filter-option');
            options.forEach(option => {
                if (option.dataset.value === 'All') {
                    option.classList.add('selected');
                } else {
                    option.classList.remove('selected');
                }
            });
        });
        
        // Reset search
        searchInput.value = '';
    }

    // Setup filters
    function setupFilters() {
        // Get the appropriate data based on current view
        const data = currentView === 'photos' ? photosData : racesData;
        
        // Setup distance filter
        const distances = ['All'];
        data.forEach(item => {
            if (item.categories) {
                item.categories.forEach(category => {
                    if (!distances.includes(category)) {
                        distances.push(category);
                    }
                });
            }
        });
        
        // Sort distances in descending order
        distances.sort((a, b) => {
            if (a === 'All') return -1;
            if (b === 'All') return 1;
            return getDistanceValue(b) - getDistanceValue(a);
        });
        
        renderFilterOptions(distanceOptions, distances, 'distance');

        // Setup organizer filter - use predefined list
        renderFilterOptions(organizerOptions, predefinedOrganizers, 'organizer');

        // Setup month filter based on view
        setupMonthFilter(data);

        // Setup year filter
        setupYearFilter(data);

        // Setup day filter
        setupDayFilter(data);
    }

    // Setup month filter based on current view
    function setupMonthFilter(data) {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        
        const months = ['All'];
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        
        data.forEach(item => {
            if (!item.date) return;
            
            const itemDate = new Date(item.date);
            const itemMonth = itemDate.getMonth();
            const itemYear = itemDate.getFullYear();
            const monthName = monthNames[itemMonth];
            
            if (currentView === 'calendar') {
                // For calendar view, only show current and future months
                // or months from future years
                if ((itemYear === currentYear && itemMonth >= currentMonth) || 
                    itemYear > currentYear) {
                    if (!months.includes(monthName)) {
                        months.push(monthName);
                    }
                }
            } else {
                // For photos view, show all months
                if (!months.includes(monthName)) {
                    months.push(monthName);
                }
            }
        });
        
        // Sort months chronologically
        months.sort((a, b) => {
            if (a === 'All') return -1;
            if (b === 'All') return 1;
            return monthNames.indexOf(a) - monthNames.indexOf(b);
        });
        
        renderFilterOptions(monthOptions, months, 'month');
    }

    // Setup year filter
    function setupYearFilter(data) {
        const years = ['All'];
        data.forEach(item => {
            if (!item.date) return;
            
            const year = new Date(item.date).getFullYear().toString();
            if (!years.includes(year)) {
                years.push(year);
            }
        });
        
        // Sort years
        years.sort((a, b) => {
            if (a === 'All') return -1;
            if (b === 'All') return 1;
            return parseInt(a) - parseInt(b);
        });
        
        if (years.length > 2) { // 'All' + at least 2 years
            yearFilter.classList.remove('hidden');
            renderFilterOptions(yearOptions, years, 'year');
        } else {
            yearFilter.classList.add('hidden');
        }
    }

    // Setup day filter
    function setupDayFilter(data) {
        // Check if there are Saturday and Sunday races
        const hasSaturday = data.some(item => item.dayOfWeek === 'Saturday');
        const hasSunday = data.some(item => item.dayOfWeek === 'Sunday');
        
        // Create day options
        const days = ['All'];
        if (hasSaturday) days.push('Saturday');
        if (hasSunday) days.push('Sunday');
        
        // Show or hide day filter based on data
        if (days.length > 1) {
            dayFilter.classList.remove('hidden');
            renderFilterOptions(document.getElementById('dayOptions'), days, 'day');
        } else {
            dayFilter.classList.add('hidden');
        }
    }

    // Render filter options
    function renderFilterOptions(container, options, filterType) {
        container.innerHTML = '';
        options.forEach(option => {
            const optionElement = document.createElement('div');
            optionElement.className = `filter-option ${option === 'All' ? 'selected' : ''}`;
            optionElement.textContent = option;
            optionElement.dataset.value = option;
            
            optionElement.addEventListener('click', () => {
                // Remove selected class from all options
                container.querySelectorAll('.filter-option').forEach(el => {
                    el.classList.remove('selected');
                });
                
                // Add selected class to clicked option
                optionElement.classList.add('selected');
                
                // Update filter
                filters[filterType] = option;
                
                // Re-render races
                renderRaces();
            });
            
            container.appendChild(optionElement);
        });
    }

    // Handle search
    function handleSearch() {
        const query = searchInput.value.trim().toLowerCase();
        
        if (query.length > 0) {
            showSearchSuggestions();
            
            // Generate suggestions based on query
            const suggestions = [];
            
            // Get the appropriate data based on current view
            const data = currentView === 'photos' ? photosData : racesData;
            
            // Add organizer suggestions
            const organizers = new Set();
            data.forEach(item => {
                if (item.normalizedOrganizer) {
                    organizers.add(item.normalizedOrganizer);
                }
            });
            
            organizers.forEach(organizer => {
                if (organizer.toLowerCase().includes(query)) {
                    suggestions.push(organizer);
                }
            });
            
            // Add race name suggestions
            data.forEach(item => {
                const raceName = item.name.toLowerCase();
                
                if (raceName.includes(query) && !suggestions.includes(item.name)) {
                    suggestions.push(item.name);
                }
            });
            
            // Add date suggestions
            data.forEach(item => {
                if (!item.date) return;
                
                const date = new Date(item.date);
                
                // Various date formats
                const formats = [
                    date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
                    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                    `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`,
                    `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear().toString().slice(-2)}`,
                    `${date.getMonth() + 1}-${date.getDate()}-${date.getFullYear()}`,
                    `${date.getMonth() + 1}-${date.getDate()}-${date.getFullYear().toString().slice(-2)}`,
                    date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                ];
                
                for (const format of formats) {
                    if (format.toLowerCase().includes(query) && !suggestions.includes(format)) {
                        suggestions.push(format);
                        break; // Only add one date format per race
                    }
                }
            });
            
            renderSearchSuggestions(suggestions.slice(0, 5));
        } else {
            searchSuggestions.style.display = 'none';
        }
    }

    // Show search suggestions
    function showSearchSuggestions() {
        searchSuggestions.style.display = 'block';
    }

    // Render search suggestions
    function renderSearchSuggestions(suggestions) {
        searchSuggestions.innerHTML = '';
        
        if (suggestions.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'suggestion-item';
            noResults.textContent = 'No results found';
            searchSuggestions.appendChild(noResults);
            return;
        }
        
        suggestions.forEach(suggestion => {
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'suggestion-item';
            suggestionItem.textContent = suggestion;
            
            suggestionItem.addEventListener('click', () => {
                searchInput.value = suggestion;
                searchSuggestions.style.display = 'none';
                
                // Filter races based on selection
                renderRaces(suggestion);
            });
            
            searchSuggestions.appendChild(suggestionItem);
        });
    }

    // Setup banners
    function setupBanners() {
        if (bannersData && bannersData.length > 0) {
            // Check if any banner has photoURL
            let hasValidBanners = false;
            
            for (const banner of bannersData) {
                if (banner.photoURL && Array.isArray(banner.photoURL) && banner.photoURL.some(url => url && url.trim() !== '')) {
                    hasValidBanners = true;
                    break;
                }
            }
            
            if (hasValidBanners) {
                bannerSection.classList.remove('hidden');
                renderBanners();
            } else {
                bannerSection.classList.add('hidden');
            }
        } else {
            bannerSection.classList.add('hidden');
        }
    }

    // Render banners
    function renderBanners() {
        bannerGrid.innerHTML = '';
        
        bannersData.forEach(banner => {
            if (!banner.photoURL || !Array.isArray(banner.photoURL) || !banner.photoURL.some(url => url && url.trim() !== '')) {
                return;
            }
            
            banner.photoURL.forEach((photoUrl, index) => {
                if (!photoUrl || photoUrl.trim() === '') return;
                
                const clickUrl = banner.clickURL && banner.clickURL[index] ? banner.clickURL[index] : '#';
                
                const bannerItem = document.createElement('a');
                bannerItem.href = clickUrl;
                bannerItem.className = 'banner-item';
                bannerItem.target = '_blank';
                
                const bannerImage = document.createElement('img');
                bannerImage.src = photoUrl;
                bannerImage.className = 'banner-image';
                bannerImage.alt = 'Banner';
                
                bannerItem.appendChild(bannerImage);
                bannerGrid.appendChild(bannerItem);
            });
        });
    }

    // Match date patterns in search query
    function matchDatePattern(query, itemDate) {
        // Convert item date to various formats for matching
        const month = itemDate.getMonth() + 1;
        const day = itemDate.getDate();
        const year = itemDate.getFullYear();
        const shortYear = year.toString().slice(-2);
        const monthName = itemDate.toLocaleDateString('en-US', { month: 'long' });
        const shortMonthName = itemDate.toLocaleDateString('en-US', { month: 'short' }).replace('.', '');
        
        // Array of possible date formats
        const dateFormats = [
            `${monthName} ${day}, ${year}`.toLowerCase(),
            `${shortMonthName} ${day}, ${year}`.toLowerCase(),
            `${shortMonthName} ${day} ${year}`.toLowerCase(),
            `${month}/${day}/${year}`.toLowerCase(),
            `${month}/${day}/${shortYear}`.toLowerCase(),
            `${month}-${day}-${year}`.toLowerCase(),
            `${month}-${day}-${shortYear}`.toLowerCase(),
            `${month}/${day}`.toLowerCase(),
            `${month}-${day}`.toLowerCase(),
            `${monthName} ${year}`.toLowerCase(),
            `${shortMonthName} ${year}`.toLowerCase(),
            `${monthName}`.toLowerCase(),
            `${shortMonthName}`.toLowerCase()
        ];
        
        // Add formats with leading zeros
        const paddedMonth = month.toString().padStart(2, '0');
        const paddedDay = day.toString().padStart(2, '0');
        
        dateFormats.push(
            `${paddedMonth}/${paddedDay}/${year}`.toLowerCase(),
            `${paddedMonth}/${paddedDay}/${shortYear}`.toLowerCase(),
            `${paddedMonth}-${paddedDay}-${year}`.toLowerCase(),
            `${paddedMonth}-${paddedDay}-${shortYear}`.toLowerCase(),
            `${paddedMonth}/${paddedDay}`.toLowerCase(),
            `${paddedMonth}-${paddedDay}`.toLowerCase()
        );
        
        // Check if query matches any of the date formats
        return dateFormats.some(format => format.includes(query));
    }

    // Get category color class
    function getCategoryColorClass(category) {
        const value = getDistanceValue(category);
        
        if (value >= 100) return 'cat-100k';
        if (value >= 75) return 'cat-75k';
        if (value >= 50) return 'cat-50k';
        if (value >= 42) return 'cat-42k';
        if (value >= 32) return 'cat-32k';
        if (value >= 25) return 'cat-25k';
        if (value >= 21) return 'cat-21k';
        if (value >= 16) return 'cat-16k';
        if (value >= 15) return 'cat-15k';
        if (value >= 12) return 'cat-12k';
        if (value >= 10) return 'cat-10k';
        if (value >= 8) return 'cat-8k';
        if (value >= 6) return 'cat-6k';
        if (value >= 5) return 'cat-5k';
        if (value >= 4) return 'cat-4k';
        if (value >= 3) return 'cat-3k';
        if (value >= 2) return 'cat-2k';
        if (value >= 1) return 'cat-1k';
        
        return 'cat-other';
    }

    // Render races
    function renderRaces(searchQuery = '') {
        raceList.innerHTML = '';
        
        // Get the appropriate data based on current view
        let data = currentView === 'photos' ? photosData : racesData;
        
        // Filter by view (photos or calendar)
        const currentDate = new Date();
        
        if (currentView === 'calendar') {
            // Show only future races
            data = data.filter(item => {
                if (!item.date) return false;
                const itemDate = new Date(item.date);
                return itemDate > currentDate;
            });
        }
        
        // Apply filters
        if (filters.distance !== 'All') {
            data = data.filter(item => {
                if (!item.categories) return false;
                return item.categories.some(category => category === filters.distance);
            });
        }
        
        if (filters.organizer !== 'All') {
            if (filters.organizer === 'Others') {
                const mainOrganizers = ['RUNRIO', 'SMOKE10', 'GREEN MEDIA'];
                data = data.filter(item => 
                    !mainOrganizers.includes(item.normalizedOrganizer)
                );
            } else {
                data = data.filter(item => 
                    item.normalizedOrganizer === filters.organizer
                );
            }
        }
        
        if (filters.month !== 'All') {
            const monthIndex = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].indexOf(filters.month);
            data = data.filter(item => {
                if (!item.date) return false;
                const itemDate = new Date(item.date);
                return itemDate.getMonth() === monthIndex;
            });
        }
        
        if (filters.year !== 'All') {
            data = data.filter(item => {
                if (!item.date) return false;
                const itemDate = new Date(item.date);
                return itemDate.getFullYear().toString() === filters.year;
            });
        }
        
        if (filters.day !== 'All') {
            data = data.filter(item => item.dayOfWeek === filters.day);
        }
        
        // Apply search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            data = data.filter(item => {
                const raceName = item.name.toLowerCase();
                const organizer = item.organizer ? item.organizer.toLowerCase() : '';
                
                if (!item.date) return raceName.includes(query) || organizer.includes(query);
                
                const itemDate = new Date(item.date);
                
                // Check for distance + organizer combinations
                let categoryMatch = false;
                if (item.categories) {
                    categoryMatch = item.categories.some(category => {
                        const combinedSearch = `${organizer} ${category.toLowerCase()}`;
                        const reverseCombinedSearch = `${category.toLowerCase()} ${organizer}`;
                        return combinedSearch.includes(query) || reverseCombinedSearch.includes(query);
                    });
                }
                
                // Check for date patterns
                const dateMatch = matchDatePattern(query, itemDate);
                
                return raceName.includes(query) || 
                       organizer.includes(query) || 
                       categoryMatch ||
                       dateMatch;
            });
        }
        
        // Sort data by date
        data.sort((a, b) => {
            if (!a.date) return 1;
            if (!b.date) return -1;
            
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return currentView === 'photos' ? dateB - dateA : dateA - dateB;
        });
        
        // Render data
        if (data.length === 0) {
            raceList.innerHTML = `<div class="p-4 text-center">No races found</div>`;
            return;
        }
        
        data.forEach(item => {
            const raceCard = createRaceCard(item);
            raceList.appendChild(raceCard);
        });
    }

    // Create race card
    function createRaceCard(item) {
        const raceCard = document.createElement('div');
        raceCard.className = 'race-card';
        
        let formattedDate = '';
        let dayName = '';
        let restOfDate = '';
        
        if (item.date) {
            const itemDate = new Date(item.date);
            formattedDate = itemDate.toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric',
                weekday: 'long'
            });
            dayName = formattedDate.split(',')[0];
            restOfDate = formattedDate.substring(formattedDate.indexOf(',') + 1).trim();
        }
        
        // Race info section
        const raceInfo = document.createElement('div');
        raceInfo.className = 'race-info';
        
        // Race name - make it clickable for calendar view
        if (currentView === 'calendar' && item.website) {
            const raceName = document.createElement('a');
            raceName.className = 'race-name poppins-black';
            raceName.textContent = item.name.toUpperCase();
            raceName.href = item.website;
            raceName.target = '_blank';
            raceInfo.appendChild(raceName);
        } else {
            const raceName = document.createElement('div');
            raceName.className = 'race-name poppins-black';
            raceName.textContent = item.name.toUpperCase();
            raceInfo.appendChild(raceName);
        }
        
        // Race location
        if (item.location) {
            const raceLocation = document.createElement('div');
            raceLocation.className = 'race-location poppins-regular';
            raceLocation.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 7.61305 3.94821 5.32387 5.63604 3.63604C7.32387 1.94821 9.61305 1 12 1C14.3869 1 16.6761 1.94821 18.364 3.63604C20.0518 5.32387 21 7.61305 21 10Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                ${item.location}
            `;
            raceInfo.appendChild(raceLocation);
        }
        
        // Race date
        if (item.date) {
            const raceDateTime = document.createElement('div');
            raceDateTime.className = 'race-date poppins-regular';
            raceDateTime.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M16 2V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M8 2V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M3 10H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                ${restOfDate} (${dayName})
            `;
            raceInfo.appendChild(raceDateTime);
        }
        
        // Race organizer
        if (item.organizer) {
            const raceOrganizer = document.createElement('div');
            raceOrganizer.className = 'race-organizer poppins-regular';
            raceOrganizer.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Organizer: ${item.organizer}
            `;
            raceInfo.appendChild(raceOrganizer);
        }
        
        // Photographers section (only for photos view)
        if (currentView === 'photos' && item.photographers && item.photographers.length > 0) {
            const photographersSection = document.createElement('div');
            photographersSection.className = 'photographers-section';
            
            const photographersTitle = document.createElement('div');
            photographersTitle.className = 'photographers-title poppins-black';
            photographersTitle.textContent = 'List of Photographers';
            photographersSection.appendChild(photographersTitle);
            
            const photographersList = document.createElement('div');
            photographersList.className = 'photographers-list';
            
            item.photographers.forEach((photographer, index) => {
                const photographerButton = document.createElement('a');
                photographerButton.className = 'photographer-button';
                photographerButton.textContent = photographer;
                photographerButton.href = item.link && item.link[index] ? item.link[index] : '#';
                photographerButton.target = '_blank';
                photographersList.appendChild(photographerButton);
            });
            
            photographersSection.appendChild(photographersList);
            raceInfo.appendChild(photographersSection);
        }
        
        raceCard.appendChild(raceInfo);
        
        // Race categories section
        const raceCategories = document.createElement('div');
        raceCategories.className = 'race-categories';
        
        // Categories list
        const categoriesList = document.createElement('div');
        categoriesList.className = 'categories-list';
        
        if (item.categories && item.categories.length > 0) {
            item.categories.forEach(category => {
                const categoryTag = document.createElement('div');
                const categoryClass = getCategoryColorClass(category);
                
                categoryTag.className = `category-tag ${categoryClass}`;
                categoryTag.textContent = category;
                categoriesList.appendChild(categoryTag);
            });
        }
        
        raceCategories.appendChild(categoriesList);
        
        // Action button
        const actionButton = document.createElement('button');
        actionButton.className = 'action-button';
        
        if (currentView === 'photos') {
            actionButton.className += ' results-button';
            actionButton.textContent = 'Results';
            
            if (item.resultsLink) {
                actionButton.addEventListener('click', () => {
                    window.open(item.resultsLink, '_blank');
                });
            }
        } else {
            // Use status from JSON for calendar view
            if (item.status === 'Event is Full') {
                actionButton.className += ' full-button';
                actionButton.textContent = 'Event is Full';
                
                if (item.website) {
                    actionButton.addEventListener('click', () => {
                        window.open(item.website, '_blank');
                    });
                }
            } else if (item.status === 'Opening Soon') {
                actionButton.className += ' soon-button disabled';
                actionButton.textContent = 'Opening Soon';
                actionButton.disabled = true;
            } else {
                actionButton.className += ' register-button';
                actionButton.textContent = 'Register';
                
                if (item.registrationLink) {
                    actionButton.addEventListener('click', () => {
                        window.open(item.registrationLink, '_blank');
                    });
                } else if (item.website) {
                    actionButton.addEventListener('click', () => {
                        window.open(item.website, '_blank');
                    });
                }
            }
        }
        
        raceCategories.appendChild(actionButton);
        raceCard.appendChild(raceCategories);
        
        return raceCard;
    }
</script>