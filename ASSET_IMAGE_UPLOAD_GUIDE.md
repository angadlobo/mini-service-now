# Asset & License Image Upload Guide

## Overview

The asset management system now supports image uploads for visual identification and documentation:

- **Assets (CMDB)**: Required image field for asset photos
- **Licenses**: Optional image field for license certificates/documents

## Image Upload Features

### Asset Images (Required)

**Purpose**: Store photos of physical or digital assets for:
- Visual identification
- Asset inventory tracking
- Equipment documentation
- Damage/wear assessment

**Specifications**:
- **Maximum Size**: 10 MB
- **Allowed Formats**: JPEG, PNG, GIF, WebP
- **Field**: `image_path` (required) + `image_name`
- **Storage**: `/uploads/` directory with UUID-based filenames

### License Images (Optional)

**Purpose**: Store license documents such as:
- License keys/certificates
- License agreement documents
- Software license proof
- Key documentation

**Specifications**:
- **Maximum Size**: 5 MB
- **Allowed Formats**: JPEG, PNG, GIF, WebP (same as assets)
- **Field**: `image_path` + `image_name` (both optional)
- **Storage**: `/uploads/` directory with UUID-based filenames

## API Endpoints

### Upload Asset Image
```
POST /api/cmdb/cis/:id/image
Content-Type: multipart/form-data

Form Data:
  - image: <binary file data>

Response:
{
  "image_path": "/uploads/abc123-photo.jpg",
  "image_name": "server-rack.jpg",
  "message": "Asset image uploaded successfully"
}
```

### Upload License Image
```
POST /api/cmdb/licenses/:licenseId/image
Content-Type: multipart/form-data

Form Data:
  - image: <binary file data>

Response:
{
  "image_path": "/uploads/def456-license.png",
  "image_name": "windows-license.png",
  "message": "License image uploaded successfully"
}
```

### Get Asset Details (includes image)
```
GET /api/cmdb/cis/:id

Response includes:
{
  "id": "asset-id",
  "number": "CI1001",
  "name": "Production Server",
  "image_path": "/uploads/abc123-photo.jpg",
  "image_name": "server-rack.jpg",
  "image_url": "http://localhost:3001/uploads/abc123-photo.jpg",
  ...
}
```

### Get License Details (includes image)
```
GET /api/cmdb/cis/:id/licenses

Response includes:
{
  "id": "license-id",
  "license_key": "XXXXX-XXXXX-XXXXX",
  "image_path": "/uploads/def456-license.png",
  "image_name": "windows-license.png",
  ...
}
```

## Usage Examples

### Upload Asset Photo (cURL)
```bash
curl -X POST http://localhost:3001/api/cmdb/cis/asset-123/image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@/path/to/server-photo.jpg"
```

### Upload License Certificate (JavaScript/Fetch)
```javascript
const formData = new FormData();
formData.append('image', fileInput.files[0]);

const response = await fetch(
  `/api/cmdb/licenses/${licenseId}/image`,
  {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  }
);

const result = await response.json();
console.log(result.image_path); // /uploads/uuid-filename.jpg
```

## Frontend Integration

### React Component Example

```typescript
import { useState } from 'react';

export function AssetImageUpload({ assetId, onImageUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);

  const handleImageSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result);
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch(`/api/cmdb/cis/${assetId}/image`, {
        method: 'POST',
        body: formData,
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const result = await res.json();
        onImageUploaded(result.image_path);
      } else {
        alert('Upload failed: ' + res.statusText);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {preview && <img src={preview} alt="Preview" style={{ maxWidth: '200px' }} />}
      <input type="file" accept="image/*" onChange={handleImageSelect} disabled={uploading} />
      {uploading && <p>Uploading...</p>}
    </div>
  );
}
```

## Database Schema

### Assets Table (cis)
```sql
image_path text          -- Relative path: /uploads/uuid-filename.jpg
image_name varchar(255)  -- Original filename
```

### License Table (asset_licenses)
```sql
image_path text          -- Relative path (optional)
image_name varchar(255)  -- Original filename (optional)
```

## File Storage

- **Location**: `server/uploads/` directory
- **Naming**: `{UUID}-{original_filename}.{ext}`
  - Example: `a1b2c3d4-server-photo.jpg`
- **Access**: Files accessible at `/uploads/{filename}` via HTTP
- **Cleanup**: Old images can be manually removed from the uploads directory

## Validation & Error Handling

### Valid File Types
✅ JPEG, JPG (image/jpeg)
✅ PNG (image/png)
✅ GIF (image/gif)
✅ WebP (image/webp)

### Invalid File Types
❌ BMP, TIFF, SVG (not supported)
❌ PDF, DOC, TXT (document types)
❌ ZIP, EXE (archives/executables)

### Error Responses
```json
{
  "error": "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.",
  "code": 400
}
```

```json
{
  "error": "File too large (max 10MB for assets, 5MB for licenses)",
  "code": 413
}
```

## Best Practices

1. **Asset Photos**:
   - Use high-quality, well-lit photos
   - Show the entire asset clearly
   - Include identifying features (serial numbers, etc.)
   - Suggest: JPEG for photographs, PNG for diagrams

2. **License Documents**:
   - Capture the full license text/certificate
   - Ensure text is readable (high contrast)
   - Recommended: PNG for documents to preserve clarity

3. **File Organization**:
   - Use descriptive filenames (e.g., "server-rack-front-view.jpg")
   - Regularly archive old/obsolete photos
   - Consider date-based naming for multiple photos of the same asset

## Troubleshooting

### Upload Fails with "Invalid file type"
- Check file extension (.jpg, .png, .gif, .webp only)
- Verify the file is actually an image (check file header)
- Some JPEGs labeled as .jpeg may need conversion

### Upload Fails with "File too large"
- Asset images: Max 10 MB
- License images: Max 5 MB
- Compress or resize the image if needed

### Image Not Displaying
- Verify image_path is set in database
- Check `/uploads/` directory exists and has the file
- Ensure web server is configured to serve static files from `/uploads/`
- Check browser console for 404 errors

### Orphaned Files
- Old images remain in `/uploads/` when assets are deleted
- Consider periodic cleanup script for unreferenced files
- Archive uploads directory regularly for backup

## API Authorization

All image upload endpoints require:
- **Authentication**: Valid JWT token
- **Role**: `itil` or `admin` role
- **Headers**: `Authorization: Bearer <token>`

Unauthenticated requests return 401 Unauthorized.
Unauthorized roles return 403 Forbidden.

## Related Documentation

- See [ASSETS_CONTRACTS_ENHANCEMENTS.md](ASSETS_CONTRACTS_ENHANCEMENTS.md) for full asset/license management
- See [README.md](README.md) for general API documentation
