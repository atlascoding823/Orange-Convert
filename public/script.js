document.getElementById('upload-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const formData = new FormData(this);
  const password = document.getElementById('password-input').value;
  const format = document.getElementById('format-select').value;
  const files = document.getElementById("file-input").files;

  // Check if at least one file is selected
  if (files.length === 0) {
    document.getElementById('status').textContent = 'Please select at least one file.';
    return;
  }

  // Add files to FormData (one by one)
  for (let i = 0; i < files.length; i++) {
    formData.append("files", files[i]);
  }

  // Add password if provided
  if (password) {
    formData.append("password", password);
  }

  // Ensure a format is selected
  if (format == null) {
    document.getElementById('status').textContent = 'Please select a format to convert to.';
    return;
  }

  formData.append("format", format);

  // Try to send the form data to the server for conversion
  try {
    const response = await fetch('/convert', {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `converted-files-${Date.now()}.zip`;
      link.click();
      document.getElementById('status').textContent = 'Files converted and downloaded successfully.';
    } else {
      document.getElementById('status').textContent = 'Error converting files.';
    }
  } catch (error) {
    console.error('Error:', error);
    document.getElementById('status').textContent = 'An error occurred during conversion.';
  }
});

// Handle URL upload
document.getElementById('upload-url-btn').addEventListener('click', async function () {
  const url = document.getElementById('url-input').value;
  if (!url) {
    document.getElementById('status').textContent = 'Please provide a valid URL.';
    return;
  }

  // Sending the URL to the server for conversion
  try {
    const response = await fetch('/upload-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url })
    });

    if (response.ok) {
      document.getElementById('status').textContent = 'File uploaded successfully from URL.';
    } else {
      document.getElementById('status').textContent = 'Error uploading file from URL.';
    }
  } catch (error) {
    console.error('Error:', error);
    document.getElementById('status').textContent = 'An error occurred while uploading the file from URL.';
  }
});
