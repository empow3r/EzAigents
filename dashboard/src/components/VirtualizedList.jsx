import React, { memo } from 'react';
import { FixedSizeList as List } from 'react-window';

// Virtualized list component for large datasets
const VirtualizedList = memo(({ 
  items, 
  height = 400, 
  itemHeight = 50, 
  renderItem,
  className = '' 
}) => {
  const Row = memo(({ index, style }) => (
    <div style={style}>
      {renderItem(items[index], index)}
    </div>
  ));

  Row.displayName = 'VirtualRow';

  return (
    <List
      className={className}
      height={height}
      itemCount={items.length}
      itemSize={itemHeight}
      width="100%"
    >
      {Row}
    </List>
  );
});

VirtualizedList.displayName = 'VirtualizedList';

// Virtualized table component
export const VirtualizedTable = memo(({ 
  columns, 
  data, 
  height = 600,
  rowHeight = 50,
  className = ''
}) => {
  const Row = memo(({ index, style }) => {
    const item = data[index];
    
    return (
      <div style={style} className="flex border-b border-gray-200">
        {columns.map((col, colIndex) => (
          <div 
            key={colIndex} 
            className="px-4 py-2 flex items-center"
            style={{ width: col.width || 'auto', flex: col.flex || '1' }}
          >
            {col.render ? col.render(item[col.key], item) : item[col.key]}
          </div>
        ))}
      </div>
    );
  });

  Row.displayName = 'TableRow';

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex border-b-2 border-gray-300 bg-gray-50 font-semibold">
        {columns.map((col, index) => (
          <div 
            key={index} 
            className="px-4 py-2"
            style={{ width: col.width || 'auto', flex: col.flex || '1' }}
          >
            {col.header}
          </div>
        ))}
      </div>
      
      {/* Body */}
      <List
        height={height}
        itemCount={data.length}
        itemSize={rowHeight}
        width="100%"
      >
        {Row}
      </List>
    </div>
  );
});

VirtualizedTable.displayName = 'VirtualizedTable';

export default VirtualizedList;