import React from 'react';
import { useParams } from 'react-router-dom';

const OpportunityDetail: React.FC = () => {
  const { id } = useParams();
  return <div className="p-6">Opportunity Detail: {id}</div>;
};

export default OpportunityDetail;
