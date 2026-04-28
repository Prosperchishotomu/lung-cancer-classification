/**
 * Client-side image utilities for pre-processing before upload.
 *
 * Resizing images on the client before sending them to the backend
 * dramatically reduces:
 *  - Network transfer size (a 4K scan might be 5 MB; resized it's <100 KB)
 *  - Backend decoding / preprocessing time
 */

/** Maximum dimension to cap the image at before uploading (px). */
const MAX_UPLOAD_DIMENSION = 512;

/** JPEG quality for upload pre-processing (0–1). */
const UPLOAD_JPEG_QUALITY = 0.92;

/**
 * Resize and re-encode an image File using an off-screen canvas.
 *
 * The image is scaled down proportionally so its largest dimension
 * does not exceed MAX_UPLOAD_DIMENSION. Images already smaller than
 * that are returned unchanged (as a Blob).
 *
 * @param file   - Original File object from <input type="file"> or DnD
 * @returns      - Promise resolving to a resized File (or the original if small)
 */
export async function resizeImageForUpload(file: File): Promise<File> {
  return new Promise((resolve) => {
    // Bail out early for non-image files — let the server validate properly
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const { naturalWidth: w, naturalHeight: h } = img;
      const maxDim = Math.max(w, h);

      // No resize needed if the image is already small enough
      if (maxDim <= MAX_UPLOAD_DIMENSION) {
        resolve(file);
        return;
      }

      const scale = MAX_UPLOAD_DIMENSION / maxDim;
      const targetW = Math.round(w * scale);
      const targetH = Math.round(h * scale);

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        // Canvas unavailable — send original
        resolve(file);
        return;
      }

      // Use higher-quality image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetW, targetH);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file); // fallback to original on failure
            return;
          }
          // Preserve the original filename with a .jpg extension
          const baseName = file.name.replace(/\.[^.]+$/, '');
          const resized = new File([blob], `${baseName}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(resized);
        },
        'image/jpeg',
        UPLOAD_JPEG_QUALITY
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      // On error, fall back to sending the original file unchanged
      resolve(file);
    };

    img.src = objectUrl;
  });
}
