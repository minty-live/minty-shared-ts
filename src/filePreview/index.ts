/**
 * The file preview every app draws attachments with (v0.37): PreviewBlock (image, PDF through
 * ./pdfPreview, sandboxed HTML, or a "cannot preview" card), the inline FilePreviewPane, and the
 * full-screen AttachmentFullScreenViewer with pinch zoom. The app registers its icon font and its
 * authenticated fetch first (registerFilePreviewHost), and copies pdf.js's assets to /pdfjs
 * (`copyPdfjsAssets` from `@minty/shared/next`).
 */

export {
  AttachmentFullScreenViewer,
  FilePreviewPane,
  PreviewBlock,
  ViewFullButton,
  fileIconInfo,
  fileToPreviewItem,
  formatFileSize,
  nameToPreviewMime,
  resolvePreviewMime,
  usePinchZoom,
  type AttachmentPreviewItem,
} from "./FilePreview";
export { registerFilePreviewHost, requireFilePreviewHost, type FilePreviewHost } from "./host";
