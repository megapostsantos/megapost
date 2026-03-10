

## Root Cause Analysis

The driver creation form uses `<input type="file" capture="environment">` (line 340). On mobile devices, this opens the native camera app. When the camera app opens, Android/iOS may **kill the browser tab to free memory**. When the user returns after taking the photo, the entire page reloads from scratch, destroying all React state (nome, telefone, placa, etc.).

Secondary issue: the form relies on `fileInputRef.current?.files?.[0]` which is also lost on page reload.

## Plan

### Single file changed: `src/pages/admin/AdminDrivers.tsx`

**Fix 1 — Remove `capture="environment"`** from the file input. Let the OS prompt the user to choose camera or gallery. This avoids forcing the native camera app which causes the memory-kill reload on many Android devices.

**Fix 2 — Store photo in state, not just in ref.** Add `const [photoFile, setPhotoFile] = useState<File | null>(null)` and `const [photoPreview, setPhotoPreview] = useState<string | null>(null)`. On file input `onChange`, read the file into state and create an object URL for preview. This way if the component survives, the preview is visible.

**Fix 3 — Persist form data in sessionStorage.** On every field change, save form values to `sessionStorage`. On mount, restore them. This survives the camera-induced page reload. Clear sessionStorage on successful save or form close.

**Fix 4 — Use state-based photoFile in `handleCreate`** instead of `fileInputRef.current?.files?.[0]`. If photo is lost (page reloaded and file can't be restored), allow saving without photo and show a warning toast that the photo was lost and they should edit the driver to add it.

**Fix 5 — Add proper error handling and loading states.** Wrap the upload + insert in try/catch. If upload fails, still save the driver without photo and show an error toast. Add uploading state indicator.

**Fix 6 — Also remove `capture="environment"` from the inline edit photo button** (line 415) for consistency.

### Summary of changes:
- Remove `capture="environment"` from both file inputs
- Add `photoFile` / `photoPreview` state
- Persist form fields in sessionStorage, restore on mount
- Use state-based photo in handleCreate instead of ref
- If photo lost after camera, allow save without photo
- Better error handling for upload failures

