
function navigateTo(url) {
    if (window.location.pathname !== url) {
        // Update the browser's history stack
        history.pushState(null, null, url);
        router();
    }
}


function router() {
    // Get the current path
    const path = window.location.pathname;

    const helpPage = document.getElementById('help-page');
    const mainContent = document.getElementById('main-content');
    const homePage = document.getElementById('home-page');

    if (path === '/help') {
        helpPage.style.display = 'block';
        mainContent.style.visibility = 'hidden';
        homePage.style.display = 'none';
    } else if (path === '/home') {
        homePage.style.display = 'block';
        mainContent.style.visibility = 'hidden';
        helpPage.style.display = 'none';
    } else {
        mainContent.style.visibility = 'visible';
        homePage.style.display = 'none';
        helpPage.style.display = 'none';
    }
}


function initRouter() {
    // Event listener for clicks on the "Get Help" link
    document.addEventListener('click', (event) => {
        if (event.target.matches('[data-link]')) {
            event.preventDefault();
            const url = event.target.getAttribute('data-link');
            navigateTo(url);
        }
    });

    // Listen for popstate event to handle browser back and forward buttons
    window.addEventListener('popstate', router);

    // Set up the initial page
    router();
}

export { initRouter };
