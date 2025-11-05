import React from 'react';
import './VisualizationOptions.css';
import * as d3 from 'd3';

function TimeSeriesChart({ data }) {
  const svgRef = React.useRef();

  React.useEffect(() => {
    if (!data || !data.properties || !data.properties.statistics) return;

    const statistics = data.properties.statistics;
    
    // Extract datetime and mean values
    const chartData = Object.entries(statistics).map(([datetime, stats]) => {
      // Parse the datetime string properly
      const date = new Date(datetime);
      return {
        datetime: date,
        dateStr: datetime,
        mean: stats.mean
      };
    }).sort((a, b) => a.datetime - b.datetime);

    if (chartData.length === 0) return;
    
    console.log('Chart data:', chartData);

    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove();

    // Set up dimensions
    const margin = { top: 20, right: 30, bottom: 70, left: 70 };
    const width = 800 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales
    const xScale = d3.scaleBand()
      .domain(chartData.map((d, i) => i))
      .range([0, width])
      .padding(0.1);

    const minValue = d3.min(chartData, d => d.mean);
    const maxValue = d3.max(chartData, d => d.mean);
    const range = maxValue - minValue;
    
    // Better y-axis scaling for small values
    const padding = range > 0 ? range * 0.1 : maxValue * 0.1;
    const yScale = d3.scaleLinear()
      .domain([
        Math.max(0, minValue - padding),
        maxValue + padding
      ])
      .range([height, 0])
      .nice();

    // Create line generator
    const line = d3.line()
      .x((d, i) => xScale(i) + xScale.bandwidth() / 2)
      .y(d => yScale(d.mean));

    // Add X axis with date formatting
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale)
        .tickFormat(i => {
          const date = chartData[i].datetime;
          return d3.timeFormat('%Y-%m-%d')(date);
        }))
      .selectAll('text')
      .style('text-anchor', 'end')
      .style('font-size', '11px')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)');

    // Add Y axis with better formatting for small numbers
    svg.append('g')
      .call(d3.axisLeft(yScale)
        .ticks(8)
        .tickFormat(d => d.toFixed(3)))
      .selectAll('text')
      .style('font-size', '11px');

    // Add Y axis label
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (height / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('fill', '#2d3748')
      .style('font-size', '12px')
      .text('Mean Value');

    // Add the line
    svg.append('path')
      .datum(chartData)
      .attr('fill', 'none')
      .attr('stroke', '#3182ce')
      .attr('stroke-width', 2)
      .attr('d', line);

    // Add dots
    svg.selectAll('dot')
      .data(chartData)
      .enter()
      .append('circle')
      .attr('cx', (d, i) => xScale(i) + xScale.bandwidth() / 2)
      .attr('cy', d => yScale(d.mean))
      .attr('r', 4)
      .attr('fill', '#3182ce');

  }, [data]);

  return (
    <div className="chart-container">
      <svg ref={svgRef}></svg>
    </div>
  );
}

function StatisticsPreview({ params }) {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        
        // Build URL with query parameters
        const queryParams = new URLSearchParams({
          concept_id: params.concept_id,
          datetime: params.datetime,
          temporal_mode: 'interval',
          variable: params.variable,
          backend: 'xarray'
        });
        
        const url = `https://staging.openveda.cloud/api/titiler-cmr/timeseries/statistics?${queryParams.toString()}`;
        
        // Create GeoJSON polygon from bbox
        const geoJson = {
          type: "Feature",
          bbox: params.bbox,
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [params.bbox[0], params.bbox[1]], // minx, miny
                [params.bbox[0], params.bbox[3]], // minx, maxy
                [params.bbox[2], params.bbox[3]], // maxx, maxy
                [params.bbox[2], params.bbox[1]], // maxx, miny
                [params.bbox[0], params.bbox[1]]  // close the ring
              ]
            ]
          }
        };
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(geoJson)
        });

        if (!response.ok) {
          throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (params) {
      fetchStatistics();
    }
  }, [params]);

  if (loading) {
    return (
      <div className="preview-container">
        <div className="preview-loading">Loading statistics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="preview-container">
        <div className="preview-error" style={{ display: 'block' }}>
          Error loading statistics: {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <>
      <div className="preview-container stats-preview">
        <pre className="stats-json">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
      <div className="chart-section">
        <p className="chart-label">Mean Values Over Time:</p>
        <TimeSeriesChart data={data} />
      </div>
    </>
  );
}

function ServiceCard({ service }) {
  const [showPostBody, setShowPostBody] = React.useState(false);
  
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
              
              {endpoint.showPreview && (
                <div className="preview-section">
                  <p className="preview-label">Preview:</p>
                  {endpoint.isPostRequest && endpoint.postParams ? (
                    <>
                      <div className="post-params-box">
                        <p className="post-params-label">Query Parameters:</p>
                        <pre className="post-params-json">
                          {`concept_id=${endpoint.postParams.concept_id}
datetime=${endpoint.postParams.datetime}
temporal_mode=interval
variable=${endpoint.postParams.variable}
backend=xarray`}
                        </pre>
                      </div>
                      <div className="post-params-box collapsible">
                        <button 
                          className="collapse-button"
                          onClick={() => setShowPostBody(!showPostBody)}
                        >
                          <span className="toggle-icon">{showPostBody ? '▼' : '▶'}</span>
                          <span className="post-params-label">POST Body (GeoJSON)</span>
                        </button>
                        {showPostBody && (
                          <pre className="post-params-json">
                            {JSON.stringify({
                              type: "Feature",
                              bbox: endpoint.postParams.bbox,
                              properties: {},
                              geometry: {
                                type: "Polygon",
                                coordinates: [[
                                  [endpoint.postParams.bbox[0], endpoint.postParams.bbox[1]],
                                  [endpoint.postParams.bbox[0], endpoint.postParams.bbox[3]],
                                  [endpoint.postParams.bbox[2], endpoint.postParams.bbox[3]],
                                  [endpoint.postParams.bbox[2], endpoint.postParams.bbox[1]],
                                  [endpoint.postParams.bbox[0], endpoint.postParams.bbox[1]]
                                ]]
                              }
                            }, null, 2)}
                          </pre>
                        )}
                      </div>
                      <div className="stats-response-section">
                        <p className="stats-response-label">API Response:</p>
                        <StatisticsPreview params={endpoint.postParams} />
                      </div>
                    </>
                  ) : endpoint.previewUrl ? (
                    <div className="preview-container">
                      <img 
                        src={endpoint.previewUrl} 
                        alt="Time series visualization preview"
                        className="preview-image"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'block';
                        }}
                      />
                      <div className="preview-error" style={{ display: 'none' }}>
                        Preview unavailable. The GIF will be generated when you access the URL above.
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
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
        // Build test URL with actual metadata
        let timeSeriesTestUrl = `https://staging.openveda.cloud/api/titiler-cmr/timeseries/bbox/{minx},{miny},{maxx},{maxy}.gif?concept_id=${validationResult.conceptId}`;
        let datetimeRange = null;
        let variable = null;
        let bboxArray = null;
        
        if (validationResult.validationDetails) {
          const details = validationResult.validationDetails;
          
          // Extract bounding box from coordinates.lat and coordinates.lon
          let bbox = null;
          if (details.coordinates && details.coordinates.lat && details.coordinates.lon) {
            const latMin = details.coordinates.lat.min;
            const latMax = details.coordinates.lat.max;
            const lonMin = details.coordinates.lon.min;
            const lonMax = details.coordinates.lon.max;
            
            if (latMin !== undefined && latMax !== undefined && lonMin !== undefined && lonMax !== undefined) {
              bbox = `${lonMin},${latMin},${lonMax},${latMax}`;
              bboxArray = [lonMin, latMin, lonMax, latMax];
            }
          }
          
          // Extract datetime from datetime[0].RangeDateTimes[0].BeginningDateTime
          if (details.datetime && Array.isArray(details.datetime) && details.datetime.length > 0) {
            const dateTimeEntry = details.datetime[0];
            if (dateTimeEntry.RangeDateTimes && Array.isArray(dateTimeEntry.RangeDateTimes) && dateTimeEntry.RangeDateTimes.length > 0) {
              const beginningDateTime = dateTimeEntry.RangeDateTimes[0].BeginningDateTime;
              if (beginningDateTime) {
                const startDate = new Date(beginningDateTime);
                const endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + 10);
                datetimeRange = `${startDate.toISOString().split('.')[0]}Z/${endDate.toISOString().split('.')[0]}Z`;
              }
            }
          }
          
          // Extract first variable from variables object
          if (details.variables && typeof details.variables === 'object') {
            const variableKeys = Object.keys(details.variables);
            if (variableKeys.length > 0) {
              variable = variableKeys[0];
            }
          }
          
          // Build complete test URL
          if (bbox && datetimeRange && variable) {
            timeSeriesTestUrl = `https://staging.openveda.cloud/api/titiler-cmr/timeseries/bbox/${bbox}.gif?concept_id=${validationResult.conceptId}&datetime=${datetimeRange}&variable=${variable}&backend=xarray&colormap_name=viridis&rescale=0,1`;
          }
        }
        
        endpoints.push({
          name: 'time-series-visualization',
          title: 'Time Series Visualization',
          description: 'Visualize time series data for a bounding box',
          base: 'https://staging.openveda.cloud/api/titiler-cmr/',
          pattern: 'timeseries/bbox/{minx},{miny},{maxx},{maxy}.gif?concept_id={concept_id}&datetime={start}/{end}&variable={variable}&backend=xarray&colormap_name=viridis&rescale=0,1',
          exampleUrl: timeSeriesTestUrl,
          showPreview: true,
          previewUrl: timeSeriesTestUrl.includes('.gif?') ? timeSeriesTestUrl : null
        });

        // Build time series statistics URL with actual metadata
        let statsParams = null;
        if (datetimeRange && variable && bboxArray) {
          statsParams = {
            concept_id: validationResult.conceptId,
            datetime: datetimeRange,
            variable: variable,
            bbox: bboxArray
          };
        }

        endpoints.push({
          name: 'time-series-statistics',
          title: 'Time Series Statistics',
          description: 'Generate statistics over time for multiple dates',
          base: 'https://staging.openveda.cloud/api/titiler-cmr/',
          pattern: 'timeseries/statistics (POST)',
          exampleUrl: `POST to: https://staging.openveda.cloud/api/titiler-cmr/timeseries/statistics`,
          showPreview: true,
          isPostRequest: true,
          postParams: statsParams
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

