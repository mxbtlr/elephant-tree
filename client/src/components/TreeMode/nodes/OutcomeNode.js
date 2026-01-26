import React from 'react';
import { FaBullseye } from 'react-icons/fa';
import TreeNodeBase from './TreeNodeBase';

function OutcomeNode(props) {
  return <TreeNodeBase {...props} data={{ ...props.data, icon: <FaBullseye /> }} />;
}

export default OutcomeNode;
