import { pipeline, env, RawImage } from '@huggingface/transformers';

// Configure transformers.js to always download models
env.allowLocalModels = false;
env.useBrowserCache = true;

const MAX_IMAGE_DIMENSION = 512;

let segmenterInstance: any = null;

async function getSegmenter() {
  if (!segmenterInstance) {

    segmenterInstance = await pipeline(
      'image-segmentation', 
      'briaai/RMBG-1.4',
      { device: 'wasm' }
    );
  }
  return segmenterInstance;
}

function resizeImageIfNeeded(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, image: HTMLImageElement) {
  let width = image.naturalWidth;
  let height = image.naturalHeight;

  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    if (width > height) {
      height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
      width = MAX_IMAGE_DIMENSION;
    } else {
      width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
      height = MAX_IMAGE_DIMENSION;
    }
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(image, 0, 0, width, height);
  return width !== image.naturalWidth;
}

export const removeBackground = async (imageElement: HTMLImageElement): Promise<Blob> => {
  try {

    
    const segmenter = await getSegmenter();
    
    // Convert HTMLImageElement to canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) throw new Error('Could not get canvas context');
    
    // Resize image if needed and draw it to canvas
    const wasResized = resizeImageIfNeeded(canvas, ctx, imageElement);

    
    // Get image data as base64
    const imageData = canvas.toDataURL('image/png');

    
    // Process the image with the segmentation model

    const result = await segmenter(imageData);
    

    
    if (!result || !Array.isArray(result) || result.length === 0) {
      throw new Error('Invalid segmentation result');
    }

    // Get the mask from the result
    const maskData = result[0];
    
    if (maskData.mask instanceof RawImage) {
      // briaai/RMBG-1.4 returns a RawImage mask
      const mask = maskData.mask;
      
      // Create output canvas
      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = canvas.width;
      outputCanvas.height = canvas.height;
      const outputCtx = outputCanvas.getContext('2d');
      
      if (!outputCtx) throw new Error('Could not get output canvas context');
      
      // Draw original image
      outputCtx.drawImage(canvas, 0, 0);
      
      // Get image data
      const outputImageData = outputCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
      const data = outputImageData.data;
      
      // Resize mask to match canvas size if needed
      const resizedMask = await mask.resize(outputCanvas.width, outputCanvas.height);
      const maskPixels = resizedMask.data;
      
      // Apply mask to alpha channel
      for (let i = 0; i < maskPixels.length; i++) {
        data[i * 4 + 3] = maskPixels[i];
      }
      
      outputCtx.putImageData(outputImageData, 0, 0);

      
      return new Promise((resolve, reject) => {
        outputCanvas.toBlob(
          (blob) => {
            if (blob) {

              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          },
          'image/png',
          1.0
        );
      });
    }
    
    throw new Error('Unexpected mask format');
  } catch (error) {
    console.error('Error removing background:', error);
    throw error;
  }
}

export const loadImage = (file: Blob): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};
