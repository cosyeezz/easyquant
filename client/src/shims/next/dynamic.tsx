import React from 'react';

const dynamic = (loader, options) => {
  const Component = React.lazy(loader);
  return (props) => (
    <React.Suspense fallback={options?.loading?.() || null}>
      <Component {...props} />
    </React.Suspense>
  );
};

export default dynamic;
