import React from 'react';
import { Result } from 'antd';

const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
  <Result
    status="info"
    title={title}
    subTitle="This page will be implemented in Phase 2."
  />
);

export default PlaceholderPage;
