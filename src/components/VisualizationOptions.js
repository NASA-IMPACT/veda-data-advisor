import React from 'react';
import './VisualizationOptions.css';

function ServiceCard({ service }) {
  return (
    <div className="service-card">
      <div className="service-header">
        <h4 className="service-title">{service.title}</h4>
      </div>
      <p className="service-description">{service.description}</p>
      
      <div className="service-details">
        <div className="use-case">
          <strong>Use Case:</strong> {service.useCase}
        </div>
      </div>

      {service.endpoints && service.endpoints.length > 0 && (
        <div className="endpoints-section">
          {service.endpoints.map((endpoint, index) => (
            <div key={index} className="endpoint-item">
              <div className="endpoint-header">
                <h5 className="endpoint-title">{endpoint.title}</h5>
                {service.docsUrl && (
                  <a 
                    href={service.docsUrl}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="api-docs-link-small"
                  >
                    📖 API Docs
                  </a>
                )}
              </div>
              <p className="endpoint-description">{endpoint.description}</p>
              
              <div className="api-url-box">
                <code className="api-pattern">
                  {endpoint.base}
                  <br />
                  {endpoint.pattern}
                </code>
              </div>
              
              <p className="api-example-label">Example:</p>
              <div className="api-example-box">
                <code className="api-example">{endpoint.exampleUrl}</code>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VisualizationOptions({ fileData, validationResult, onReset }) {
  const [showValidationDetails, setShowValidationDetails] = React.useState(false);

  const getRecommendedServices = () => {
    const { format, metadata, isCMR } = validationResult;
    const services = [];

    // For CMR datasets
    if (isCMR) {
      const endpoints = [
        {
          name: 'visualization',
          title: 'Visualization',
          description: 'Tile-based visualization',
          base: 'https://staging.openveda.cloud/api/titiler-cmr/',
          pattern: 'tiles/WebMercatorQuad/{z}/{x}/{y}.png?concept_id={concept_id}',
          exampleUrl: `https://staging.openveda.cloud/api/titiler-cmr/tiles/WebMercatorQuad/{z}/{x}/{y}.png?concept_id=${validationResult.conceptId}`
        },
        {
          name: 'statistics',
          title: 'Statistics',
          description: 'Generate statistical summaries for the dataset',
          base: 'https://staging.openveda.cloud/api/titiler-cmr/',
          pattern: 'statistics?concept_id={concept_id}&datetime={datetime}',
          exampleUrl: `https://staging.openveda.cloud/api/titiler-cmr/statistics?concept_id=${validationResult.conceptId}&datetime=2020-01-01`
        }
      ];

      // Time series endpoints (only if has time dimension)
      if (metadata.hasTimeDimension) {
        endpoints.push({
          name: 'time-series-visualization',
          title: 'Time Series Visualization',
          description: 'Visualize time series data for a bounding box',
          base: 'https://staging.openveda.cloud/api/titiler-cmr/',
          pattern: 'timeseries/bbox/{minx},{miny},{maxx},{maxy}.{format}?concept_id={concept_id}',
          exampleUrl: `https://staging.openveda.cloud/api/titiler-cmr/timeseries/bbox/{minx},{miny},{maxx},{maxy}.png?concept_id=${validationResult.conceptId}`
        });

        endpoints.push({
          name: 'time-series-statistics',
          title: 'Time Series Statistics',
          description: 'Generate statistics over time for multiple dates',
          base: 'https://staging.openveda.cloud/api/titiler-cmr/',
          pattern: 'timeseries/statistics?concept_id={concept_id}&datetime={datetime}',
          exampleUrl: `https://staging.openveda.cloud/api/titiler-cmr/timeseries/statistics?concept_id=${validationResult.conceptId}&datetime=2020-01-01/2020-12-31`
        });
      }

      services.push({
        name: 'titiler-cmr',
        title: 'Titiler-CMR',
        description: 'Earthdata Cloud datasets via CMR',
        useCase: 'Best for data on Earthdata Cloud with CMR integration',
        docsUrl: 'https://staging.openveda.cloud/api/titiler-cmr/api.html',
        endpoints: endpoints
      });

      return services;
    }

    // For non-CMR datasets
    if (metadata.spatialType === 'vector') {
      // Points, lines, polygons -> tipg
      services.push({
        name: 'tipg',
        title: 'TiPg (OGC Features API)',
        description: 'Serve vector data via OGC Features API',
        useCase: 'Interactive visualization for GeoParquet and other vector formats',
        endpoints: []
      });
    }

    if (format === 'COG' || (metadata.spatialType === 'raster' && !metadata.hasTimeDimension)) {
      if (format === 'COG' && !isCMR) {
        const endpoints = [
          {
            name: 'visualization',
            title: 'Visualization',
            description: 'Tile-based visualization',
            base: 'https://openveda.cloud/api/raster/',
            pattern: 'cog/tiles/WebMercatorQuad/{z}/{x}/{y}.png?url={url}',
            exampleUrl: `https://openveda.cloud/api/raster/cog/tiles/WebMercatorQuad/{z}/{x}/{y}.png?url=${encodeURIComponent(fileData.s3Url)}`
          },
          {
            name: 'statistics',
            title: 'Statistics',
            description: 'Generate statistical summaries',
            base: 'https://openveda.cloud/api/raster/',
            pattern: 'cog/statistics?url={url}',
            exampleUrl: `https://openveda.cloud/api/raster/cog/statistics?url=${encodeURIComponent(fileData.s3Url)}`
          }
        ];

        services.push({
          name: 'titiler-pgstac',
          title: 'Titiler-pgstac',
          description: 'Cloud Optimized GeoTIFF visualization and analysis',
          useCase: 'Best for static raster datasets',
          docsUrl: 'https://openveda.cloud/api/raster/docs',
          endpoints: endpoints
        });
      }
    }

    if (format === 'NetCDF' || format === 'GRIB' || format === 'HDF5') {
      // Gridded formats (not COG)
      if (metadata.hasTimeDimension) {
        services.push({
          name: 'titiler-multidim',
          title: 'Titiler-multidim',
          description: 'For multidimensional gridded data formats',
          useCase: 'Visualization for NetCDF, GRIB, HDF5 with time dimensions',
          endpoints: []
        });
      } else {
        services.push({
          name: 'conversion',
          title: 'Format Conversion',
          description: 'Consider converting to a supported format',
          useCase: 'Convert to COG or another cloud-optimized format',
          endpoints: []
        });
      }
    }

    return services;
  };

  const services = getRecommendedServices();

  return (
    <div className="visualization-container">
      <h2>Step 3: Recommended Visualization Services</h2>
      <p className="step-description">
        Based on your file <strong>{fileData.s3Url}</strong> ({validationResult.format})
      </p>

      <div className="file-info-card">
        <h3>File Information</h3>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Format:</span>
            <span className="info-value">{validationResult.format}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Cloud Optimized:</span>
            <span className="info-value">{validationResult.isCloudOptimized ? '✓ Yes' : '✗ No'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Time Dimension:</span>
            <span className="info-value">{validationResult.metadata.hasTimeDimension ? '✓ Yes' : '✗ No'}</span>
          </div>
          {validationResult.isCMR && (
            <>
              <div className="info-item">
                <span className="info-label">Source:</span>
                <span className="info-value">Earthdata Cloud (CMR)</span>
              </div>
              <div className="info-item concept-id-item">
                <span className="info-label">Concept ID:</span>
                <span className="info-value concept-id-value">{validationResult.conceptId}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <h3 className="services-heading">Recommended Services</h3>
      <div className="services-list">
        {services.map((service, index) => (
          <ServiceCard 
            key={index} 
            service={service}
          />
        ))}
      </div>

      {validationResult.validationDetails && (
        <div className="validation-details-section">
          <button 
            className="validation-details-toggle"
            onClick={() => setShowValidationDetails(!showValidationDetails)}
          >
            <span className="toggle-icon">{showValidationDetails ? '▼' : '▶'}</span>
            <span>Validation Details</span>
          </button>
          {showValidationDetails && (
            <div className="validation-details-content">
              <pre className="validation-json">
                {JSON.stringify(validationResult.validationDetails, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      <div className="button-group">
        <button onClick={onReset} className="reset-button">
          Start Over
        </button>
      </div>
    </div>
  );
}

export default VisualizationOptions;

