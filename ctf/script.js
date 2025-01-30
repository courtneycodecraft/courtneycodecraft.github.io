let canvas, ctx, originalImageData;

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded');
    initializeCanvas();
});

function initializeCanvas() {
    canvas = document.getElementById('imageCanvas');
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }
    
    ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Could not get canvas context');
        return;
    }
    
    const sourceImage = document.getElementById('sourceImage');
    if (!sourceImage) {
        console.error('Source image not found');
        return;
    }
    
    console.log('Setting up image load handler');
    
    function handleImageLoad() {
        console.log('Image loaded, dimensions:', sourceImage.naturalWidth, 'x', sourceImage.naturalHeight);
        
        // Set canvas dimensions to match image
        canvas.width = sourceImage.naturalWidth;
        canvas.height = sourceImage.naturalHeight;
        
        // Draw image to canvas
        ctx.drawImage(sourceImage, 0, 0);
        
        try {
            // Store original image data
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            originalImageData = new Uint8ClampedArray(imageData.data);
            console.log('Image data stored, length:', originalImageData.length);
            
            // Hide source image and show canvas
            sourceImage.style.display = 'none';
            canvas.style.display = 'block';
            
            // Set up event listeners
            createEventListeners();
            
            // Initial image update
            updateImage();
        } catch (error) {
            console.error('Error processing image:', error);
        }
    }
    
    if (sourceImage.complete) {
        console.log('Image already loaded');
        handleImageLoad();
    } else {
        console.log('Waiting for image to load');
        sourceImage.onload = handleImageLoad;
    }
}

function enhanceVisibility(values, mask) {
    const newValues = new Uint8ClampedArray(values.length);
    
    // Special handling for LSB
    const isOnlyLSB = mask === 1;
    const isOnlyLowBits = mask <= 4; // For bit1 and/or bit2 and/or bit3
    
    for (let i = 0; i < values.length; i += 4) {
        for (let j = 0; j < 3; j++) { // RGB channels
            let val = values[i + j];
            
            if (isOnlyLSB) {
                // Extreme boost for LSB - make 0 black and 1 bright
                newValues[i + j] = (val & 1) ? 255 : 0;
            } 
            else if (isOnlyLowBits) {
                // Strong boost for low bits
                val = val & mask;
                newValues[i + j] = val * (255 / mask);
            }
            else {
                // Normal enhancement for other bit combinations
                val = val & mask;
                const activeBits = countActiveBits(mask);
                const multiplier = Math.max(1, 9 - activeBits);
                newValues[i + j] = Math.min(255, val * multiplier);
            }
        }
        newValues[i + 3] = 255; // Alpha channel
    }
    return newValues;
}

function countActiveBits(mask) {
    let count = 0;
    for (let i = 0; i < 8; i++) {
        if (mask & (1 << i)) count++;
    }
    return count;
}

function updateImage() {
    if (!originalImageData) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const newImageData = imageData.data;

    const originalSelected = document.getElementById('originalImage').checked;
    const redChannel = document.getElementById('redChannel').checked;
    const greenChannel = document.getElementById('greenChannel').checked;
    const blueChannel = document.getElementById('blueChannel').checked;

    let mask = 255;

    if (!originalSelected) {
        mask = 0;
        if (document.getElementById('bit128').checked) mask |= 128;
        if (document.getElementById('bit64').checked) mask |= 64;
        if (document.getElementById('bit32').checked) mask |= 32;
        if (document.getElementById('bit16').checked) mask |= 16;
        if (document.getElementById('bit8').checked) mask |= 8;
        if (document.getElementById('bit4').checked) mask |= 4;
        if (document.getElementById('bit2').checked) mask |= 2;
        if (document.getElementById('bit1').checked) mask |= 1;
    }

    // First apply the mask
    for (let i = 0; i < originalImageData.length; i += 4) {
        if (originalSelected) {
            newImageData[i] = originalImageData[i];
            newImageData[i + 1] = originalImageData[i + 1];
            newImageData[i + 2] = originalImageData[i + 2];
        } else {
            newImageData[i] = redChannel ? (originalImageData[i] & mask) : 0;
            newImageData[i + 1] = greenChannel ? (originalImageData[i + 1] & mask) : 0;
            newImageData[i + 2] = blueChannel ? (originalImageData[i + 2] & mask) : 0;
        }
        newImageData[i + 3] = 255;
    }

    // Then enhance visibility if not in original mode
    if (!originalSelected) {
        const enhancedData = enhanceVisibility(newImageData, mask);
        for (let i = 0; i < enhancedData.length; i++) {
            newImageData[i] = enhancedData[i];
        }
    }

    ctx.putImageData(imageData, 0, 0);
}

function createEventListeners() {
    document.querySelectorAll('.channels input').forEach(input => {
        input.addEventListener('change', handleChannelChange);
    });
    
    document.querySelectorAll('.bits input').forEach(input => {
        input.addEventListener('change', updateImage);
    });
}

function handleChannelChange() {
    const originalSelected = document.getElementById('originalImage').checked;
    document.querySelectorAll('.bits input').forEach(checkbox => {
        checkbox.disabled = originalSelected;
        if (originalSelected || !checkbox.checked) {
            checkbox.checked = true;
        }
    });
    updateImage();
}
