
function navigateTo(url) {
    // Update the browser's history stack
    history.pushState(null, null, url);
    router();
  }


function router() {
    // Get the current path
    const path = window.location.pathname;

    if (path === '/help') {
        document.getElementById('help-page').style.display = 'block';
        document.querySelector('.read-depth-container').style.visibility = 'hidden';
        document.querySelector('.bottom-container').style.visibility = 'hidden';
    } else {
        document.querySelector('.read-depth-container').style.visibility = 'visible';
        document.querySelector('.bottom-container').style.visibility = 'visible';
        // Ensure "Get Help" page is hidden
        document.getElementById('help-page').style.display = 'none';
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
