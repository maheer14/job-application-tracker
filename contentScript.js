console.log("Content script loaded on:", window.location.href);

document.addEventListener('change', function(e) {
    console.log("Change event detected on:", e.target);
    
    if (e.target.type === 'file') {
        console.log("File input detected!");
        const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
        
        console.log("Found file inputs:", inputs);
        
        inputs.forEach(input => {
            console.log("Input:", input.name, "Files:", Array.from(input.files).map(f => f.name));
        });

        browser.runtime.sendMessage({
            type: 'FILE_UPLOAD_DETECTED',
            pageUrl: window.location.href,
            fileInputs: inputs.map(input => ({
                name: input.name,
                files: Array.from(input.files).map(f => f.name)
            }))
        }).then(() => {
            console.log("Message sent successfully");
        }).catch(err => {
            console.error("Failed to send message:", err);
        });
    }
});