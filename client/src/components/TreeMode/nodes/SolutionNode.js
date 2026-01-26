import React from 'react';
import { FaWrench } from 'react-icons/fa';
import TreeNodeBase from './TreeNodeBase';

function SolutionNode(props) {
  return <TreeNodeBase {...props} data={{ ...props.data, icon: <FaWrench /> }} />;
}

export default SolutionNode;
