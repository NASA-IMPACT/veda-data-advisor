# Geospatial File Decision Tool

## Overview
A React SPA that helps users determine the best VEDA visualization service for their geospatial files.

## Current Features

### Step 1: File Input
- **Upload file**: Drag & drop or click to upload geospatial files
- **S3 link**: Provide an S3 URL to a file
- Supported formats: COG, NetCDF, GeoParquet, GRIB, HDF5
- Input validation for S3 URLs (must start with `s3://`)

### Step 2: File Validation
- Simulated validation process with visual feedback
- S3 accessibility check (for S3 URLs)
- File format detection based on extension
- Format-specific validation messages
- Loading states and progress indicators

### Step 3: Visualization Options
- Displays file metadata (format, type, cloud optimization status)
- Recommends appropriate visualization services based on:
  - **tipg**: For vector data (points, lines, polygons)
  - **titiler-pgstac**: For COG datasets
  - **titiler-multidim**: For multidimensional gridded data (NetCDF, GRIB, HDF5)
  - **titiler-cmr**: For Earthdata Cloud + CMR datasets
- Shows limitations and use cases for each service
- Decision logic based on the VEDA decision tree

## Architecture

```
src/
├── components/
│   ├── Wizard.js              # Main wizard orchestrator
│   ├── Wizard.css
│   ├── FileInput.js           # Step 1: File upload/S3 input
│   ├── FileInput.css
│   ├── FileValidation.js      # Step 2: Validation process
│   ├── FileValidation.css
│   ├── VisualizationOptions.js # Step 3: Service recommendations
│   └── VisualizationOptions.css
├── App.js                     # Root component
└── App.css                    # Global styles
```

## Next Steps for Enhancement

### Backend Integration
1. **S3 Accessibility Check**
   - Implement actual S3 bucket access validation
   - Check permissions and file existence
   - Handle authentication/credentials

2. **File Validation**
   - Integrate with COG validation libraries (e.g., rio-cogeo)
   - NetCDF validation using xarray/h5netcdf
   - GeoParquet validation using geopandas
   - GRIB validation using cfgrib

3. **Metadata Extraction**
   - Extract actual metadata from files (CRS, bounds, bands, time dimensions)
   - Read CF conventions for NetCDF
   - Parse GeoTIFF tags

### API Integration
- Connect to VEDA services (titiler-pgstac, titiler-multidim, etc.)
- Generate preview URLs
- Create interactive map previews

### Enhanced Decision Logic
- Implement the full decision tree from the images
- Check for Earthdata Cloud location
- Detect CMR compatibility
- Identify hierarchical/grouped structures
- Handle edge cases and "quirky" datasets

### UI Enhancements
- File upload progress bars
- Better error handling and messages
- Preview thumbnails
- Interactive map for visualization
- Export recommendations as JSON/config

### Testing
- Add unit tests for validation logic
- Integration tests for file parsing
- E2E tests for wizard flow

## Running the App

```bash
npm start       # Development server (http://localhost:3000)
npm test        # Run tests
npm run build   # Production build
```

## Deployment to GitHub Pages

This project is configured to automatically deploy to GitHub Pages when you push to the `main` branch.

### Setup Instructions

1. **Enable GitHub Pages in your repository:**
   - Go to your repository on GitHub
   - Navigate to Settings → Pages
   - Under "Source", select "GitHub Actions"

2. **Push your code to GitHub:**
   ```bash
   git add .
   git commit -m "Add GitHub Pages deployment"
   git push origin main
   ```

3. **Wait for the deployment:**
   - The GitHub Action will automatically run
   - Check the "Actions" tab to see the deployment progress
   - Once complete, your app will be available at the GitHub Pages URL

### How it Works

The deployment workflow (`.github/workflows/deploy.yml`) is based on the [spatial-access-measures deployment workflow](https://github.com/developmentseed/spatial-access-measures/blob/main/.github/workflows/deploy.yml) and:

- Triggers on push to the `main` branch
- Installs dependencies with `npm ci`
- Builds the React app with `npm run build`
- Uploads the `build` folder as a GitHub Pages artifact
- Deploys to GitHub Pages

The `homepage` field in `package.json` is set to `"."` for relative path support, making it work both locally and on GitHub Pages.

## Technologies
- React 18
- Create React App
- CSS3 (no external UI library for now)
- GitHub Actions for CI/CD

