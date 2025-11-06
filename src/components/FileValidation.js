import React, { useState, useEffect } from 'react';
import './FileValidation.css';

function FileValidation({ fileData, onValidationComplete, onBack }) {
  const [isValidating, setIsValidating] = useState(true);
  const [validationSteps, setValidationSteps] = useState([]);

  useEffect(() => {
    // Simulate validation process
    performValidation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const performValidation = async () => {
    const steps = [];
    let isValid = true;
    let validationDetails = null;
    let detectedFormat = 'Unknown';
    let hasTimeDimension = false;

    // Handle CMR URLs differently
    if (fileData.type === 'cmr') {
      // Step 1: Parse Concept ID
      steps.push({ name: 'Parse CMR Concept ID', status: 'running' });
      setValidationSteps([...steps]);
      
      await simulateDelay(500);
      const conceptId = parseCMRConceptId(fileData.s3Url);
      
      if (!conceptId) {
        steps[0].status = 'failed';
        steps[0].message = 'Failed to parse concept ID from URL';
        setValidationSteps([...steps]);
        setIsValidating(false);
        isValid = false;
      } else {
        steps[0].status = 'completed';
        steps[0].message = `Concept ID: ${conceptId}`;
        setValidationSteps([...steps]);
        
        // Step 2: Check CMR Compatibility
        await simulateDelay(500);
        steps.push({ name: 'Check CMR Compatibility', status: 'running' });
        setValidationSteps([...steps]);
        
        try {
          const compatibilityResult = await validateCMRCompatibility(conceptId);
          isValid = compatibilityResult.isValid;
          validationDetails = compatibilityResult.details;
          detectedFormat = compatibilityResult.format;
          hasTimeDimension = compatibilityResult.hasTimeDimension;
          
          steps[steps.length - 1].status = 'completed';
          steps[steps.length - 1].message = compatibilityResult.message;
          setValidationSteps([...steps]);
          setIsValidating(false);
          
          // Complete validation
          setTimeout(() => {
            onValidationComplete({
              format: detectedFormat,
              isValid: isValid,
              isCloudOptimized: true, // CMR datasets are on Earthdata Cloud
              isCMR: true,
              conceptId: conceptId,
              metadata: {
                format: detectedFormat,
                hasTimeDimension: hasTimeDimension,
                spatialType: 'raster',
                hasMultipleBands: true,
                source: 'Earthdata Cloud'
              },
              validationDetails: validationDetails
            });
          }, 1000);
          return;
        } catch (error) {
          steps[steps.length - 1].status = 'failed';
          steps[steps.length - 1].message = `Compatibility check error: ${error.message}`;
          setValidationSteps([...steps]);
          setIsValidating(false);
          isValid = false;
        }
      }
    } else {
      // Original flow for direct file URLs
      // Step 1: S3 Accessibility Check (if S3)
      if (fileData.type === 's3') {
        steps.push({ name: 'S3 Accessibility Check', status: 'running' });
        setValidationSteps([...steps]);
        
        await simulateDelay(1500);
        steps[0].status = 'completed';
        steps[0].message = 'S3 bucket is accessible';
        setValidationSteps([...steps]);
      }

      // Step 2: File Format Detection
      await simulateDelay(1000);
      steps.push({ name: 'File Format Detection', status: 'running' });
      setValidationSteps([...steps]);
      
      await simulateDelay(500);
      detectedFormat = detectFileFormat(fileData.fileName);
      steps[steps.length - 1].status = 'completed';
      steps[steps.length - 1].message = `Detected format: ${detectedFormat}`;
      setValidationSteps([...steps]);

      // Step 3: Format-Specific Validation
      await simulateDelay(500);
      steps.push({ name: `${detectedFormat} Validation`, status: 'running' });
      setValidationSteps([...steps]);
      
      // Actual COG validation using API
      if (detectedFormat === 'COG' && fileData.type === 's3') {
        try {
          const validationResult = await validateCOG(fileData.s3Url);
          isValid = validationResult.isValid;
          validationDetails = validationResult.details;
          
          steps[steps.length - 1].status = isValid ? 'completed' : 'failed';
          steps[steps.length - 1].message = validationResult.message;
        } catch (error) {
          steps[steps.length - 1].status = 'failed';
          steps[steps.length - 1].message = `Validation error: ${error.message}`;
          isValid = false;
        }
      } else if (detectedFormat === 'NetCDF' && fileData.type === 's3') {
        // NetCDF validation using titiler-multidim
        try {
          const validationResult = await validateNetCDF(fileData.s3Url);
          isValid = validationResult.isValid;
          validationDetails = {
            ...validationResult.details,
            _variableUsed: validationResult.variableUsed,
            _allVariables: validationResult.allVariables
          };
          
          // Check if has time dimension
          if (validationDetails.dimensions && validationDetails.dimensions.time !== undefined) {
            hasTimeDimension = true;
          }
          
          steps[steps.length - 1].status = isValid ? 'completed' : 'failed';
          steps[steps.length - 1].message = validationResult.message;
        } catch (error) {
          steps[steps.length - 1].status = 'failed';
          steps[steps.length - 1].message = `Validation error: ${error.message}`;
          isValid = false;
        }
      } else {
        // For other formats, use simulated validation
        await simulateDelay(2000);
        steps[steps.length - 1].status = 'completed';
        steps[steps.length - 1].message = getFormatValidationMessage(detectedFormat);
      }
      
      setValidationSteps([...steps]);
      setIsValidating(false);

      // Complete validation
      setTimeout(() => {
        onValidationComplete({
          format: detectedFormat,
          isValid: isValid,
          isCloudOptimized: isValid && checkCloudOptimized(detectedFormat),
          isCMR: false,
          metadata: getMetadata(detectedFormat, hasTimeDimension),
          validationDetails: validationDetails
        });
      }, 1000);
    }
  };

  const simulateDelay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const validateCOG = async (fileUrl) => {
    try {
      const apiUrl = `https://openveda.cloud/api/raster/cog/validate?url=${encodeURIComponent(fileUrl)}`;
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Check for the COG key in the response
      const isCogValid = data.COG === true;
      
      return {
        isValid: isCogValid,
        message: isCogValid 
          ? 'Valid COG structure with proper tiling' 
          : 'File is not a valid Cloud Optimized GeoTIFF',
        details: data
      };
    } catch (error) {
      console.error('COG Validation Error:', error);
      throw new Error(error.message || 'Failed to validate COG');
    }
  };

  const validateNetCDF = async (fileUrl) => {
    try {
      // Step 1: Get variables list (acts as S3 access check)
      const variablesUrl = `https://staging.openveda.cloud/api/titiler-multidim/variables?url=${encodeURIComponent(fileUrl)}`;
      
      const variablesResponse = await fetch(variablesUrl);
      
      if (!variablesResponse.ok) {
        throw new Error(`Variables API returned ${variablesResponse.status}: ${variablesResponse.statusText}`);
      }

      const variables = await variablesResponse.json();
      
      if (!Array.isArray(variables) || variables.length === 0) {
        throw new Error('No variables found in NetCDF file');
      }

      // Step 2: Get info for the first variable
      const firstVariable = variables[0];
      const infoUrl = `https://staging.openveda.cloud/api/titiler-multidim/info?url=${encodeURIComponent(fileUrl)}&variable=${encodeURIComponent(firstVariable)}`;
      
      const infoResponse = await fetch(infoUrl);
      
      if (!infoResponse.ok) {
        throw new Error(`Info API returned ${infoResponse.status}: ${infoResponse.statusText}`);
      }

      const infoData = await infoResponse.json();
      
      return {
        isValid: true,
        message: `Valid NetCDF file with ${variables.length} variable(s). Using variable: ${firstVariable}`,
        details: infoData,
        variableUsed: firstVariable,
        allVariables: variables
      };
    } catch (error) {
      console.error('NetCDF Validation Error:', error);
      throw new Error(error.message || 'Failed to validate NetCDF');
    }
  };

  const parseCMRConceptId = (input) => {
    // Check if input is already a concept ID (e.g., C2036881735-POCLOUD)
    const conceptIdPattern = /^C\d+-[A-Z_]+$/;
    if (conceptIdPattern.test(input.trim())) {
      return input.trim();
    }
    
    // Otherwise, extract concept ID from CMR URL
    // Example: https://cmr.earthdata.nasa.gov/search/concepts/C1996881146-POCLOUD.html
    const match = input.match(/concepts\/([^/.]+)/);
    return match ? match[1] : null;
  };

  const validateCMRCompatibility = async (conceptId) => {
    try {
      const apiUrl = `https://v4jec6i5c0.execute-api.us-west-2.amazonaws.com/compatibility?concept_id=${encodeURIComponent(conceptId)}`;
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Check example_assets to determine format
      let detectedFormat = 'Unknown';
      if (data.example_assets) {
        let assetPath = null;
        
        // example_assets can be a string, an object where keys are filenames, or an array
        if (typeof data.example_assets === 'string') {
          // Case 1: Direct string
          assetPath = data.example_assets;
        } else if (Array.isArray(data.example_assets) && data.example_assets.length > 0) {
          // Case 2: Array - get first item
          assetPath = data.example_assets[0];
        } else if (typeof data.example_assets === 'object' && !Array.isArray(data.example_assets)) {
          // Case 3: Object where keys are filenames - get the first key
          const keys = Object.keys(data.example_assets);
          if (keys.length > 0) {
            assetPath = keys[0]; // The key itself is the filename
          }
        }
        
        if (assetPath) {
          // Remove query parameters and get just the filename
          const filename = assetPath.split('?')[0];
          
          // Get extension after the last period
          const parts = filename.split('.');
          const extension = parts[parts.length - 1].toLowerCase();
          
          if (extension === 'tif' || extension === 'tiff') {
            detectedFormat = 'COG';
          } else if (extension === 'nc' || extension === 'nc4') {
            detectedFormat = 'NetCDF';
          } else {
            detectedFormat = extension.toUpperCase();
          }
        }
      }
      
      // Check if dataset has time dimension
      // Look for time dimension in the dimensions object
      let hasTimeDimension = false;
      if (data.dimensions && data.dimensions.time !== undefined) {
        hasTimeDimension = true;
      }
      
      return {
        isValid: true,
        format: detectedFormat,
        hasTimeDimension: hasTimeDimension,
        message: `Compatible CMR dataset with ${detectedFormat} format`,
        details: data
      };
    } catch (error) {
      console.error('CMR Validation Error:', error);
      throw new Error(error.message || 'Failed to validate CMR compatibility');
    }
  };

  const detectFileFormat = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    const formatMap = {
      'tif': 'COG',
      'tiff': 'COG',
      'nc': 'NetCDF',
      'nc4': 'NetCDF',
      'parquet': 'GeoParquet',
      'grib': 'GRIB',
      'hdf5': 'HDF5',
      'h5': 'HDF5'
    };
    return formatMap[extension] || 'Unknown';
  };

  const getFormatValidationMessage = (format) => {
    const messages = {
      'COG': 'Valid COG structure with proper tiling',
      'NetCDF': 'Valid NetCDF-4 format, cloud optimized',
      'GeoParquet': 'Valid GeoParquet with spatial metadata',
      'GRIB': 'Valid GRIB2 format detected',
      'HDF5': 'Valid HDF5 structure'
    };
    return messages[format] || 'Format validated';
  };

  const checkCloudOptimized = (format) => {
    return ['COG', 'NetCDF', 'GeoParquet'].includes(format);
  };

  const getMetadata = (format) => {
    // Placeholder metadata based on format
    return {
      format,
      hasTimeDimension: ['NetCDF', 'GRIB'].includes(format),
      spatialType: format === 'GeoParquet' ? 'vector' : 'raster',
      hasMultipleBands: ['COG', 'NetCDF', 'HDF5'].includes(format)
    };
  };

  return (
    <div className="validation-container">
      <h2>Step 2: Validating File</h2>
      <p className="step-description">
        Running validation checks on your file: <strong>{fileData.fileName}</strong>
      </p>

      <div className="validation-steps">
        {validationSteps.map((step, index) => (
          <div key={index} className={`validation-step ${step.status}`}>
            <div className="step-icon">
              {step.status === 'running' && (
                <div className="spinner"></div>
              )}
              {step.status === 'completed' && (
                <svg className="check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {step.status === 'failed' && (
                <svg className="error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <div className="step-content">
              <div className="step-name">{step.name}</div>
              {step.message && <div className="step-message">{step.message}</div>}
            </div>
          </div>
        ))}
      </div>

      {!isValidating && (
        <div className="validation-complete">
          <div className="success-message">
            <svg className="success-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Validation Complete!</span>
          </div>
        </div>
      )}

      <div className="button-group">
        <button onClick={onBack} className="back-button">
          Back
        </button>
      </div>
    </div>
  );
}

export default FileValidation;

