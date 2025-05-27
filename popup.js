document.addEventListener('DOMContentLoaded', () => {
  const applicationsList = document.getElementById('applications-list');
  const searchInput = document.getElementById('search');
  const statusFilter = document.getElementById('status-filter');
  
  let applications = [];
  
  // Load applications
  browser.storage.local.get(['applications']).then((result) => {
    applications = result.applications || [];
    renderApplications(applications);
  });
  
  // Search and filter functionality
  searchInput.addEventListener('input', filterApplications);
  statusFilter.addEventListener('change', filterApplications);
  
  function filterApplications() {
    const searchTerm = searchInput.value.toLowerCase();
    const statusFilterValue = statusFilter.value;
    
    const filtered = applications.filter(app => {
      const matchesSearch = 
        app.company.toLowerCase().includes(searchTerm) ||
        app.position.toLowerCase().includes(searchTerm);
      const matchesStatus = 
        statusFilterValue === 'all' || app.status === statusFilterValue;
      return matchesSearch && matchesStatus;
    });
    
    renderApplications(filtered);
  }
  
  function renderApplications(apps) {
    applicationsList.innerHTML = '';
    
    if (apps.length === 0) {
      applicationsList.innerHTML = '<p class="no-results">No applications found</p>';
      return;
    }
    
    apps.forEach(app => {
      const item = document.createElement('div');
      item.className = 'application-item';
      
      // Format date
      const appDate = new Date(app.date);
      const formattedDate = appDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      
      // Create document list
      const documentsList = app.documents.map(doc => `
        <li class="document-item">
          <i class="fas fa-file-alt"></i>
          <span>${doc.files.join(', ')}</span>
        </li>
      `).join('');
      
      item.innerHTML = `
        <div class="application-header">
          <div>
            <div class="company-name">${app.company}</div>
            <div class="position-title">${app.position}</div>
          </div>
          <div class="status-badge status-${app.status.toLowerCase()}">${app.status}</div>
        </div>
        <div class="application-meta">
          <span><i class="far fa-calendar-alt"></i> ${formattedDate}</span>
        </div>
        <ul class="documents-list">${documentsList}</ul>
        <div class="actions">
          <button class="action-btn view-btn" data-url="${app.url}">
            <i class="fas fa-external-link-alt"></i> View Posting
          </button>
          <button class="action-btn note-btn">
            <i class="far fa-edit"></i> Add Note
          </button>
        </div>
      `;
      
      applicationsList.appendChild(item);
    });
    
    // Add event listeners to buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        browser.tabs.create({ url: btn.dataset.url });
      });
    });
  }
});