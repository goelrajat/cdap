/*
 * Copyright © 2019 Cask Data, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
*/

import React from 'react';
import FllHeader from 'components/FieldLevelLineage/v2/FllHeader';
import FllTable from 'components/FieldLevelLineage/v2/FllTable';
import withStyles from '@material-ui/core/styles/withStyles';
import { Consumer } from 'components/FieldLevelLineage/v2/Context/FllContext';
import * as d3 from 'd3';
import debounce from 'lodash/debounce';
import { grey, orange, yellow } from 'components/ThemeWrapper/colors';

const styles = (theme) => {
  return {
    root: {
      paddingLeft: '100px',
      paddingRight: '100px',
      display: 'flex',
      justifyContent: 'space-between',
    },
    container: {
      position: 'absolute' as 'absolute',
      height: '100%',
      width: '100%',
      pointerEvents: 'none',
    },
  };
};

class LineageSummary extends React.Component<{ classes }> {
  private activeLinks;

  // TO DO: Get colors from theme once we've created a separate theme colors file
  private drawLineFromLink({ source, destination }, isSelected = false) {
    // get source and destination elements and their coordinates
    const sourceEl = d3.select(`#${source}`);
    const destEl = d3.select(`#${destination}`);

    const offsetX = -100; // From the padding on the LineageSummary
    const offsetY = -50; // From the FllHeader

    const sourceXY = sourceEl.node().getBoundingClientRect();
    const destXY = destEl.node().getBoundingClientRect();

    const sourceX1 = sourceXY.right + offsetX;
    const sourceY1 = sourceXY.top + offsetY + 0.5 * sourceXY.height;
    const sourceX2 = destXY.left + offsetX;
    const sourceY2 = destXY.top + offsetY + 0.5 * sourceXY.height;

    // draw an edge from line start to line end
    const linkContainer = d3.select(`#${source}_${destination}`);

    const third = (sourceX2 - sourceX1) / 3;

    // Draw a line with a bit of curve between the straight parts
    const lineGenerator = d3.line().curve(d3.curveMonotoneX);

    const points = [
      [sourceX1, sourceY1],
      [sourceX1 + third, sourceY1],
      [sourceX2 - third, sourceY2],
      [sourceX2, sourceY2],
    ];

    const edgeColor = isSelected ? orange[50] : grey[300];

    linkContainer
      .append('path')
      .style('stroke', edgeColor)
      .style('stroke-width', '1')
      .style('fill', 'none')
      .attr('d', lineGenerator(points));

    // draw left anchor
    const anchorHeight = 8;
    const anchorRx = 1.8;
    linkContainer
      .append('rect')
      .attr('x', sourceX1 - anchorHeight * 0.5)
      .attr('y', sourceY1 - anchorHeight * 0.5)
      .attr('width', anchorHeight)
      .attr('height', anchorHeight)
      .attr('rx', anchorRx)
      .attr('pointer-events', 'fill') // To make rect clickable
      .style('fill', edgeColor);

    // draw right anchor
    linkContainer
      .append('rect')
      .attr('x', sourceX2 - anchorHeight * 0.5)
      .attr('y', sourceY2 - anchorHeight * 0.5)
      .attr('width', anchorHeight)
      .attr('height', anchorHeight)
      .attr('rx', anchorRx)
      .attr('pointer-events', 'fill') // To make rect clickable
      .style('fill', edgeColor);
  }

  private drawLinks(activeFieldId = null) {
    // clear any existing links and anchors
    d3.select('#links-container')
      .selectAll('path,rect')
      .remove();

    this.activeLinks.forEach((link) => {
      const isSelected = link.source === activeFieldId || link.destination === activeFieldId;
      this.drawLineFromLink(link, isSelected);
    });
  }

  private handleFieldClick(e) {
    const fieldId = (e.target as HTMLAreaElement).id;
    d3.selectAll('.grid-row').style('background-color', 'white');

    d3.select(`#${fieldId}`).style('background-color', yellow[200]); // change background
    // highlight active fields
    this.drawLinks(fieldId);
  }

  public componentWillUnmount() {
    window.removeEventListener('resize', debounce(this.drawLinks.bind(this), 1));
  }

  public componentDidMount() {
    this.drawLinks();
    window.addEventListener('resize', debounce(this.drawLinks.bind(this), 1));
  }
  public render() {
    return (
      <Consumer>
        {({
          causeSets,
          target,
          targetFields,
          impactSets,
          firstCause,
          firstImpact,
          firstField,
          links,
        }) => {
          this.activeLinks = links;
          return (
            <div className={this.props.classes.root} id="fll-container">
              <svg id="links-container" className={this.props.classes.container}>
                <g>
                  {links.map((link) => {
                    const id = `${link.source}_${link.destination}`;
                    return <svg id={id} key={id} className="fll-link" />;
                  })}
                </g>
              </svg>
              <div>
                <FllHeader type="cause" first={firstCause} total={Object.keys(causeSets).length} />
                {Object.keys(causeSets).map((key) => {
                  return (
                    <FllTable
                      clickFieldHandler={this.handleFieldClick.bind(this)}
                      key={key}
                      tableId={key}
                      fields={causeSets[key]}
                    />
                  );
                })}
              </div>
              <div>
                <FllHeader
                  type="target"
                  first={firstField}
                  total={Object.keys(targetFields).length}
                />
                <FllTable
                  clickFieldHandler={this.handleFieldClick.bind(this)}
                  isTarget={true}
                  tableId={target}
                  fields={targetFields}
                />
              </div>
              <div>
                <FllHeader
                  type="impact"
                  first={firstImpact}
                  total={Object.keys(impactSets).length}
                />
                {Object.keys(impactSets).map((key) => {
                  return (
                    <FllTable
                      clickFieldHandler={this.handleFieldClick.bind(this)}
                      key={key}
                      tableId={key}
                      fields={impactSets[key]}
                    />
                  );
                })}
              </div>
            </div>
          );
        }}
      </Consumer>
    );
  }
}

const StyledLineageSummary = withStyles(styles)(LineageSummary);

export default StyledLineageSummary;
