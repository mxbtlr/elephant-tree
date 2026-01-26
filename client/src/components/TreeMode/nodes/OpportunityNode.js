import React from 'react';
import { FaLightbulb } from 'react-icons/fa';
import TreeNodeBase from './TreeNodeBase';

function OpportunityNode(props) {
  return <TreeNodeBase {...props} data={{ ...props.data, icon: <FaLightbulb /> }} />;
}

export default OpportunityNode;
