import React, { useState } from 'react';
import './FileInput.css';

function FileInput({ onSubmit }) {
  const [fileUrl, setFileUrl] = useState('');
  const [error, setError] = useState('');

  const exampleUrls = [
    {
      label: 'CMR - LPCLOUD URL',
      url: 'https://cmr.earthdata.nasa.gov/search/concepts/C2021957295-LPCLOUD.html'
    },
    {
      label: 'CMR - POCLOUD URL',
      url: 'https://cmr.earthdata.nasa.gov/search/concepts/C2036881735-POCLOUD.html'
    },
    {
      label: 'CMR - Concept ID',
      url: 'C2723754864-GES_DISC'
    },
    {
      label: 'COG - Bangladesh Landcover',
      url: 's3://veda-data-store/bangladesh-landcover-2001-2020/MODIS_LC_2001_BD_v2.cog.tif'
    },
    {
      label: 'NetCDF - NEX GDDP CMIP6',
      url: 's3://veda-nex-gddp-cmip6-public/v0/netcdf/fwi/mme/mme50/yearly/ssp245/2100/mme50_ssp245_fwi_metrics_yearly_2100.nc'
    }
  ];

  const handleUrlChange = (e) => {
    setFileUrl(e.target.value);
    setError('');
  };

  const handleExampleClick = (url) => {
    setFileUrl(url);
    setError('');
  };

  const isCMRConceptId = (input) => {
    // Check if input matches CMR concept ID pattern: C followed by numbers, dash, then provider
    return /^C\d+-[A-Z_]+$/.test(input.trim());
  };

  const detectUrlType = (url) => {
    if (url.includes('cmr.earthdata.nasa.gov/search/concepts/') || isCMRConceptId(url)) {
      return 'cmr';
    }
    return 's3';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!fileUrl.trim()) {
      setError('Please enter a file URL or CMR concept ID');
      return;
    }

    const urlType = detectUrlType(fileUrl);
    
    // Allow CMR concept IDs without URL validation
    if (urlType !== 'cmr') {
      if (!(fileUrl.startsWith('s3://') || fileUrl.startsWith('http://') || fileUrl.startsWith('https://'))) {
        setError('URL must start with s3://, http://, or https:// (or provide a CMR concept ID)');
        return;
      }
    }

    onSubmit({
      type: urlType,
      file: null,
      s3Url: fileUrl,
      fileName: fileUrl.split('/').pop()
    });
  };

  return (
    <div className="file-input-container">
      <h2>Step 1: Provide Your Geospatial File URL</h2>
      <p className="step-description">
        Provide an S3 or HTTPS URL to a geospatial dataset, or a CMR concept ID for validation
      </p>

      <form onSubmit={handleSubmit} className="file-input-form">
        <div className="url-section">
          <label htmlFor="file-url" className="url-label">
            File URL or CMR Concept ID
          </label>
          <input
            id="file-url"
            type="text"
            value={fileUrl}
            onChange={handleUrlChange}
            placeholder="https://example.com/file.tif or C2723754864-GES_DISC"
            className="url-input"
          />
          <div className="examples-section">
            <p className="examples-label">Try these examples:</p>
            <div className="example-buttons">
              {exampleUrls.map((example, index) => (
                <button
                  key={index}
                  type="button"
                  className="example-button"
                  onClick={() => handleExampleClick(example.url)}
                  title={example.url}
                >
                  {example.label}
                </button>
              ))}
            </div>
          </div>
          <div className="url-info">
            <svg className="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Supports direct file URLs (COG, NetCDF, etc.), CMR concept URLs, or CMR concept IDs (e.g., C2723754864-GES_DISC). Real-time validation will be performed.</span>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <button type="submit" className="submit-button">
          Continue to Validation
        </button>
      </form>
    </div>
  );
}

export default FileInput;

