console.log("Background script initialized");

// ====================== Helper Functions ======================
function extractCompanyName(url) {
  try {
    const domain = new URL(url).hostname;
    return domain.replace('www.', '')
                .replace('.com', '')
                .replace('.jobs', '')
                .replace('careers.', '');
  } catch (e) {
    console.warn("Couldn't extract company from URL:", url);
    return "Unknown Company";
  }
}

function extractPositionTitle() {
  try {
    // LinkedIn detection
    if (document.querySelector('[data-tracking-control-name="public_jobs_jserp-job-title"]')) {
      return document.querySelector('[data-tracking-control-name="public_jobs_jserp-job-title"]').textContent.trim();
    }
    // Indeed detection
    if (document.querySelector('.jobsearch-JobInfoHeader-title')) {
      return document.querySelector('.jobsearch-JobInfoHeader-title').textContent.trim();
    }
    // Greenhouse detection
    if (document.querySelector('.app-title')) {
      return document.querySelector('.app-title').textContent.trim();
    }
    // Fallback to page title parsing
    return document.title.split(' - ')[0]
                        .split(' | ')[0]
                        .replace('Apply for ', '')
                        .replace('Job Application: ', '');
  } catch (e) {
    console.warn("Couldn't extract position title");
    return "Unknown Position";
  }
}

// ====================== Application Processing ======================
async function processFileUpload(request) {
  try {
    console.log("Processing file upload for:", request.pageUrl);
    
    // Get current applications
    const { applications: currentApps = [] } = await browser.storage.local.get('applications');
    const company = extractCompanyName(request.pageUrl);
    const position = extractPositionTitle();
    
    console.log("Identified:", company, "-", position);
    
    // Find existing application
    const existingAppIndex = currentApps.findIndex(app => 
      app.company === company && app.position === position
    );
    
    let updatedApplications = [...currentApps];
    
    if (existingAppIndex >= 0) {
      // Update existing application
      console.log("Updating existing application");
      const existingApp = updatedApplications[existingAppIndex];
      
      request.fileInputs.forEach(newInput => {
        const existingInputIndex = existingApp.documents.findIndex(
          d => d.name === newInput.name
        );
        
        if (existingInputIndex >= 0) {
          // Merge files, avoiding duplicates
          existingApp.documents[existingInputIndex].files = [
            ...new Set([
              ...existingApp.documents[existingInputIndex].files,
              ...newInput.files
            ])
          ];
        } else {
          // Add new document type
          existingApp.documents.push(newInput);
        }
      });
      
      existingApp.lastUpdated = new Date().toISOString();
    } else {
      // Create new application
      console.log("Creating new application entry");
      updatedApplications.push({
        id: crypto.randomUUID(),
        url: request.pageUrl,
        date: new Date().toISOString(),
        documents: request.fileInputs,
        company,
        position,
        status: 'Applied',
        notes: ''
      });
    }
    
    // Update local storage
    await browser.storage.local.set({ applications: updatedApplications });
    console.log("Local storage updated with", updatedApplications.length, "applications");
    
    return {
      success: true,
      applications: updatedApplications
    };
  } catch (error) {
    console.error("Error processing file upload:", error);
    return { success: false, error: error.message };
  }
}

// ====================== Message Handling ======================
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'FILE_UPLOAD_DETECTED':
      processFileUpload(request).then(sendResponse);
      return true; // Keep message channel open for async response
    
    case 'GET_APPLICATIONS':
      browser.storage.local.get('applications').then(({ applications }) => {
        sendResponse({ applications: applications || [] });
      });
      return true;
    
    case 'UPDATE_APPLICATION':
      browser.storage.local.get('applications').then(({ applications = [] }) => {
        const updated = applications.map(app => 
          app.id === request.id ? { ...app, ...request.updates } : app
        );
        browser.storage.local.set({ applications: updated });
        sendResponse({ success: true });
      });
      return true;
    
    case 'DELETE_APPLICATION':
      browser.storage.local.get('applications').then(({ applications = [] }) => {
        const filtered = applications.filter(app => app.id !== request.id);
        browser.storage.local.set({ applications: filtered });
        sendResponse({ success: true });
      });
      return true;
    
    default:
      sendResponse({ success: false, error: "Unknown message type" });
  }
});

// ====================== Startup Initialization ======================
async function initializeStorage() {
  try {
    const { applications } = await browser.storage.local.get('applications');
    if (!applications) {
      await browser.storage.local.set({ applications: [] });
      console.log("Initialized empty applications array");
    }
  } catch (error) {
    console.error("Storage initialization failed:", error);
  }
}

// Initialize when extension loads
initializeStorage();