import React from 'react';

function OverflowNode({ data }) {
  return (
    <div
      className={`tree-node tree-node-overflow ${data.isDimmed ? 'dimmed' : ''}`}
      onClick={(event) => {
        event.stopPropagation();
        data.onOpenOverflow?.(data);
      }}
    >
      <div className="tree-node-overflow-pill">{data.title}</div>
    </div>
  );
}

export default OverflowNode;
