import React from 'react';
import { FaFlask } from 'react-icons/fa';
import TreeNodeBase from './TreeNodeBase';

function TestNode(props) {
  return <TreeNodeBase {...props} data={{ ...props.data, icon: <FaFlask /> }} />;
}

export default TestNode;
