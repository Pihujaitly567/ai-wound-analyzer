document.addEventListener('DOMContentLoaded', () => {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    const uploadContent = document.querySelector('.upload-content');
    const previewArea = document.getElementById('preview-area');
    const imagePreview = document.getElementById('image-preview');
    const resetBtn = document.getElementById('reset-btn');
    const analyzeBtn = document.getElementById('analyze-btn');
    const loadingState = document.getElementById('loading-state');
    const resultArea = document.getElementById('result-area');
    const actionArea = document.getElementById('action-area');
    
    // Result elements
    const resultStatus = document.getElementById('result-status');
    const resultClass = document.getElementById('result-class');
    const resultConfidence = document.getElementById('result-confidence');
    const resultRecommendation = document.getElementById('result-recommendation');


    let currentFile = null;

    // Handle Drag & Drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            if (!currentFile) uploadArea.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.remove('dragover');
        }, false);
    });

    uploadArea.addEventListener('drop', (e) => {
        if (currentFile) return;
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }, false);

    // Click to upload
    uploadArea.addEventListener('click', (e) => {
        if (!currentFile && e.target !== resetBtn) {
            fileInput.click();
        }
    });

    fileInput.addEventListener('change', function() {
        handleFiles(this.files);
    });

    function handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                currentFile = file;
                showPreview(file);
            } else {
                alert('Please upload an image file.');
            }
        }
    }

    function showPreview(file) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = function() {
            imagePreview.src = reader.result;
            uploadContent.classList.add('hidden');
            previewArea.classList.remove('hidden');
            uploadArea.style.borderStyle = 'solid';
            uploadArea.style.cursor = 'default';
            analyzeBtn.disabled = false;
            
            // hide result if exists
            resultArea.classList.add('hidden');
        }
    }

    resetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentFile = null;
        fileInput.value = '';
        uploadContent.classList.remove('hidden');
        previewArea.classList.add('hidden');
        uploadArea.style.borderStyle = 'dashed';
        uploadArea.style.cursor = 'pointer';
        analyzeBtn.disabled = true;
        resultArea.classList.add('hidden');
    });

    analyzeBtn.addEventListener('click', async () => {
        if (!currentFile) return;

        // UI updates for loading
        actionArea.classList.add('hidden');
        loadingState.classList.remove('hidden');
        resultArea.classList.add('hidden');

        const formData = new FormData();
        formData.append('image', currentFile);

        try {
            const response = await fetch('/predict', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Server returned an error');
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            showResult(data);
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred during verification. Check console for details.');
            actionArea.classList.remove('hidden');
        } finally {
            loadingState.classList.add('hidden');
        }
    });

    function showResult(data) {
        const { category, class: predictedClass, message, confidence } = data;
        
        resultStatus.className = 'status-heading'; // Reset classes
        
        if (category === 'Healing') {
            resultStatus.innerHTML = 'Healing <span style="font-size: 0.8em">✅</span>';
            resultStatus.classList.add('status-healing');
            resultArea.style.borderTop = '5px solid var(--success-color)';
        } else {
            resultStatus.innerHTML = 'Risky <span style="font-size: 0.8em">⚠️</span>';
            resultStatus.classList.add('status-risky');
            resultArea.style.borderTop = '5px solid var(--warning-color)';
        }

        resultClass.textContent = predictedClass;
        if (confidence !== undefined) {
             resultConfidence.textContent = Number(confidence).toFixed(2) + '%';
        } else {
             resultConfidence.textContent = 'N/A';
        }
        resultRecommendation.textContent = message;

        resultArea.classList.remove('hidden');
        actionArea.classList.remove('hidden');
        analyzeBtn.disabled = true; // wait for user to reset
    }
});
