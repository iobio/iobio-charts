
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

    if (path === '/help') {
        helpPage.style.display = 'block';
        mainContent.style.visibility = 'hidden';
    } else {
        helpPage.style.display = 'none';
        mainContent.style.visibility = 'visible';
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
